// ============================================================
// FEYN — USER STORE  (v17)
// Dual-mode: local (localStorage) or global (Supabase)
//
// Global auth uses OTP (one-time password via email).
// No magic links. No redirect URL issues. Works anywhere.
//
// Flow:
//   sign up  → signUpGlobal()  → needsOtp:true → verifyOtp() → done
//   sign in  → signInGlobal()  → needsOtp:true → verifyOtp() → done
//   upgrade  → upgradeToGlobal() → same OTP flow
//
// FIXES (v17):
//   1. signUpGlobal: removed silent otpFailed bypass — always returns
//      needsOtp:true when email confirmation is required so the
//      "Check your email" screen always shows.
//   2. signInGlobal: OTP fallback ONLY fires for "email not confirmed"
//      errors — never for wrong password (was leaking email existence
//      and sending unsolicited OTP emails).
//   3. upgradeToGlobal: returns { needsOtp } (was returning needsVerify,
//      which SyncTab never checked — "check email" never showed there).
//   4. setLastVisited: now writes to dedicated ff_last_visited key
//      instead of stomping watch-position data.
//   5. getLastActivity: reads ff_last_visited first, then falls back
//      to progress store — no more ambiguous merging.
//   6. syncLocalToSupabase: now also upserts certificates.
//   7. signOut: clears ff_upgrade_pending.
// ============================================================

import { getSupabase } from './supabase'

const ACCOUNT_TYPE_KEY = 'ff_account_type'

const KEYS = {
  PROFILE:    'ff_profile',
  PROGRESS:   'ff_progress',
  ENROLLED:   'ff_enrolled',
  CERTS:      'ff_certs',
  ONBOARDED:  'ff_onboarded',
  FEED_ORDER: 'ff_feed_order',
}
const WATCH_POS_KEY   = 'ff_watch_pos'
const LAST_VISITED_KEY = 'ff_last_visited'

// ── localStorage helpers ──────────────────────────────────────────────
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

// ── Account type ──────────────────────────────────────────────────────
export function getAccountType() {
  if (typeof window === 'undefined') return 'local'
  return localStorage.getItem(ACCOUNT_TYPE_KEY) || 'local'
}
export function isGlobalAccount() { return getAccountType() === 'global' }

// ── Auth state ────────────────────────────────────────────────────────
export function getProfile()  { return ls(KEYS.PROFILE) }
export function isSignedIn()  { return !!ls(KEYS.PROFILE) }

// ── Local sign-up (no network) ────────────────────────────────────────
export function signInLocal({ name, username = '' }) {
  const profile = {
    name: name.trim(), username: username.trim(),
    createdAt: Date.now(), updatedAt: Date.now(), global: false,
  }
  localStorage.setItem(ACCOUNT_TYPE_KEY, 'local')
  lsSet(KEYS.PROFILE, profile)
  return profile
}

// ── Global sign-up — step 1: create account, Supabase sends OTP ───────
// Returns { ok, error?, field?, needsOtp }
export async function signUpGlobal({ name, username, email, password }) {
  try {
    const sb = getSupabase()
    if (!sb) return { ok: false, error: 'Cloud sync is not available right now.' }

    // Check username uniqueness first
    if (username?.trim()) {
      const { data: taken } = await sb
        .from('profiles').select('id').eq('username', username.trim()).maybeSingle()
      if (taken) return { ok: false, error: 'That username is already taken.', field: 'username' }
    }

    // Create the auth account
    // When "Confirm email" is ON + OTP method is set in Supabase Auth settings,
    // Supabase automatically sends the OTP email as part of signUp.
    const { data, error } = await sb.auth.signUp({
      email:    email.trim(),
      password: password,
      options:  { data: { name: name.trim(), username: (username || '').trim() } },
    })

    if (error) {
      const msg = error.message?.toLowerCase() || ''
      if (
        msg.includes('already registered') || msg.includes('already exists') ||
        (msg.includes('email') && (msg.includes('taken') || msg.includes('registered')))
      ) {
        return { ok: false, error: 'An account with that email already exists.', field: 'email' }
      }
      if (msg.includes('password')) {
        return { ok: false, error: 'Password must be at least 6 characters.', field: 'password' }
      }
      return { ok: false, error: error.message }
    }

    if (!data?.user) return { ok: false, error: 'Something went wrong. Please try again.' }

    // Store pending profile — finalised in _finaliseSignIn after OTP verify
    const pending = {
      name: name.trim(), username: (username || '').trim(), email: email.trim(),
      supabaseId: data.user.id, createdAt: Date.now(), updatedAt: Date.now(), global: true,
    }
    lsSet('ff_pending_profile', pending)

    // If Supabase returned a session immediately (email confirm disabled in dashboard)
    if (data.session) {
      localStorage.setItem(ACCOUNT_TYPE_KEY, 'global')
      lsSet(KEYS.PROFILE, pending)
      await sb.from('profiles').upsert({
        id: data.user.id, name: pending.name, username: pending.username, email: pending.email,
      }).catch(() => {})
      return { ok: true, needsOtp: false }
    }

    // Email confirmation is required — OTP was sent by Supabase automatically.
    // Always show the "Check your email" screen.
    return { ok: true, needsOtp: true, email: email.trim() }

  } catch (e) {
    return { ok: false, error: e?.message || 'Something went wrong. Please try again.' }
  }
}

