// ============================================================
// pages/api/handles/check.js — live availability for handle fields
//
// GET /api/handles/check?candidate=alice&namespace=mentor
//   → { valid, reason, available }
//
// Wraps validate_handle() + is_handle_available(). Both are public
// RPCs, but going through a route means the client gets the *same*
// error string the server would raise, and lib/handles.js drift shows
// up immediately instead of at submit time.
//
// Boolean-only by design (spec §8.3) — never leaks who owns a handle.
// ============================================================

import { getPublicServerClient, isServerSupabaseConfigured } from '../../../lib/supabaseServer'
import { validateHandle } from '../../../lib/handles'

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET')
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const candidate = String(req.query.candidate || '')
  const namespace = String(req.query.namespace || '')

  if (!['mentor', 'publisher'].includes(namespace)) {
    return res.status(400).json({ error: "namespace must be 'mentor' or 'publisher'" })
  }

  const localReason = validateHandle(candidate)
  if (localReason) {
    return res.status(200).json({ valid: false, reason: localReason, available: false })
  }

  if (!isServerSupabaseConfigured()) {
    return res.status(200).json({ valid: true, reason: null, available: null })
  }

  const sb = getPublicServerClient()
  const { data, error } = await sb.rpc('is_handle_available', { candidate, namespace })
  if (error) return res.status(500).json({ error: error.message })

  return res.status(200).json({
    valid: true,
    reason: data ? null : 'That handle is already taken.',
    available: data === true,
  })
}
