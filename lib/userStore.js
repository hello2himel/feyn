// ============================================================
// FEYN — USER STORE
// Auth model: localStorage "session" (swap-ready for Supabase)
//
// States:
//   guest    — no profile, no session. Can browse freely.
//   signed-in, not onboarded — profile exists, onboarding pending
//   signed-in, onboarded    — full personalized experience
//
// Progress / certs / enrollment require signed-in state.
// ============================================================

const KEYS = {
  PROFILE:    'ff_profile',
  PROGRESS:   'ff_progress',
  ENROLLED:   'ff_enrolled',
  CERTS:      'ff_certs',
  ONBOARDED:  'ff_onboarded',
  FEED_ORDER: 'ff_feed_order',
}

function ls(key, fallback = null) {
  if (typeof window === 'undefined') return fallback
  try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : fallback }
  catch { return fallback }
}
function lsSet(key, val) {
  if (typeof window === 'undefined') return
  localStorage.setItem(key, JSON.stringify(val))
}

// ── Auth ──────────────────────────────────────────────────────────────

/** Returns profile object or null (null = guest) */
export function getProfile() { return ls(KEYS.PROFILE) }

/** True if the user has a profile (is "signed in") */
export function isSignedIn() { return !!ls(KEYS.PROFILE) }

/**
 * Sign up or sign in. Creates profile if none exists.
 * Returns the profile.
 */
export function signIn({ name, username }) {
  const existing = getProfile() || {}
  const profile = {
    ...existing,
    name:      name.trim(),
    username:  username.trim(),
    updatedAt: Date.now(),
  }
  if (!profile.createdAt) profile.createdAt = Date.now()
  lsSet(KEYS.PROFILE, profile)
  return profile
}

/** Update profile fields without touching auth state */
export function saveProfile(data) {
  if (!isSignedIn()) return null
  const merged = { ...getProfile(), ...data, updatedAt: Date.now() }
  lsSet(KEYS.PROFILE, merged)
  return merged
}

/** Sign out: clears everything */
export function signOut() {
  if (typeof window === 'undefined') return
  Object.values(KEYS).forEach(k => localStorage.removeItem(k))
}

// ── Onboarding ────────────────────────────────────────────────────────

/** True if user has completed the interest-selection onboarding */
export function hasOnboarded() { return !!ls(KEYS.ONBOARDED) }
export function setOnboarded()  { lsSet(KEYS.ONBOARDED, true) }

// ── Enrollment (requires sign-in) ────────────────────────────────────

export function getEnrolled() { return ls(KEYS.ENROLLED, []) }
export function isEnrolled(programId, subjectId) {
  return getEnrolled().includes(`${programId}/${subjectId}`)
}
export function enroll(programId, subjectId) {
  if (!isSignedIn()) return
  const list = getEnrolled(), key = `${programId}/${subjectId}`
  if (!list.includes(key)) lsSet(KEYS.ENROLLED, [...list, key])
}
export function unenroll(programId, subjectId) {
  if (!isSignedIn()) return
  lsSet(KEYS.ENROLLED, getEnrolled().filter(k => k !== `${programId}/${subjectId}`))
}

// ── Progress (requires sign-in) ───────────────────────────────────────

export function getProgress() { return ls(KEYS.PROGRESS, {}) }
export function markWatched(programId, subjectId, topicId, lessonId) {
  if (!isSignedIn()) return
  const p = getProgress()
  p[`${programId}/${subjectId}/${topicId}/${lessonId}`] = { watchedAt: Date.now() }
  lsSet(KEYS.PROGRESS, p)
}
export function unmarkWatched(programId, subjectId, topicId, lessonId) {
  if (!isSignedIn()) return
  const p = getProgress()
  delete p[`${programId}/${subjectId}/${topicId}/${lessonId}`]
  lsSet(KEYS.PROGRESS, p)
}
export function isWatched(programId, subjectId, topicId, lessonId) {
  if (!isSignedIn()) return false
  return !!getProgress()[`${programId}/${subjectId}/${topicId}/${lessonId}`]
}
export function getSubjectProgress(programId, subjectId, subject) {
  if (!isSignedIn()) return 0
  const p = getProgress()
  const all = subject.topics.flatMap(t =>
    t.lessons.map(l => `${programId}/${subjectId}/${t.id}/${l.id}`)
  )
  if (!all.length) return 0
  return Math.round(all.filter(k => !!p[k]).length / all.length * 100)
}
export function getTopicProgress(programId, subjectId, topic) {
  if (!isSignedIn()) return 0
  const p = getProgress()
  if (!topic.lessons.length) return 0
  return Math.round(
    topic.lessons.filter(l => !!p[`${programId}/${subjectId}/${topic.id}/${l.id}`]).length
    / topic.lessons.length * 100
  )
}

// ── Certificates (requires sign-in) ──────────────────────────────────

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
  lsSet(KEYS.CERTS, [...certs, cert])
  return cert
}

// ── Last activity — finds the next lesson to watch ───────────────────
// Returns null or { programId, subjectId, topicId, lessonId, watchedAt }
// Logic: find the most recently watched lesson key, then return the next
// lesson in sequence. If nothing watched yet, return null.
export function getLastActivity() {
  if (!isSignedIn()) return null
  const p = getProgress()
  const entries = Object.entries(p)
  if (!entries.length) return null
  // Sort by watchedAt desc, pick most recent
  entries.sort((a, b) => (b[1].watchedAt || 0) - (a[1].watchedAt || 0))
  const [lastKey, { watchedAt }] = entries[0]
  const [programId, subjectId, topicId, lessonId] = lastKey.split('/')
  return { programId, subjectId, topicId, lessonId, watchedAt }
}

// ── Feed order ────────────────────────────────────────────────────────

export function getFeedOrder() { return ls(KEYS.FEED_ORDER, []) }
export function saveFeedOrder(order) { lsSet(KEYS.FEED_ORDER, order) }
