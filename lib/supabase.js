// ============================================================
// lib/supabase.js
// Supabase client, initialized from Netlify env vars.
// Returns null if env vars are not set (local-only mode).
//
// Netlify env vars to set:
//   NEXT_PUBLIC_SUPABASE_URL
//   NEXT_PUBLIC_SUPABASE_ANON_KEY
//
// These are safe to expose in the browser (anon key only).
// ============================================================

let _client = null

export function getSupabase() {
  if (typeof window === 'undefined') return null
  if (_client) return _client

  const url  = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key  = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!url || !key) return null  // not configured, local-only mode

  try {
    const { createClient } = require('@supabase/supabase-js')
    _client = createClient(url, key, {
      auth: {
        persistSession:     true,
        autoRefreshToken:   true,
        detectSessionInUrl: true,
      },
    })
    return _client
  } catch (_) {
    return null
  }
}

export function isSupabaseAvailable() {
  return !!(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
}
