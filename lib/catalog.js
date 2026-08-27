// ============================================================
// lib/catalog.js — client-side catalogue cache
//
// Six client surfaces (home feed, search palette, onboarding,
// /profile, /settings, the nav) need the program → subject list while
// running in the browser. They used to `import data from '../data'`,
// which no longer exists.
//
// They now share one fetch of /api/catalog, cached in module scope:
//   • useCatalog()      → { programs, classes, interests, loading }
//   • getCachedCatalog() → synchronous read, [] before the first load
//
// The catalogue is small (cards only, no lesson trees) and public, so
// one fetch per page load is cheap and needs no auth.
// ============================================================

import { useState, useEffect } from 'react'

let _cache = null
let _inflight = null

export function getCachedCatalog() {
  return _cache || []
}

export function primeCatalog(programs) {
  if (Array.isArray(programs) && programs.length) _cache = programs
}

export async function loadCatalog() {
  if (_cache) return _cache
  if (_inflight) return _inflight
  _inflight = fetch('/api/catalog')
    .then(r => r.json())
    .then(j => {
      _cache = j.programs || []
      return _cache
    })
    .catch(e => {
      console.warn('[Feyn] catalog load failed:', e?.message)
      return []
    })
    .finally(() => {
      _inflight = null
    })
  return _inflight
}

export function useCatalog(initial) {
  if (initial) primeCatalog(initial)
  const [programs, setPrograms] = useState(() => _cache || initial || [])
  const [loading, setLoading] = useState(!(_cache || initial))

  useEffect(() => {
    if (_cache) {
      setPrograms(_cache)
      setLoading(false)
      return
    }
    let alive = true
    loadCatalog().then(p => {
      if (!alive) return
      setPrograms(p)
      setLoading(false)
    })
    return () => {
      alive = false
    }
  }, [])

  return {
    programs,
    classes: programs.filter(p => p.type === 'class'),
    interests: programs.filter(p => p.type !== 'class'),
    loading,
  }
}
