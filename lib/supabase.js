// ============================================================
// lib/supabase.js — Supabase client singleton  (v31)
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
// THE FIX (v31):
//   Export setCurrentToken() so userStore's onAuthStateChange can set
//   _currentToken immediately from the session it already has, before
//   making any DB calls. No ordering dependency on the other listener.
//
//   Also export getCurrentToken() so callers can verify token state.
// ============================================================

import { createClient } from '@supabase/supabase-js'

let _client       = null
let _currentToken = null   // live access_token, or null
let _seedPromise  = null   // resolves once initial getSession() completes

// ── Token setters — called by userStore before DB operations ──────────
export function setCurrentToken(token) { _currentToken = token ?? null }
export function getCurrentToken()      { return _currentToken }

export function getSupabase() {
  if (_client) return _client

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
           || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!url || !key) return null

  // _authFetch is passed via global.fetch so it's captured by PostgrestClient
  // at construction time (not patched after the fact).
  // Reads _currentToken synchronously — whoever sets it last wins.
  const _authFetch = async (input, init = {}) => {
    const token = _currentToken ?? key
    const headers = new Headers(init.headers ?? {})
    if (!headers.has('apikey')) headers.set('apikey', key)
    // Always override Authorization with our token, even if At() already set one.
    headers.set('Authorization', `Bearer ${token}`)
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
    await _seedPromise
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
