// ============================================================
// lib/supabase.js — Supabase client singleton
//
// Uses ES import (not require) to avoid silent init failures.
// Returns null if env vars missing (local-only mode).
// ============================================================

import { createClient } from '@supabase/supabase-js'

let _client = null
let _sessionPrimed = false
let _primingPromise = null

export function getSupabase() {
  if (_client) return _client

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!url || !key) return null

  _client = createClient(url, key, {
    auth: {
      persistSession:     true,
      autoRefreshToken:   true,
      detectSessionInUrl: true,
      storageKey:         'feyn-auth',
    },
  })

  return _client
}

// Returns the client only after the session has been loaded from localStorage.
// Use this in all DB write paths so the JWT is attached to every request.
// Safe to call multiple times — only primes once.
export async function getSupabaseReady() {
  const sb = getSupabase()
  if (!sb) return null
  if (_sessionPrimed) return sb
  if (_primingPromise) { await _primingPromise; return sb }
  _primingPromise = sb.auth.getSession().then(() => { _sessionPrimed = true })
  await _primingPromise
  return sb
}

export function isSupabaseAvailable() {
  return !!(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
}