// ── Global sign-in — step 1: verify password ─────────────────────────
// FIX: OTP fallback ONLY for confirmed-email errors, never wrong password.
// Returns { ok, error?, field?, needsOtp }
export async function signInGlobal({ email, password }) {
  try {
    const sb = getSupabase()
    if (!sb) return { ok: false, error: 'Cloud sync is not available right now.' }

    const { data, error } = await sb.auth.signInWithPassword({
      email: email.trim(), password,
    })

    if (error) {
      const msg = error.message?.toLowerCase() || ''

      // Only send an OTP when the account exists but email isn't confirmed yet
      if (msg.includes('email not confirmed') || msg.includes('not confirmed')) {
        const otpRes = await sb.auth.signInWithOtp({
          email: email.trim(),
          options: { shouldCreateUser: false },
        })
        if (!otpRes.error) {
          lsSet('ff_pending_email', email.trim())
          return { ok: true, needsOtp: true, email: email.trim() }
        }
        return {
          ok: false,
          error: 'Your email isn\'t confirmed yet. Check your inbox for the verification code, or request a new one.',
        }
      }

      // Wrong credentials — intentionally vague to avoid email enumeration
      if (
        msg.includes('invalid') || msg.includes('credentials') ||
        msg.includes('wrong') || msg.includes('user not found') ||
        msg.includes('invalid login')
      ) {
        return { ok: false, error: 'Wrong email or password.', field: 'password' }
      }

      return { ok: false, error: error.message }
    }

    if (!data?.user) return { ok: false, error: 'Sign in failed. Please try again.' }

    await _finaliseSignIn(data.user, data.session, sb)
    return { ok: true, needsOtp: false }

  } catch (e) {
    return { ok: false, error: e?.message || 'Something went wrong. Please try again.' }
  }
}

// ── OTP verify — step 2: enter the 6-digit code ───────────────────────
export async function verifyOtp({ email, token, type = 'email' }) {
  try {
    const sb = getSupabase()
    if (!sb) return { ok: false, error: 'Cloud sync is not available right now.' }

    const { data, error } = await sb.auth.verifyOtp({
      email: email.trim(), token: token.trim(), type,
    })

    if (error) {
      const msg = error.message?.toLowerCase() || ''
      if (msg.includes('expired'))
        return { ok: false, error: 'That code has expired. Request a new one.' }
      if (msg.includes('invalid') || msg.includes('incorrect'))
        return { ok: false, error: 'Incorrect code. Check your email and try again.' }
      return { ok: false, error: error.message }
    }

    if (!data?.user) return { ok: false, error: 'Verification failed. Please try again.' }

    await _finaliseSignIn(data.user, data.session, sb)
    return { ok: true }

  } catch (e) {
    return { ok: false, error: e?.message || 'Verification failed. Please try again.' }
  }
}

// ── Resend OTP ────────────────────────────────────────────────────────
export async function resendOtp(email) {
  try {
    const sb = getSupabase()
    if (!sb) return { ok: false, error: 'Not available.' }
    const { error } = await sb.auth.signInWithOtp({
      email: email.trim(), options: { shouldCreateUser: false },
    })
    if (error) return { ok: false, error: error.message }
    return { ok: true }
  } catch (e) {
    return { ok: false, error: e?.message || 'Failed to resend.' }
  }
}

