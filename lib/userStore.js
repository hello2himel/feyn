// ============================================================
// FEYN USER STORE
// Dual-mode: local (localStorage) or global (Supabase)
// Account type stored in localStorage under 'ff_account_type'
// value: 'local' | 'global'
//
// All exported functions work identically regardless of mode.
// Swap to Supabase by calling signIn with { global: true }.
// ============================================================

import { getSupabase } from './supabase'

// ── Storage mode ──────────────────────────────────────────────────────

const ACCOUNT_TYPE_KEY = 'ff_account_type'

export function getAccountType() {
  if (typeof window === 'undefined') return 'local'
  return localStorage.getItem(ACCOUNT_TYPE_KEY) || 'local'
}

export function isGlobalAccount() {
  return getAccountType() === 'global'
}

// ── localStorage helpers ──────────────────────────────────────────────

const KEYS = {
  PROFILE:    'ff_profile',
  PROGRESS:   'ff_progress',
  ENROLLED:   'ff_enrolled',
  CERTS:      'ff_certs',
  ONBOARDED:  'ff_onboarded',
  FEED_ORDER: 'ff_feed_order',
}

const WATCH_POS_KEY = 'ff_watch_pos'

function ls(key, fallback = null) {
  if (typeof window === 'undefined') return fallback
  try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : fallback }
  catch { return fallback }
}
function lsSet(key, val) {
  if (typeof window === 'undefined') return
  localStorage.setItem(key, JSON.stringify(val))
}
function lsDel(key) {
  if (typeof window === 'undefined') return
  localStorage.removeItem(key)
}

// ── Auth ──────────────────────────────────────────────────────────────

export function getProfile() {
  return ls(KEYS.PROFILE)
}

export function isSignedIn() {
  return !!ls(KEYS.PROFILE)
}

/**
 * Sign in / sign up.
 * @param {{ name: string, username?: string, global?: boolean }} opts
 *   global: true  -> creates a Supabase anonymous session + syncs profile
 *   global: false -> local-only, no network needed
 */
export async function signIn({ name, username = '', global: useGlobal = false }) {
  const profile = {
    name:      name.trim(),
    username:  username.trim(),
    createdAt: Date.now(),
    updatedAt: Date.now(),
    global:    useGlobal,
  }

  if (useGlobal) {
    const sb = getSupabase()
    if (sb) {
      try {
        // Anonymous sign-in (no email required)
        const { data, error } = await sb.auth.signInAnonymously()
        if (!error && data?.user) {
          profile.supabaseId = data.user.id
          localStorage.setItem(ACCOUNT_TYPE_KEY, 'global')
          // Upsert profile to Supabase
          await sb.from('profiles').upsert({
            id:       data.user.id,
            name:     profile.name,
            username: profile.username,
          })
          // Sync any existing local progress to Supabase
          await syncLocalToSupabase(data.user.id)
        }
      } catch (_) {
        // Fall back to local silently
        localStorage.setItem(ACCOUNT_TYPE_KEY, 'local')
      }
    } else {
      localStorage.setItem(ACCOUNT_TYPE_KEY, 'local')
    }
  } else {
    localStorage.setItem(ACCOUNT_TYPE_KEY, 'local')
  }

  lsSet(KEYS.PROFILE, profile)
  return profile
}

export function saveProfile(data) {
  if (!isSignedIn()) return null
  const merged = { ...getProfile(), ...data, updatedAt: Date.now() }
  lsSet(KEYS.PROFILE, merged)

  // Sync name/username to Supabase if global
  if (isGlobalAccount()) {
    const sb = getSupabase()
    if (sb && merged.supabaseId) {
      sb.from('profiles').upsert({ id: merged.supabaseId, name: merged.name, username: merged.username }).catch(() => {})
    }
  }
  return merged
}

export function signOut() {
  if (typeof window === 'undefined') return
  Object.values(KEYS).forEach(k => lsDel(k))
  lsDel(ACCOUNT_TYPE_KEY)
  lsDel(WATCH_POS_KEY)

  if (isGlobalAccount()) {
    const sb = getSupabase()
    if (sb) sb.auth.signOut().catch(() => {})
  }
}

// ── Supabase sync ─────────────────────────────────────────────────────
// On first global sign-in, push any local progress up to Supabase

