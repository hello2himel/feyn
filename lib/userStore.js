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
// ── Local sign-in (no network, localStorage only) ─────────────────────
export function signInLocal({ name, username = '' }) {
  const profile = {
    name:      name.trim(),
    username:  username.trim(),
    createdAt: Date.now(),
    updatedAt: Date.now(),
    global:    false,
  }
  localStorage.setItem(ACCOUNT_TYPE_KEY, 'local')
  lsSet(KEYS.PROFILE, profile)
  return profile
}

// ── Global sign-up (Supabase email + password) ─────────────────────────
// Returns { ok, error, field } — field hints which input to highlight
export async function signUpGlobal({ name, username, email, password }) {
  const sb = getSupabase()
  if (!sb) return { ok: false, error: 'Cloud sync is not available right now.' }

  // 1. Check username uniqueness before creating auth user
  if (username) {
    const { data: taken } = await sb
      .from('profiles')
      .select('id')
      .eq('username', username.trim())
      .maybeSingle()
    if (taken) return { ok: false, error: 'That username is already taken.', field: 'username' }
  }

  // 2. Create Supabase auth user
  const { data, error } = await sb.auth.signUp({
    email:    email.trim(),
    password: password,
    options:  { data: { name: name.trim(), username: username.trim() } },
  })

  if (error) {
    // Map Supabase error messages to friendly ones
    const msg = error.message?.toLowerCase() || ''
    if (msg.includes('already registered') || msg.includes('already exists') || msg.includes('email') && msg.includes('taken')) {
      return { ok: false, error: 'An account with that email already exists.', field: 'email' }
    }
    if (msg.includes('password')) {
      return { ok: false, error: 'Password must be at least 6 characters.', field: 'password' }
    }
    return { ok: false, error: error.message }
  }

  if (!data?.user) return { ok: false, error: 'Something went wrong. Please try again.' }

  const userId = data.user.id
  localStorage.setItem(ACCOUNT_TYPE_KEY, 'global')

  // 3. Save profile
  const profile = {
    name:        name.trim(),
    username:    username.trim(),
    email:       email.trim(),
    supabaseId:  userId,
    createdAt:   Date.now(),
    updatedAt:   Date.now(),
    global:      true,
    needsVerify: !data.session, // true if email confirmation required
  }
  lsSet(KEYS.PROFILE, profile)

  // 4. Upsert profile row
  await sb.from('profiles').upsert({
    id: userId, name: profile.name, username: profile.username, email: profile.email,
  }).catch(() => {})

  return { ok: true, profile, needsVerify: profile.needsVerify }
}

// ── Global sign-in (email + password) ─────────────────────────────────
export async function signInGlobal({ email, password }) {
  const sb = getSupabase()
  if (!sb) return { ok: false, error: 'Cloud sync is not available right now.' }

  const { data, error } = await sb.auth.signInWithPassword({
    email:    email.trim(),
    password: password,
  })

  if (error) {
    const msg = error.message?.toLowerCase() || ''
    if (msg.includes('invalid') || msg.includes('credentials') || msg.includes('wrong')) {
      return { ok: false, error: 'Wrong email or password.', field: 'password' }
    }
    if (msg.includes('email') && msg.includes('confirm')) {
      return { ok: false, error: 'Please check your email and confirm your account first.' }
    }
    return { ok: false, error: error.message }
  }

  if (!data?.user) return { ok: false, error: 'Sign in failed. Please try again.' }

  const userId = data.user.id

  // Fetch their profile from DB
  const { data: dbProfile } = await sb
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .maybeSingle()

  const profile = {
    name:       dbProfile?.name  || data.user.user_metadata?.name     || 'User',
    username:   dbProfile?.username || data.user.user_metadata?.username || '',
    email:      data.user.email,
    supabaseId: userId,
    createdAt:  new Date(data.user.created_at).getTime(),
    updatedAt:  Date.now(),
    global:     true,
  }
  localStorage.setItem(ACCOUNT_TYPE_KEY, 'global')
  lsSet(KEYS.PROFILE, profile)

  // Pull their cloud data down into localStorage
  await pullFromSupabase(userId)

  return { ok: true, profile }
}

// ── Pull cloud data into localStorage (on sign-in) ────────────────────
async function pullFromSupabase(userId) {
  const sb = getSupabase()
  if (!sb) return

  try {
    // Progress
    const { data: progressRows } = await sb
      .from('lesson_progress')
      .select('lesson_key, watched_at')
      .eq('user_id', userId)
    if (progressRows?.length) {
      const progress = {}
      for (const row of progressRows) {
        progress[row.lesson_key] = { watchedAt: new Date(row.watched_at).getTime() }
      }
      lsSet(KEYS.PROGRESS, progress)
    }

    // Enrollments
    const { data: enrollRows } = await sb
      .from('enrollments')
      .select('subject_key')
      .eq('user_id', userId)
    if (enrollRows?.length) {
      lsSet(KEYS.ENROLLED, enrollRows.map(r => r.subject_key))
    }

    // Certs
    const { data: certRows } = await sb
      .from('certificates')
      .select('*')
      .eq('user_id', userId)
    if (certRows?.length) {
      lsSet(KEYS.CERTS, certRows.map(({ user_id, ...rest }) => rest))
    }
  } catch (_) {}
}

