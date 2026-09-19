// ============================================================
// pages/api/library/file/[resourceId].js — signed-URL gateway
//
// The library-resources Storage bucket is private and has no SELECT
// policy at all (docs/schema.sql Part 6c) — this route is the only
// way any file in it is ever read, by anyone, including the uploader.
//
//   GET /api/library/file/{resourceId}          → 302 to a signed URL, inline
//   GET /api/library/file/{resourceId}?download=1 → same, forced download
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
// Service-role client only signs the URL; it never bypasses the
// visibility check above, which runs first.
// ============================================================

import { getServiceClient, getRequestUser } from '../../../../lib/supabaseServer'

const SIGNED_URL_TTL_SECONDS = 60

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
    .select('id, publisher_id, status, kind, storage_path, external_url, title, publishers ( status )')
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