// ── Internal: finalise sign-in after successful auth ──────────────────
async function _finaliseSignIn(user, session, sb) {
  const userId = user.id

  const { data: dbProfile } = await sb
    .from('profiles').select('*').eq('id', userId).maybeSingle()

  const pending = ls('ff_pending_profile')

  const profile = {
    name:       pending?.name || dbProfile?.name || user.user_metadata?.name || 'User',
    username:   pending?.username || dbProfile?.username || user.user_metadata?.username || '',
    email:      user.email,
    supabaseId: userId,
    createdAt:  pending?.createdAt || new Date(user.created_at).getTime(),
    updatedAt:  Date.now(),
    global:     true,
  }
  localStorage.setItem(ACCOUNT_TYPE_KEY, 'global')
  lsSet(KEYS.PROFILE, profile)
  lsDel('ff_pending_profile')
  lsDel('ff_pending_email')

  await sb.from('profiles').upsert({
    id: userId, name: profile.name, username: profile.username, email: profile.email,
  }).catch(() => {})

  // Sync local data if this was an upgrade
  if (ls('ff_upgrade_pending')) {
    await syncLocalToSupabase(userId, sb)
  }

  // Pull cloud data into localStorage
  await pullFromSupabase(userId, sb)
}

async function pullFromSupabase(userId, sb) {
  if (!sb) return
  try {
    const [{ data: progressRows }, { data: enrollRows }, { data: certRows }] = await Promise.all([
      sb.from('lesson_progress').select('lesson_key,watched_at').eq('user_id', userId),
      sb.from('enrollments').select('subject_key').eq('user_id', userId),
      sb.from('certificates').select('*').eq('user_id', userId),
    ])
    if (progressRows?.length) {
      const progress = {}
      for (const r of progressRows) progress[r.lesson_key] = { watchedAt: new Date(r.watched_at).getTime() }
      lsSet(KEYS.PROGRESS, progress)
    }
    if (enrollRows?.length) lsSet(KEYS.ENROLLED, enrollRows.map(r => r.subject_key))
    if (certRows?.length)   lsSet(KEYS.CERTS, certRows.map(({ user_id, ...r }) => r))
  } catch (_) {}
}

// ── Save profile ──────────────────────────────────────────────────────
export function saveProfile(data) {
  if (!isSignedIn()) return null
  const merged = { ...getProfile(), ...data, updatedAt: Date.now() }
  lsSet(KEYS.PROFILE, merged)
  if (isGlobalAccount()) {
    const sb = getSupabase()
    if (sb && merged.supabaseId) {
      sb.from('profiles').upsert({
        id: merged.supabaseId, name: merged.name, username: merged.username,
      }).catch(() => {})
    }
  }
  return merged
}

// ── Sign out ──────────────────────────────────────────────────────────
export function signOut() {
  if (typeof window === 'undefined') return
  const wasGlobal = isGlobalAccount()
  Object.values(KEYS).forEach(k => lsDel(k))
  lsDel(ACCOUNT_TYPE_KEY)
  lsDel(WATCH_POS_KEY)
  lsDel(LAST_VISITED_KEY)
  lsDel('ff_pending_profile')
  lsDel('ff_pending_email')
  lsDel('ff_upgrade_pending')
  if (wasGlobal) {
    const sb = getSupabase()
    if (sb) sb.auth.signOut().catch(() => {})
  }
}

