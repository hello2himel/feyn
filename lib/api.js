// ============================================================
// lib/api.js — browser → API-route helpers
//
// Every mutation goes through /api/rpc/[fn], which requires a bearer
// token. That token comes from lib/supabase.js's live session, so
// these helpers are the only place the app reads it for HTTP calls.
// ============================================================

import { getSupabase, getSupabaseReady, getCurrentToken } from './supabase'

async function authHeaders() {
  await getSupabaseReady()
  const token = getCurrentToken()
  if (!token) throw new Error('Sign in to do that.')
  return { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }
}

/** Calls an allowlisted RPC through /api/rpc/[fn]. Throws on refusal. */
export async function callRpc(fn, args = {}) {
  const headers = await authHeaders()
  const res = await fetch(`/api/rpc/${fn}`, {
    method: 'POST',
    headers,
    body: JSON.stringify(args),
  })
  const json = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(json.error || `Request failed (${res.status})`)
  return json.data
}

/** Debounce-friendly handle availability probe. */
export async function checkHandle(candidate, namespace) {
  const res = await fetch(
    `/api/handles/check?candidate=${encodeURIComponent(candidate)}&namespace=${namespace}`
  )
  return res.json()
}

/** Published program → subject catalogue, for client-side surfaces. */
export async function fetchCatalog() {
  const res = await fetch('/api/catalog')
  const json = await res.json().catch(() => ({ programs: [] }))
  return json.programs || []
}

/**
 * Direct-query escape hatch for authed dashboards. RLS decides what
 * comes back, so this is safe to call from the browser — but it
 * returns null when there is no session, and callers must handle that.
 */
export async function authedClient() {
  const sb = await getSupabaseReady()
  return sb || null
}

export function browserClient() {
  return getSupabase()
}