async function syncLocalToSupabase(userId) {
  const sb = getSupabase()
  if (!sb) return

  const progress = ls(KEYS.PROGRESS, {})
  const enrolled = ls(KEYS.ENROLLED, [])
  const certs    = ls(KEYS.CERTS, [])

  const rows = Object.entries(progress).map(([key, val]) => ({
    user_id:    userId,
    lesson_key: key,
    watched_at: new Date(val.watchedAt).toISOString(),
  }))

  if (rows.length) {
    await sb.from('lesson_progress').upsert(rows, { onConflict: 'user_id,lesson_key' }).catch(() => {})
  }

  if (enrolled.length) {
    const enrolledRows = enrolled.map(key => ({ user_id: userId, subject_key: key }))
    await sb.from('enrollments').upsert(enrolledRows, { onConflict: 'user_id,subject_key' }).catch(() => {})
  }
}

// ── Onboarding ────────────────────────────────────────────────────────

export function hasOnboarded() { return !!ls(KEYS.ONBOARDED) }
export function setOnboarded()  { lsSet(KEYS.ONBOARDED, true) }

// ── Enrollment ────────────────────────────────────────────────────────

export function getEnrolled() { return ls(KEYS.ENROLLED, []) }

export function isEnrolled(programId, subjectId) {
  return getEnrolled().includes(`${programId}/${subjectId}`)
}

export function enroll(programId, subjectId) {
  if (!isSignedIn()) return
  const list = getEnrolled()
  const key  = `${programId}/${subjectId}`
  if (!list.includes(key)) {
    const next = [...list, key]
    lsSet(KEYS.ENROLLED, next)
    // Sync to Supabase
    if (isGlobalAccount()) {
      const sb = getSupabase()
      const profile = getProfile()
      if (sb && profile?.supabaseId) {
        sb.from('enrollments').upsert({ user_id: profile.supabaseId, subject_key: key }, { onConflict: 'user_id,subject_key' }).catch(() => {})
      }
    }
  }
}

export function unenroll(programId, subjectId) {
  if (!isSignedIn()) return
  const key  = `${programId}/${subjectId}`
  lsSet(KEYS.ENROLLED, getEnrolled().filter(k => k !== key))
  if (isGlobalAccount()) {
    const sb = getSupabase()
    const profile = getProfile()
    if (sb && profile?.supabaseId) {
      sb.from('enrollments').delete().eq('user_id', profile.supabaseId).eq('subject_key', key).catch(() => {})
    }
  }
}

// ── Progress ──────────────────────────────────────────────────────────

export function getProgress() { return ls(KEYS.PROGRESS, {}) }

export function markWatched(programId, subjectId, topicId, lessonId) {
  if (!isSignedIn()) return
  const p   = getProgress()
  const key = `${programId}/${subjectId}/${topicId}/${lessonId}`
  p[key] = { watchedAt: Date.now() }
  lsSet(KEYS.PROGRESS, p)

  if (isGlobalAccount()) {
    const sb = getSupabase()
    const profile = getProfile()
    if (sb && profile?.supabaseId) {
      sb.from('lesson_progress').upsert(
        { user_id: profile.supabaseId, lesson_key: key, watched_at: new Date().toISOString() },
        { onConflict: 'user_id,lesson_key' }
      ).catch(() => {})
    }
  }
}

export function unmarkWatched(programId, subjectId, topicId, lessonId) {
  if (!isSignedIn()) return
  const p   = getProgress()
  const key = `${programId}/${subjectId}/${topicId}/${lessonId}`
  delete p[key]
  lsSet(KEYS.PROGRESS, p)
  if (isGlobalAccount()) {
    const sb = getSupabase()
    const profile = getProfile()
    if (sb && profile?.supabaseId) {
      sb.from('lesson_progress').delete().eq('user_id', profile.supabaseId).eq('lesson_key', key).catch(() => {})
    }
  }
}

export function isWatched(programId, subjectId, topicId, lessonId) {
  if (!isSignedIn()) return false
  return !!getProgress()[`${programId}/${subjectId}/${topicId}/${lessonId}`]
}

export function getSubjectProgress(programId, subjectId, subject) {
  if (!isSignedIn()) return 0
  const p   = getProgress()
  const all = subject.topics.flatMap(t => t.lessons.map(l => `${programId}/${subjectId}/${t.id}/${l.id}`))
  if (!all.length) return 0
  return Math.round(all.filter(k => !!p[k]).length / all.length * 100)
}