// ── Upgrade local → global ────────────────────────────────────────────
// FIX: returns { needsOtp } — SyncTab checks res.needsOtp.
export async function upgradeToGlobal({ email, password, username } = {}) {
  try {
    const sb = getSupabase()
    if (!sb) return { ok: false, error: 'Cloud sync is not available right now.' }
    const profile = getProfile()
    if (!profile) return { ok: false, error: 'Not signed in.' }
    if (isGlobalAccount()) return { ok: true }

    const finalUsername = (username || profile.username || '').trim()
    if (finalUsername) {
      const { data: taken } = await sb
        .from('profiles').select('id').eq('username', finalUsername).maybeSingle()
      if (taken) return { ok: false, error: 'That username is already taken.', field: 'username' }
    }

    const { data, error } = await sb.auth.signUp({
      email: email.trim(), password,
      options: { data: { name: profile.name, username: finalUsername } },
    })

    if (error) {
      const msg = error.message?.toLowerCase() || ''
      if (msg.includes('already registered') || msg.includes('already exists')) {
        return { ok: false, error: 'An account with that email already exists.', field: 'email' }
      }
      if (msg.includes('password')) {
        return { ok: false, error: 'Password must be at least 6 characters.', field: 'password' }
      }
      return { ok: false, error: error.message }
    }

    if (!data?.user) return { ok: false, error: 'Something went wrong. Please try again.' }

    const userId = data.user.id
    const pending = {
      ...profile, username: finalUsername, email: email.trim(),
      supabaseId: userId, global: true, updatedAt: Date.now(),
    }
    lsSet('ff_pending_profile', pending)
    lsSet('ff_upgrade_pending', true)

    if (data.session) {
      localStorage.setItem(ACCOUNT_TYPE_KEY, 'global')
      lsSet(KEYS.PROFILE, pending)
      lsDel('ff_pending_profile')
      await sb.from('profiles').upsert({
        id: userId, name: pending.name, username: pending.username, email: pending.email,
      }).catch(() => {})
      await syncLocalToSupabase(userId, sb)
      return { ok: true, needsOtp: false }
    }

    return { ok: true, needsOtp: true, email: email.trim() }

  } catch (e) {
    return { ok: false, error: e?.message || 'Something went wrong. Please try again.' }
  }
}

async function syncLocalToSupabase(userId, sb) {
  if (!sb) return
  const progress = ls(KEYS.PROGRESS, {})
  const enrolled = ls(KEYS.ENROLLED, [])
  const certs    = ls(KEYS.CERTS, [])

  const rows = Object.entries(progress).map(([key, val]) => ({
    user_id: userId, lesson_key: key,
    watched_at: new Date(val.watchedAt || Date.now()).toISOString(),
  }))
  if (rows.length)
    await sb.from('lesson_progress').upsert(rows, { onConflict: 'user_id,lesson_key' }).catch(() => {})
  if (enrolled.length)
    await sb.from('enrollments').upsert(
      enrolled.map(key => ({ user_id: userId, subject_key: key })),
      { onConflict: 'user_id,subject_key' }
    ).catch(() => {})
  if (certs.length)
    await sb.from('certificates').upsert(
      certs.map(c => ({ user_id: userId, ...c })),
      { onConflict: 'user_id,id' }
    ).catch(() => {})

  lsDel('ff_upgrade_pending')
}

// ── Onboarding ────────────────────────────────────────────────────────
export function hasOnboarded() { return !!ls(KEYS.ONBOARDED) }
export function setOnboarded()  { lsSet(KEYS.ONBOARDED, true) }

// ── Enrollment ────────────────────────────────────────────────────────
export function getEnrolled()                    { return ls(KEYS.ENROLLED, []) }
export function isEnrolled(programId, subjectId) { return getEnrolled().includes(`${programId}/${subjectId}`) }

export function enroll(programId, subjectId) {
  if (!isSignedIn()) return
  const list = getEnrolled(), key = `${programId}/${subjectId}`
  if (!list.includes(key)) {
    lsSet(KEYS.ENROLLED, [...list, key])
    if (isGlobalAccount()) {
      const sb = getSupabase(); const p = getProfile()
      if (sb && p?.supabaseId) {
        sb.from('enrollments').upsert(
          { user_id: p.supabaseId, subject_key: key },
          { onConflict: 'user_id,subject_key' }
        ).catch(() => {})
      }
    }
  }
}

export function unenroll(programId, subjectId) {
  if (!isSignedIn()) return
  const key = `${programId}/${subjectId}`
  lsSet(KEYS.ENROLLED, getEnrolled().filter(k => k !== key))
  if (isGlobalAccount()) {
    const sb = getSupabase(); const p = getProfile()
    if (sb && p?.supabaseId) {
      sb.from('enrollments').delete().eq('user_id', p.supabaseId).eq('subject_key', key).catch(() => {})
    }
  }
}

// ── Progress ──────────────────────────────────────────────────────────
export function getProgress() { return ls(KEYS.PROGRESS, {}) }

