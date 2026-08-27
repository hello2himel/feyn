// ============================================================
// lib/usePermissions.js — React hook wrapper around lib/permissions
//
// Loads the caller's permission set once per session and caches it in
// module scope, because every dashboard surface asks for it and the
// answer only changes on membership events.
//
// Call refresh() after any membership/role mutation.
// ============================================================

import { useState, useEffect, useCallback } from 'react'
import { getSupabaseReady } from './supabase'
import { loadPermissions, EMPTY_PERMISSIONS } from './permissions'

let _cache = null
let _inflight = null

export function invalidatePermissions() {
  _cache = null
  _inflight = null
}

async function resolve() {
  const sb = await getSupabaseReady()
  if (!sb) return EMPTY_PERMISSIONS
  const { data } = await sb.auth.getUser()
  const userId = data?.user?.id
  if (!userId) return EMPTY_PERMISSIONS
  return loadPermissions(sb, userId)
}

export function usePermissions() {
  const [perms, setPerms] = useState(_cache)
  const [loading, setLoading] = useState(!_cache)

  const load = useCallback(async (force = false) => {
    if (force) invalidatePermissions()
    if (_cache && !force) {
      setPerms(_cache)
      setLoading(false)
      return _cache
    }
    setLoading(true)
    _inflight = _inflight || resolve()
    try {
      const p = await _inflight
      _cache = p
      setPerms(p)
      return p
    } catch (e) {
      console.warn('[Feyn] permissions load failed:', e?.message)
      setPerms(EMPTY_PERMISSIONS)
      return EMPTY_PERMISSIONS
    } finally {
      _inflight = null
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    let alive = true
    load().catch(() => {})
    const onAuth = () => {
      invalidatePermissions()
      if (alive) load(true).catch(() => {})
    }
    window.addEventListener('feyn:auth', onAuth)
    return () => {
      alive = false
      window.removeEventListener('feyn:auth', onAuth)
    }
  }, [load])

  return { perms: perms || EMPTY_PERMISSIONS, loading, refresh: () => load(true) }
}