export function getTopicProgress(programId, subjectId, topic) {
  if (!isSignedIn()) return 0
  const p = getProgress()
  if (!topic.lessons.length) return 0
  return Math.round(
    topic.lessons.filter(l => !!p[`${programId}/${subjectId}/${topic.id}/${l.id}`]).length / topic.lessons.length * 100
  )
}

// ── Watch position (resume from where you left off) ───────────────────
// value: { pct: 0-100, pos: seconds, savedAt: timestamp }

function getWatchPositions() { return ls(WATCH_POS_KEY, {}) }

export function saveWatchProgress(lessonKey, pct, posSeconds) {
  if (!isSignedIn() || !lessonKey) return
  const all = getWatchPositions()
  all[lessonKey] = { pct, pos: posSeconds, savedAt: Date.now() }
  lsSet(WATCH_POS_KEY, all)
}

export function getWatchProgress(lessonKey) {
  if (!lessonKey) return null
  return getWatchPositions()[lessonKey] || null
}

// ── Last activity (for homepage continue card) ────────────────────────

export function getLastActivity() {
  if (!isSignedIn()) return null
  const p       = getProgress()
  const entries = Object.entries(p)
  if (!entries.length) return null
  entries.sort((a, b) => (b[1].watchedAt || 0) - (a[1].watchedAt || 0))
  const [lastKey, { watchedAt }] = entries[0]
  const [programId, subjectId, topicId, lessonId] = lastKey.split('/')
  return { programId, subjectId, topicId, lessonId, watchedAt }
}

// ── Certificates ──────────────────────────────────────────────────────

export function getCerts() { return ls(KEYS.CERTS, []) }

export function hasCert(programId, subjectId) {
  return getCerts().some(c => c.programId === programId && c.subjectId === subjectId)
}

export function issueCert(programId, subjectId, subjectName, programName, userName) {
  if (!isSignedIn()) return null
  const certs    = getCerts()
  const existing = certs.find(c => c.programId === programId && c.subjectId === subjectId)
  if (existing) return existing
  const cert = {
    id: `FEYN-${Date.now().toString(36).toUpperCase()}`,
    programId, subjectId, subjectName, programName, userName,
    issuedAt: Date.now(),
  }
  const next = [...certs, cert]
  lsSet(KEYS.CERTS, next)

  if (isGlobalAccount()) {
    const sb      = getSupabase()
    const profile = getProfile()
    if (sb && profile?.supabaseId) {
      sb.from('certificates').insert({ user_id: profile.supabaseId, ...cert }).catch(() => {})
    }
  }
  return cert
}

// ── Account upgrade: local → global ──────────────────────────────────
// Call from Settings when a local user wants to enable cloud sync.
// Creates an anonymous Supabase session and pushes all local data up.
export async function upgradeToGlobal() {
  const sb = getSupabase()
  if (!sb) return { ok: false, error: 'Supabase not configured' }

  const profile = getProfile()
  if (!profile) return { ok: false, error: 'Not signed in' }
  if (isGlobalAccount()) return { ok: true } // already global

  try {
    const { data, error } = await sb.auth.signInAnonymously()
    if (error || !data?.user) return { ok: false, error: error?.message || 'Auth failed' }

    const userId = data.user.id
    localStorage.setItem(ACCOUNT_TYPE_KEY, 'global')

    const updated = { ...profile, supabaseId: userId, global: true, updatedAt: Date.now() }
    lsSet(KEYS.PROFILE, updated)

    // Upsert profile
    await sb.from('profiles').upsert({
      id: userId, name: profile.name, username: profile.username || '',
    }).catch(() => {})

    // Push all local data
    await syncLocalToSupabase(userId)

    return { ok: true }
  } catch (e) {
    return { ok: false, error: e.message }
  }
}

// ── Export account data (GDPR-style) ─────────────────────────────────
export function exportAccountData() {
  return {
    profile:    getProfile(),
    enrolled:   getEnrolled(),
    progress:   getProgress(),
    certs:      getCerts(),
    feedOrder:  getFeedOrder(),
    exportedAt: new Date().toISOString(),
  }
}

// ── Feed order ────────────────────────────────────────────────────────

export function getFeedOrder()      { return ls(KEYS.FEED_ORDER, []) }
export function saveFeedOrder(order) { lsSet(KEYS.FEED_ORDER, order) }
