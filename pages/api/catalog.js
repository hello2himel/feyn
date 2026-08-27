// ============================================================
// pages/api/catalog.js — public catalogue for client-side surfaces
//
// The search palette, the onboarding step in AuthFlow, /profile and
// /settings all need the program → subject list while running in the
// browser. They used to import data/index.js, which no longer exists.
//
// Served through an API route rather than a direct browser query so
// the shape mapping in data/courseHelpers.js stays in one place and
// the response can be edge-cached. Anon-key client, RLS on: only
// published courses and approved publishers come back.
// ============================================================

import { getPrograms } from '../../data/courseHelpers'
import { isServerSupabaseConfigured } from '../../lib/supabaseServer'

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET')
    return res.status(405).json({ error: 'Method not allowed' })
  }

  if (!isServerSupabaseConfigured()) {
    return res.status(200).json({ programs: [] })
  }

  try {
    const programs = await getPrograms()
    res.setHeader('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=300')
    return res.status(200).json({ programs })
  } catch (e) {
    return res.status(500).json({ error: e.message, programs: [] })
  }
}
