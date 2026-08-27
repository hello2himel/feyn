// ============================================================
// lib/supabaseServer.js — server-only Supabase clients
//
// Two distinct clients, deliberately separate:
//
//   getPublicServerClient()   anon key, RLS ON.
//     For getStaticProps / ISR. Reads exactly what an anonymous
//     visitor can read, so a draft course can never leak into a
//     statically cached page.
//
//   getServiceClient()        service-role key, RLS BYPASSED.
//     For API routes that must act beyond the caller's own rights
//     (admin queues, invite lookups by email). Never import this
//     into anything that ends up in the browser bundle.
//
// Both return null when the corresponding env vars are missing, so
// `npm run build` still succeeds on a fresh clone with no Supabase
// project yet. Callers must handle null — see data/courseHelpers.js.
//
// NOTE: the guard triggers in docs/schema.sql Part 6b are NOT
// bypassed by the service role. To write a privilege-bearing column
// directly, opt in per transaction:
//     await sb.rpc('set_privileged')   -- if you add such a wrapper
//   or run the write inside a security-definer RPC instead.
// ============================================================

import { createClient } from '@supabase/supabase-js'

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const ANON =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY

const NO_PERSIST = {
  auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
}

let _public = null
let _service = null

export function isServerSupabaseConfigured() {
  return !!(URL && ANON)
}

export function isServiceRoleConfigured() {
  return !!(URL && SERVICE)
}

/** Anon-key client. RLS applies. Safe for build-time content reads. */
export function getPublicServerClient() {
  if (_public) return _public
  if (!URL || !ANON) return null
  _public = createClient(URL, ANON, NO_PERSIST)
  return _public
}

/** Service-role client. Bypasses RLS. Server-side only. */
export function getServiceClient() {
  if (_service) return _service
  if (!URL || !SERVICE) return null
  _service = createClient(URL, SERVICE, NO_PERSIST)
  return _service
}

/**
 * Client scoped to a caller's access token: RLS and auth.uid() behave
 * exactly as they would in the browser, but the call runs server-side.
 * This is the right client for API routes that wrap an RPC — the RPC's
 * own auth.uid() checks then still apply.
 */
export function getUserClient(accessToken) {
  if (!URL || !ANON || !accessToken) return null
  return createClient(URL, ANON, {
    ...NO_PERSIST,
    global: { headers: { Authorization: `Bearer ${accessToken}` } },
  })
}

/** Extracts the bearer token from an API-route request, or null. */
export function bearerFrom(req) {
  const h = req?.headers?.authorization || req?.headers?.Authorization || ''
  const m = /^Bearer\s+(.+)$/i.exec(String(h).trim())
  return m ? m[1] : null
}

/**
 * Resolves the calling user from a request's bearer token.
 * Returns { user, sb } where sb is a token-scoped client, or nulls.
 */
export async function getRequestUser(req) {
  const token = bearerFrom(req)
  if (!token) return { user: null, sb: null, token: null }
  const sb = getUserClient(token)
  if (!sb) return { user: null, sb: null, token }
  const { data, error } = await sb.auth.getUser(token)
  if (error || !data?.user) return { user: null, sb: null, token }
  return { user: data.user, sb, token }
}
