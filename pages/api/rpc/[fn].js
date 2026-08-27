// ============================================================
// pages/api/rpc/[fn].js — authenticated RPC gateway
//
// POST /api/rpc/apply_as_mentor   { display_name, username, ... }
//   Authorization: Bearer <supabase access token>
//
// WHY THIS EXISTS
// The client could call these RPCs directly — they are all
// `authenticated`-only and every one re-checks auth.uid() internally.
// This route adds three things a direct call cannot:
//
//   1. An allowlist. Only the RPCs named below are reachable, so
//      adding a helper function to the schema never accidentally
//      publishes a new endpoint.
//   2. Server-side argument shaping, so a typo'd argument name fails
//      here with a readable message instead of as a Postgres error.
//   3. One place where refusal messages are normalized for the UI.
//
// SECURITY: this route runs with the *caller's* token, never the
// service role. RLS and every internal auth.uid() check still apply —
// it is a gateway, not a bypass. Requests without a valid bearer
// token are rejected before reaching Postgres.
// ============================================================

import { getRequestUser } from '../../../lib/supabaseServer'

// name → expected argument keys. Order is irrelevant; supabase-js
// sends them as named parameters.
const ALLOWED = {
  apply_as_mentor: ['p_display_name', 'p_username', 'p_bio', 'p_credentials', 'p_socials'],
  register_publisher: ['p_name', 'p_slug', 'p_description', 'p_brand_color'],
  request_publisher_join: ['p_publisher_id'],
  invite_publisher_member: ['p_publisher_id', 'p_email', 'p_role'],
  respond_to_invitation: ['p_membership_id', 'p_accept'],
  review_join_request: ['p_membership_id', 'p_approve'],
  set_membership_role: ['p_membership_id', 'p_role'],
  leave_publisher: ['p_publisher_id'],
  remove_publisher_member: ['p_membership_id'],
  change_mentor_username: ['p_new'],
  change_publisher_slug: ['p_publisher_id', 'p_new'],
  // App-admin only; the RPC itself enforces that.
  review_mentor_application: ['p_mentor_id', 'p_approve', 'p_note'],
  review_publisher_registration: ['p_publisher_id', 'p_approve', 'p_note'],
  grant_app_admin: ['target_email'],
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const fn = String(req.query.fn || '')
  const allowedArgs = ALLOWED[fn]
  if (!allowedArgs) {
    return res.status(404).json({ error: `Unknown or non-exposed RPC: ${fn}` })
  }

  const { user, sb } = await getRequestUser(req)
  if (!user || !sb) {
    return res.status(401).json({ error: 'Sign in to do that.' })
  }

  const body = typeof req.body === 'object' && req.body ? req.body : {}
  const unknown = Object.keys(body).filter(k => !allowedArgs.includes(k))
  if (unknown.length) {
    return res.status(400).json({ error: `Unexpected argument(s): ${unknown.join(', ')}` })
  }

  const args = {}
  for (const k of allowedArgs) if (k in body) args[k] = body[k]

  const { data, error } = await sb.rpc(fn, args)
  if (error) {
    // Every Part 7 RPC raises plain-English exceptions on refusal, so
    // the message is safe and useful to show verbatim.
    return res.status(400).json({ error: error.message })
  }

  return res.status(200).json({ data })
}
