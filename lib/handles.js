// ============================================================
// lib/handles.js — client-side mirror of public.validate_handle()
//
// This exists purely for instant feedback in the handle field. The
// database is still the authority: every RPC that accepts a handle
// re-runs validate_handle() server-side.
//
// KEEP IN SYNC with docs/schema.sql Part 5 (`is_reserved_handle`,
// `validate_handle`). The error strings are intentionally identical
// so the inline hint and the eventual server error read the same.
// ============================================================

export const RESERVED_HANDLES = [
  'admin', 'api', 'settings', 'profile', 'about', 'contact', 'coaches', 'panels',
  'verify', 'terms', 'privacy', 'login', 'signin', 'signup', 'signout', 'logout',
  'm', 'p', 'www', 'support', 'help', 'feyn', 'studio', 'apply', 'register',
  'dashboard', 'docs', 'static', '_next', 'public', 'null', 'undefined', 'teach',
]

export function normalizeHandle(candidate) {
  return String(candidate ?? '').trim().toLowerCase()
}

export function isReservedHandle(candidate) {
  return RESERVED_HANDLES.includes(normalizeHandle(candidate))
}

/** Returns null when valid, otherwise a human-readable reason. */
export function validateHandle(candidate) {
  const h = normalizeHandle(candidate)
  if (h.length < 3) return 'Must be at least 3 characters.'
  if (h.length > 30) return 'Must be at most 30 characters.'
  if (!/^[a-z0-9_-]+$/.test(h)) return 'Only lowercase letters, numbers, hyphens and underscores.'
  if (/^[-_]/.test(h) || /[-_]$/.test(h)) return 'Cannot start or end with a hyphen or underscore.'
  if (/--/.test(h)) return 'Cannot contain consecutive hyphens.'
  if (isReservedHandle(h)) return 'This handle is reserved.'
  return null
}

export const HANDLE_COOLDOWN_DAYS = 14
export const HANDLE_CHANGE_CAP = 5

/**
 * Mirrors the cooldown arithmetic in change_mentor_username /
 * change_publisher_slug so the UI can show a date instead of waiting
 * for the RPC to refuse.
 */
export function handleChangeStatus({ updatedAt, changeCount = 0 } = {}) {
  const count = Number(changeCount) || 0
  if (count >= HANDLE_CHANGE_CAP) {
    return {
      allowed: false,
      reason: `You have used all ${HANDLE_CHANGE_CAP} changes. An app admin must make further changes.`,
      availableAt: null,
      remaining: 0,
    }
  }
  const remaining = HANDLE_CHANGE_CAP - count
  if (!updatedAt) return { allowed: true, reason: null, availableAt: null, remaining }

  const availableAt = new Date(new Date(updatedAt).getTime() + HANDLE_COOLDOWN_DAYS * 86400000)
  if (availableAt.getTime() > Date.now()) {
    return {
      allowed: false,
      reason: `You can change this again on ${availableAt.toLocaleDateString()}.`,
      availableAt,
      remaining,
    }
  }
  return { allowed: true, reason: null, availableAt, remaining }
}
