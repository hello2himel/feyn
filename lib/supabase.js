// ============================================================
// lib/supabase.js — Supabase client singleton
//
// KEY DESIGN:
//   _currentToken is kept in sync with the live session and injected
//   into every fetch via _authFetch, which is passed as global.fetch
//   at createClient() time so PostgrestClient captures it at
//   construction (post-hoc patching doesn't work).
//
//   setCurrentToken() is exported so userStore / _app can set it
//   immediately from the session they already have — before making
//   any DB calls — avoiding the listener ordering race where
//   _authFetch fires with _currentToken = null → 403.
// ============================================================

import { createClient } from '@supabase/supabase-js'

let _client       = null
let _currentToken = null
let _seedPromise  = null

export function setCurrentToken(token) { _currentToken = token ?? null }
export function getCurrentToken()      { return _currentToken }

export function getSupabase() {
  if (_client) return _client

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
           || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!url || !key) return null

  // Passed via global.fetch so PostgrestClient captures it at construction.
  const _authFetch = async (input, init = {}) => {
    const token = _currentToken ?? key
    const headers = new Headers(init.headers ?? {})
    if (!headers.has('apikey')) headers.set('apikey', key)
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
    global: { fetch: _authFetch },
  })

  _client.auth.onAuthStateChange((_event, session) => {
    _currentToken = session?.access_token ?? null
  })

  _seedPromise = _client.auth.getSession().then(({ data }) => {
    if (data?.session?.access_token) {
      _currentToken = data.session.access_token
    }
  })

  return _client
}

// Await before DB operations that depend on the session being seeded.
// Returns null if no live session.
export async function getSupabaseReady() {
  const sb = getSupabase()
  if (!sb) return null
  if (_seedPromise) { await _seedPromise; _seedPromise = null }
  if (!_currentToken) {
    if (typeof window !== 'undefined') localStorage.removeItem('ff_profile')
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