// ── signIn shim (kept for backward compat with old callers) ───────────
export async function signIn(opts) {
  if (opts.global) {
    // Old anonymous global path — now falls back to local
    return signInLocal({ name: opts.name, username: opts.username })
  }
  return signInLocal({ name: opts.name, username: opts.username || '' })
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
// Uses watch positions (updated on first play) rather than markWatched
// (which only fires at 80%). This way the card updates instantly.

export function setLastVisited(programId, subjectId, topicId, lessonId) {
  // Update watch position savedAt so this lesson sorts first in getLastActivity
  const key = `${programId}/${subjectId}/${topicId}/${lessonId}`
  const all  = getWatchPositions()
  all[key] = { ...(all[key] || {}), pct: all[key]?.pct || 0, pos: all[key]?.pos || 0, savedAt: Date.now() }
  lsSet(WATCH_POS_KEY, all)
}

export function getLastActivity() {
  if (!isSignedIn()) return null

  // Prefer watch positions (updated on first play start)
  const positions = getWatchPositions()
  const posEntries = Object.entries(positions)

  if (posEntries.length) {
    posEntries.sort((a, b) => (b[1].savedAt || 0) - (a[1].savedAt || 0))
    const [lastKey] = posEntries[0]
    const parts = lastKey.split('/')
    if (parts.length === 4) {
      const [programId, subjectId, topicId, lessonId] = parts
      return { programId, subjectId, topicId, lessonId, savedAt: posEntries[0][1].savedAt }
    }
  }

  // Fallback: use markWatched progress
  const p = getProgress()
  const entries = Object.entries(p)
  if (!entries.length) return null
  entries.sort((a, b) => (b[1].watchedAt || 0) - (a[1].watchedAt || 0))
  const [lastKey, { watchedAt }] = entries[0]
  const [programId, subjectId, topicId, lessonId] = lastKey.split('/')
  return { programId, subjectId, topicId, lessonId, savedAt: watchedAt }
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
// ── Upgrade local account → global (email + password) ─────────────────
// The UI collects credentials first, then calls this.
// Returns { ok, error, field }
export async function upgradeToGlobal({ email, password, username } = {}) {
  try {
    const sb = getSupabase()
    if (!sb) return { ok: false, error: 'Cloud sync is not available right now.' }

    const profile = getProfile()
    if (!profile) return { ok: false, error: 'Not signed in.' }
    if (isGlobalAccount()) return { ok: true }

    // 1. Check username uniqueness if provided
    const finalUsername = (username || profile.username || '').trim()
    if (finalUsername) {
      const { data: taken } = await sb
        .from('profiles')
        .select('id')
        .eq('username', finalUsername)
        .maybeSingle()
      if (taken) return { ok: false, error: 'That username is already taken.', field: 'username' }
    }

    // 2. Create Supabase auth user
    const { data, error } = await sb.auth.signUp({
      email:    email.trim(),
      password: password,
      options:  { data: { name: profile.name, username: finalUsername } },
    })

    if (error) {
      const msg = error.message?.toLowerCase() || ''
      if (msg.includes('already registered') || msg.includes('already exists') || (msg.includes('email') && msg.includes('taken'))) {
        return { ok: false, error: 'An account with that email already exists.', field: 'email' }
      }
      if (msg.includes('password')) {
        return { ok: false, error: 'Password must be at least 6 characters.', field: 'password' }
      }
      return { ok: false, error: error.message }
    }

    if (!data?.user) return { ok: false, error: 'Something went wrong. Please try again.' }

    const userId = data.user.id
    localStorage.setItem(ACCOUNT_TYPE_KEY, 'global')

    const updated = {
      ...profile,
      username:    finalUsername,
      email:       email.trim(),
      supabaseId:  userId,
      global:      true,
      updatedAt:   Date.now(),
      needsVerify: !data.session,
    }
    lsSet(KEYS.PROFILE, updated)

    // 3. Push profile row
    await sb.from('profiles').upsert({
      id: userId, name: updated.name, username: updated.username, email: updated.email,
    }).catch(() => {})

    // 4. Push all local progress to cloud
    await syncLocalToSupabase(userId)

    return { ok: true, needsVerify: updated.needsVerify }
  } catch (e) {
    // Always returns — never leaves UI in spinning state
    return { ok: false, error: e?.message || 'Something went wrong. Please try again.' }
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