export function markWatched(programId, subjectId, topicId, lessonId) {
  if (!isSignedIn()) return
  const p = getProgress(), key = `${programId}/${subjectId}/${topicId}/${lessonId}`
  p[key] = { watchedAt: Date.now() }
  lsSet(KEYS.PROGRESS, p)
  if (isGlobalAccount()) {
    const sb = getSupabase(); const prof = getProfile()
    if (sb && prof?.supabaseId) {
      sb.from('lesson_progress').upsert(
        { user_id: prof.supabaseId, lesson_key: key, watched_at: new Date().toISOString() },
        { onConflict: 'user_id,lesson_key' }
      ).catch(() => {})
    }
  }
}

export function unmarkWatched(programId, subjectId, topicId, lessonId) {
  if (!isSignedIn()) return
  const p = getProgress(), key = `${programId}/${subjectId}/${topicId}/${lessonId}`
  delete p[key]
  lsSet(KEYS.PROGRESS, p)
  if (isGlobalAccount()) {
    const sb = getSupabase(); const prof = getProfile()
    if (sb && prof?.supabaseId) {
      sb.from('lesson_progress').delete().eq('user_id', prof.supabaseId).eq('lesson_key', key).catch(() => {})
    }
  }
}

export function isWatched(programId, subjectId, topicId, lessonId) {
  if (!isSignedIn()) return false
  return !!getProgress()[`${programId}/${subjectId}/${topicId}/${lessonId}`]
}

export function getSubjectProgress(programId, subjectId, subject) {
  if (!isSignedIn()) return 0
  const p = getProgress()
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

// ── Watch position (resume playback) ─────────────────────────────────
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

// ── Last activity ─────────────────────────────────────────────────────
// FIX: dedicated key — never stomps watch position data.
export function setLastVisited(programId, subjectId, topicId, lessonId) {
  lsSet(LAST_VISITED_KEY, {
    key: `${programId}/${subjectId}/${topicId}/${lessonId}`,
    savedAt: Date.now(),
  })
}

export function getLastActivity() {
  if (!isSignedIn()) return null

  // Primary: dedicated last-visited store
  const lv = ls(LAST_VISITED_KEY)
  if (lv?.key) {
    const parts = lv.key.split('/')
    if (parts.length === 4)
      return { programId: parts[0], subjectId: parts[1], topicId: parts[2], lessonId: parts[3] }
  }

  // Fallback: most recently marked lesson in progress store
  const p = getProgress()
  const entries = Object.entries(p)
  if (!entries.length) return null
  entries.sort((a, b) => (b[1].watchedAt || 0) - (a[1].watchedAt || 0))
  const [lastKey] = entries[0]
  const parts = lastKey.split('/')
  if (parts.length !== 4) return null
  return { programId: parts[0], subjectId: parts[1], topicId: parts[2], lessonId: parts[3] }
}

// ── Certificates ──────────────────────────────────────────────────────
export function getCerts() { return ls(KEYS.CERTS, []) }
export function hasCert(programId, subjectId) {
  return getCerts().some(c => c.programId === programId && c.subjectId === subjectId)
}
export function issueCert(programId, subjectId, subjectName, programName, userName) {
  if (!isSignedIn()) return null
  const certs = getCerts()
  const existing = certs.find(c => c.programId === programId && c.subjectId === subjectId)
  if (existing) return existing
  const cert = {
    id: `FEYN-${Date.now().toString(36).toUpperCase()}`,
    programId, subjectId, subjectName, programName, userName, issuedAt: Date.now(),
  }
  lsSet(KEYS.CERTS, [...certs, cert])
  if (isGlobalAccount()) {
    const sb = getSupabase(); const prof = getProfile()
    if (sb && prof?.supabaseId) {
      sb.from('certificates').insert({ user_id: prof.supabaseId, ...cert }).catch(() => {})
    }
  }
  return cert
}

// ── Feed order ────────────────────────────────────────────────────────
export function getFeedOrder()       { return ls(KEYS.FEED_ORDER, []) }
export function saveFeedOrder(order) { lsSet(KEYS.FEED_ORDER, order) }

// ── Export data ───────────────────────────────────────────────────────
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

// ── Compat shim ───────────────────────────────────────────────────────
export async function signIn(opts) {
  return signInLocal({ name: opts.name || '', username: opts.username || '' })
}
