// ============================================================
// pages/api/library/file/[resourceId].js — signed-URL gateway
//
// The library-resources Storage bucket is private and has no SELECT
// policy at all (docs/schema.sql Part 6c) — this route is the only
// way any file in it is ever read, by anyone, including the uploader.
//
//   GET /api/library/file/{resourceId}          → pdf/image/doc: 302 to a signed URL, inline
//                                                 html: served directly (see below)
//   GET /api/library/file/{resourceId}?download=1 → 302 to a signed URL, forced download
//
// WHY HTML IS PROXIED, NOT REDIRECTED
//   Supabase Storage deliberately serves any text/html object as
//   text/plain (anti-phishing), no matter what Content-Type it was
//   uploaded with — so redirecting a browser to a signed URL shows
//   the page's *source*. For kind='html' this route therefore reads the
//   object server-side and serves the bytes itself as text/html.
//
//   Because that puts user-uploaded HTML on our own origin, the
//   response carries `Content-Security-Policy: sandbox …` WITHOUT
//   allow-same-origin: the page runs scripts, but in an opaque origin
//   that cannot read the app's cookies / localStorage / Supabase
//   session, and cannot call our APIs as the viewer. Do not add
//   allow-same-origin here — it would void the sandbox.
//
// VISIBILITY
//   published resource under an approved publisher → anyone
//   otherwise                                       → bearer token +
//     can_edit_library_resource_id() (the same security-definer
//     function the RLS policies use, called here with the caller's
//     own token so it evaluates auth.uid() exactly as it would inside
//     a query — see lib/supabaseServer.js#getUserClient).
//
// kind='link' resources have no file — redirect straight to
// external_url instead of touching Storage.
//
// Service-role client only signs/reads the file; it never bypasses the
// visibility check above, which runs first.
// ============================================================

import { getServiceClient, getRequestUser } from '../../../../lib/supabaseServer'

const SIGNED_URL_TTL_SECONDS = 60

// Serverless response bodies are capped (~6 MB on Netlify, 4.5 MB on
// Vercel). HTML above this falls back to the signed-URL redirect —
// it will show as source, but a hard function failure is worse.
const MAX_PROXIED_HTML_BYTES = 4 * 1024 * 1024

// Scripts, forms, modals, popups and downloads all work; same-origin
// access deliberately does not (see header comment).
const HTML_SANDBOX_CSP =
  'sandbox allow-scripts allow-forms allow-modals allow-popups allow-popups-to-escape-sandbox allow-downloads'

export const config = {
  api: { responseLimit: '5mb' },
}

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET')
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const resourceId = String(req.query.resourceId || '')
  if (!resourceId) return res.status(400).json({ error: 'Missing resource id' })

  const service = getServiceClient()
  if (!service) return res.status(503).json({ error: 'Storage is not configured on this server.' })

  const { data: resource, error } = await service
    .from('library_resources')
    .select('id, publisher_id, status, kind, storage_path, external_url, title, file_size_bytes, publishers ( status )')
    .eq('id', resourceId)
    .maybeSingle()
  if (error) return res.status(500).json({ error: error.message })
  if (!resource) return res.status(404).json({ error: 'Not found' })

  const isPublic = resource.status === 'published' && resource.publishers?.status === 'approved'

  if (!isPublic) {
    const { user, sb } = await getRequestUser(req)
    if (!user || !sb) return res.status(401).json({ error: 'Sign in to view this.' })
    const { data: canEdit, error: permErr } = await sb.rpc('can_edit_library_resource_id', { res_id: resourceId })
    if (permErr || !canEdit) return res.status(403).json({ error: 'You do not have access to this resource.' })
  }

  if (resource.kind === 'link') {
    if (!resource.external_url) return res.status(404).json({ error: 'Not found' })
    return res.redirect(302, resource.external_url)
  }

  if (!resource.storage_path) return res.status(404).json({ error: 'Not found' })

  const wantsDownload = req.query.download === '1'

  // HTML: serve it ourselves so the browser renders it as a page.
  if (resource.kind === 'html' && !wantsDownload && !(resource.file_size_bytes > MAX_PROXIED_HTML_BYTES)) {
    const { data: blob, error: dlErr } = await service.storage.from('library-resources').download(resource.storage_path)
    if (dlErr || !blob) {
      return res.status(500).json({ error: dlErr?.message || 'Could not read the file.' })
    }
    const body = Buffer.from(await blob.arrayBuffer())
    if (body.length <= MAX_PROXIED_HTML_BYTES) {
      res.setHeader('Content-Type', 'text/html; charset=utf-8')
      res.setHeader('Content-Security-Policy', HTML_SANDBOX_CSP)
      res.setHeader('X-Content-Type-Options', 'nosniff')
      res.setHeader('Referrer-Policy', 'no-referrer')
      res.setHeader('Cache-Control', 'private, no-store')
      return res.status(200).send(body)
    }
    // Oversized despite the row's recorded size — fall through to redirect.
  }

  const filename = wantsDownload ? resource.storage_path.split('/').pop() : undefined

  const { data: signed, error: signErr } = await service
    .storage
    .from('library-resources')
    .createSignedUrl(resource.storage_path, SIGNED_URL_TTL_SECONDS, wantsDownload ? { download: filename } : undefined)
  if (signErr || !signed?.signedUrl) {
    return res.status(500).json({ error: signErr?.message || 'Could not sign the file URL.' })
  }

  res.setHeader('Cache-Control', 'private, no-store')
  return res.redirect(302, signed.signedUrl)
}
