// ============================================================
// FEYN — USER STORE  (v17.1)
// Dual-mode: local (localStorage) or global (Supabase)
//
// FIXED: Supabase v2 query builders are PromiseLike but NOT
// full Promises. Calling .catch() directly on them without
// await throws "is not a function". All fire-and-forget
// queries now use the fg() helper which awaits inside a
// try/catch so errors are silently swallowed without crashing.
// ============================================================

import { getSupabase } from './supabase'

const ACCOUNT_TYPE_KEY  = 'ff_account_type'
const LAST_VISITED_KEY  = 'ff_last_visited'
const WATCH_POS_KEY     = 'ff_watch_pos'

const KEYS = {
  PROFILE:    'ff_profile',
  PROGRESS:   'ff_progress',
  ENROLLED:   'ff_enrolled',
  CERTS:      'ff_certs',
  ONBOARDED:  'ff_onboarded',
  FEED_ORDER: 'ff_feed_order',
}

// ── Fire-and-forget helper ────────────────────────────────────────────
// Supabase v2 builders are PromiseLike, not real Promises.
// You MUST await them inside a try/catch — .catch() chaining alone
// does not work on the builder object.
function fg(queryPromise) {
  // Kick off async, swallow errors — never blocks caller
  ;(async () => { try { await queryPromise } catch (_) {} })()
}

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

    if (username?.trim()) {
      const { data: taken } = await sb
        .from('profiles').select('id').eq('username', username.trim()).maybeSingle()
      if (taken) return { ok: false, error: 'That username is already taken.', field: 'username' }
    }

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
      ) return { ok: false, error: 'An account with that email already exists.', field: 'email' }
      if (msg.includes('password'))
        return { ok: false, error: 'Password must be at least 6 characters.', field: 'password' }
      return { ok: false, error: error.message }
    }

    if (!data?.user) return { ok: false, error: 'Something went wrong. Please try again.' }

    const pending = {
      name: name.trim(), username: (username || '').trim(), email: email.trim(),
      supabaseId: data.user.id, createdAt: Date.now(), updatedAt: Date.now(), global: true,
    }
    lsSet('ff_pending_profile', pending)

    // Email confirm disabled — Supabase returned a session immediately
    if (data.session) {
      localStorage.setItem(ACCOUNT_TYPE_KEY, 'global')
      lsSet(KEYS.PROFILE, pending)
      fg(sb.from('profiles').upsert({
        id: data.user.id, name: pending.name, username: pending.username, email: pending.email,
      }))
      return { ok: true, needsOtp: false }
    }

    // Email confirmation required — Supabase sends OTP automatically
    return { ok: true, needsOtp: true, email: email.trim() }

  } catch (e) {
    return { ok: false, error: e?.message || 'Something went wrong. Please try again.' }
  }
}

// ── Global sign-in ────────────────────────────────────────────────────
// OTP fallback ONLY for "email not confirmed" — never for wrong password.
export async function signInGlobal({ email, password }) {
  try {
    const sb = getSupabase()
    if (!sb) return { ok: false, error: 'Cloud sync is not available right now.' }

    const { data, error } = await sb.auth.signInWithPassword({
      email: email.trim(), password,
    })

    if (error) {
      const msg = error.message?.toLowerCase() || ''

      if (msg.includes('email not confirmed') || msg.includes('not confirmed')) {
        const otpRes = await sb.auth.signInWithOtp({
          email: email.trim(),
          options: { shouldCreateUser: false },
        })
        if (!otpRes.error) {
          lsSet('ff_pending_email', email.trim())
          return { ok: true, needsOtp: true, email: email.trim() }
        }
        return { ok: false, error: "Your email isn't confirmed yet. Check your inbox for the verification code." }
      }

      if (
        msg.includes('invalid') || msg.includes('credentials') ||
        msg.includes('wrong') || msg.includes('user not found') ||
        msg.includes('invalid login')
      ) return { ok: false, error: 'Wrong email or password.', field: 'password' }

      return { ok: false, error: error.message }
    }

    if (!data?.user) return { ok: false, error: 'Sign in failed. Please try again.' }

    await _finaliseSignIn(data.user, data.session, sb)
    return { ok: true, needsOtp: false }

  } catch (e) {
    return { ok: false, error: e?.message || 'Something went wrong. Please try again.' }
  }
}

// ── OTP verify ────────────────────────────────────────────────────────
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

  fg(sb.from('profiles').upsert({
    id: userId, name: profile.name, username: profile.username, email: profile.email,
  }))

  if (ls('ff_upgrade_pending')) {
    await syncLocalToSupabase(userId, sb)
  }

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
      fg(sb.from('profiles').upsert({
        id: merged.supabaseId, name: merged.name, username: merged.username,
      }))
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
    if (sb) fg(sb.auth.signOut())
  }
}

// ── Upgrade local → global ────────────────────────────────────────────
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
      if (msg.includes('already registered') || msg.includes('already exists'))
        return { ok: false, error: 'An account with that email already exists.', field: 'email' }
      if (msg.includes('password'))
        return { ok: false, error: 'Password must be at least 6 characters.', field: 'password' }
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
      fg(sb.from('profiles').upsert({
        id: userId, name: pending.name, username: pending.username, email: pending.email,
      }))
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
  try {
    const progress = ls(KEYS.PROGRESS, {})
    const enrolled = ls(KEYS.ENROLLED, [])
    const certs    = ls(KEYS.CERTS, [])

    const rows = Object.entries(progress).map(([key, val]) => ({
      user_id: userId, lesson_key: key,
      watched_at: new Date(val.watchedAt || Date.now()).toISOString(),
    }))
    if (rows.length)
      await sb.from('lesson_progress').upsert(rows, { onConflict: 'user_id,lesson_key' })
    if (enrolled.length)
      await sb.from('enrollments').upsert(
        enrolled.map(key => ({ user_id: userId, subject_key: key })),
        { onConflict: 'user_id,subject_key' }
      )
    if (certs.length)
      await sb.from('certificates').upsert(
        certs.map(c => ({ user_id: userId, ...c })),
        { onConflict: 'user_id,id' }
      )
  } catch (_) {}
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
        fg(sb.from('enrollments').upsert(
          { user_id: p.supabaseId, subject_key: key },
          { onConflict: 'user_id,subject_key' }
        ))
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
      fg(sb.from('enrollments').delete().eq('user_id', p.supabaseId).eq('subject_key', key))
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
      fg(sb.from('lesson_progress').upsert(
        { user_id: prof.supabaseId, lesson_key: key, watched_at: new Date().toISOString() },
        { onConflict: 'user_id,lesson_key' }
      ))
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
      fg(sb.from('lesson_progress').delete().eq('user_id', prof.supabaseId).eq('lesson_key', key))
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
export function setLastVisited(programId, subjectId, topicId, lessonId) {
  lsSet(LAST_VISITED_KEY, {
    key: `${programId}/${subjectId}/${topicId}/${lessonId}`,
    savedAt: Date.now(),
  })
}

export function getLastActivity() {
  if (!isSignedIn()) return null

  const lv = ls(LAST_VISITED_KEY)
  if (lv?.key) {
    const parts = lv.key.split('/')
    if (parts.length === 4)
      return { programId: parts[0], subjectId: parts[1], topicId: parts[2], lessonId: parts[3] }
  }

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
      fg(sb.from('certificates').insert({ user_id: prof.supabaseId, ...cert }))
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
