// ============================================================
// lib/supabase.js — Supabase client singleton  (v32)
//
// THE PROBLEM (history of failed fixes):
//
//   v29: Patched _client.fetch + _client.rest.fetch after createClient().
//        DIDN'T WORK: PostgrestClient captures its fetch reference at
//        construction time. Post-hoc property assignment is inert.
//
//   v30: Passed custom fetch via global.fetch inside createClient().
//        PARTIALLY WORKED: The fetch IS used by PostgrestClient now.
//        But _currentToken was still null when INITIAL_SESSION queries
//        fired, because:
//          · supabase.js registers onAuthStateChange → sets _currentToken
//          · userStore.js registers onAuthStateChange → calls _pullFromSupabase
//          · Both listeners are registered on the same event. The one in
//            userStore fires BEFORE the one in supabase.js sets _currentToken.
//          · _pullFromSupabase queries fire with _currentToken = null.
//          · _authFetch falls back to the publishable key → 403.
//
//   v31: Exported setCurrentToken() so userStore's onAuthStateChange can
//        set _currentToken immediately from the session it already has,
//        before making any DB calls. Fixed the 403-on-first-load race.
//
//        BUT introduced a worse bug: `global.fetch` in createClient()'s
//        options isn't just PostgREST's fetch — supabase-js hands the
//        exact same fetch to the internal GoTrue (auth) client too. So
//        _authFetch was *also* intercepting every /auth/v1/... call —
//        login, signOut, getUser, and critically the silent background
//        token refresh — and forcibly overwriting their Authorization
//        header with the (soon to be stale) access token, even on
//        requests GoTrue never wanted a user Authorization header on
//        in the first place (the refresh-token grant, in particular).
//        Supabase's gateway can reject that outright, so autoRefreshToken
//        silently failed. The session sitting in localStorage never got
//        renewed, worked until the access token's ~1hr TTL passed (often
//        surfacing as "the first visit is fine, later navigation isn't"),
//        and a plain reload didn't help — it just restored the same
//        un-refreshable session from localStorage and failed the same
//        way. Only clearing site data removed the stuck session and
//        forced a clean login.
//
// THE FIX (v32):
//   _authFetch now only overrides Authorization for non-auth requests
//   (PostgREST/Storage/Realtime). Calls to /auth/v1/* pass through with
//   whatever headers GoTrue itself set, so login, signOut, getUser, and
//   — the one that actually matters here — token refresh all work the
//   way Supabase intended.
// ============================================================

import { createClient } from '@supabase/supabase-js'

let _client       = null
let _currentToken = null   // live access_token, or null
let _seedPromise  = null   // resolves once initial getSession() completes
const SESSION_SEED_TIMEOUT_MS = 8000

// ── Token setters — called by userStore before DB operations ──────────
export function setCurrentToken(token) { _currentToken = token ?? null }
export function getCurrentToken()      { return _currentToken }

export function getSupabase() {
  if (_client) return _client

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
           || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!url || !key) return null

  // /auth/v1/* requests go through this same fetch (see the v31→v32
  // note above) — GoTrue sets its own Authorization header on those
  // (or deliberately leaves it off, e.g. for token refresh), and that
  // must survive untouched. Only PostgREST/Storage/Realtime calls need
  // the token forced, which is the whole reason _authFetch exists.
  const authUrl = new URL(url)
  const isAuthRequest = (input) => {
    try {
      const u = new URL(typeof input === 'string' ? input : input?.url ?? '', authUrl)
      return u.host === authUrl.host && u.pathname.startsWith('/auth/v1/')
    } catch {
      return false
    }
  }

  // _authFetch is passed via global.fetch so it's captured by PostgrestClient
  // at construction time (not patched after the fact).
  // Reads _currentToken synchronously — whoever sets it last wins.
  const _authFetch = async (input, init = {}) => {
    const headers = new Headers(init.headers ?? {})
    if (!headers.has('apikey')) headers.set('apikey', key)
    if (!isAuthRequest(input)) {
      // Always override Authorization with our token, even if gotrue already set one.
      const token = _currentToken ?? key
      headers.set('Authorization', `Bearer ${token}`)
    }
    return fetch(input, { ...init, headers })
  }

  _client = createClient(url, key, {
    auth: {
      persistSession:     true,
      autoRefreshToken:   true,
      detectSessionInUrl: true,
      storageKey:         'feyn-auth',
    },
    global: {
      fetch: _authFetch,  // captured at construction time ✓
    },
  })

  // Keep _currentToken in sync with session lifecycle.
  _client.auth.onAuthStateChange((_event, session) => {
    _currentToken = session?.access_token ?? null
  })

  // Seed on first load. getSupabaseReady() awaits this.
  _seedPromise = _client.auth.getSession().then(({ data }) => {
    if (data?.session?.access_token) {
      _currentToken = data.session.access_token
    }
  })

  return _client
}

// ── getSupabaseReady ──────────────────────────────────────────────────
// Await before DB writes that depend on the session being seeded.
// Returns null (and clears stale profile) if no live session.
export async function getSupabaseReady() {
  const sb = getSupabase()
  if (!sb) return null

  if (_seedPromise) {
    try {
      await Promise.race([
        _seedPromise,
        new Promise((_, reject) => setTimeout(() => reject(new Error('session seed timeout')), SESSION_SEED_TIMEOUT_MS)),
      ])
    } catch (e) {
      console.warn('[Feyn] getSupabaseReady: session seed failed or timed out:', e?.message)
      _seedPromise = null
      return null
    }
    _seedPromise = null
  }

  if (!_currentToken) {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('ff_profile')
    }
    return null
  }

  return sb
}

export function isSupabaseAvailable() {
  return !!(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
    (process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
  )
}

export function clearStaleGlobalState() {
  if (typeof window === 'undefined') return
  localStorage.removeItem('ff_account_type')
  localStorage.removeItem('ff_profile')
}
