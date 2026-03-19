// ============================================================
// FEYN — USER STORE  (v17.2)
// Dual-mode: local (localStorage) or global (Supabase)
//
// WHAT SYNCS across devices (global accounts):
//   ✓ Enrollments          (enrollments table)
//   ✓ Lesson progress      (lesson_progress table)
//   ✓ Certificates         (certificates table)
//   ✓ Watch positions      (watch_positions table) ← NEW
//   ✓ Feed order           (user_preferences table) ← NEW
//   ✓ Last visited lesson  (user_preferences table) ← NEW
//   ✓ Profile name/username (profiles table — push + pull)
//
// INTENTIONALLY local-only (device preferences):
//   · Theme (dark/light)   — device UI preference, makes sense per-device
//   · Onboarded flag       — per-device onboarding state
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
// Must await inside try/catch — .catch() on the builder alone doesn't work.
function fg(queryPromise) {
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

    if (data.session) {
      localStorage.setItem(ACCOUNT_TYPE_KEY, 'global')
      lsSet(KEYS.PROFILE, pending)
      fg(sb.from('profiles').upsert({
        id: data.user.id, name: pending.name, username: pending.username, email: pending.email,
      }))
      return { ok: true, needsOtp: false }
    }

    return { ok: true, needsOtp: true, email: email.trim() }

  } catch (e) {
    return { ok: false, error: e?.message || 'Something went wrong. Please try again.' }
  }
}

// ── Global sign-in ────────────────────────────────────────────────────
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

// ── Internal: finalise sign-in ────────────────────────────────────────
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

  // Push profile (name/username) to Supabase
  fg(sb.from('profiles').upsert({
    id: userId, name: profile.name, username: profile.username, email: profile.email,
  }))

  // If this was a local→global upgrade, push local data first
  if (ls('ff_upgrade_pending')) {
    await syncLocalToSupabase(userId, sb)
  }

  // Pull everything from Supabase into localStorage
  await pullFromSupabase(userId, sb)
}

// ── Pull all synced data from Supabase → localStorage ─────────────────
async function pullFromSupabase(userId, sb) {
  if (!sb) return
  try {
    const [
      { data: progressRows },
      { data: enrollRows },
      { data: certRows },
      { data: watchRows },
      { data: prefRows },
    ] = await Promise.all([
      sb.from('lesson_progress').select('lesson_key,watched_at').eq('user_id', userId),
      sb.from('enrollments').select('subject_key').eq('user_id', userId),
      sb.from('certificates').select('*').eq('user_id', userId),
      sb.from('watch_positions').select('lesson_key,pct,pos_seconds,saved_at').eq('user_id', userId),
      sb.from('user_preferences').select('key,value').eq('user_id', userId),
    ])

    if (progressRows?.length) {
      const progress = {}
      for (const r of progressRows)
        progress[r.lesson_key] = { watchedAt: new Date(r.watched_at).getTime() }
      lsSet(KEYS.PROGRESS, progress)
    }

    if (enrollRows?.length)
      lsSet(KEYS.ENROLLED, enrollRows.map(r => r.subject_key))

    if (certRows?.length)
      lsSet(KEYS.CERTS, certRows.map(({ user_id, ...r }) => r))

    if (watchRows?.length) {
      const positions = {}
      for (const r of watchRows)
        positions[r.lesson_key] = {
          pct:     r.pct,
          pos:     parseFloat(r.pos_seconds),
          savedAt: new Date(r.saved_at).getTime(),
        }
      lsSet(WATCH_POS_KEY, positions)
    }

    if (prefRows?.length) {
      for (const row of prefRows) {
        if (row.key === 'feed_order') {
          try { lsSet(KEYS.FEED_ORDER, JSON.parse(row.value)) } catch (_) {}
        }
        if (row.key === 'last_visited') {
          try { lsSet(LAST_VISITED_KEY, JSON.parse(row.value)) } catch (_) {}
        }
      }
    }

  } catch (_) {}
}

// ── Push all local data to Supabase (upgrade / initial sync) ──────────
async function syncLocalToSupabase(userId, sb) {
  if (!sb) return
  try {
    const progress   = ls(KEYS.PROGRESS, {})
    const enrolled   = ls(KEYS.ENROLLED, [])
    const certs      = ls(KEYS.CERTS, [])
    const positions  = ls(WATCH_POS_KEY, {})
    const feedOrder  = ls(KEYS.FEED_ORDER, [])
    const lastVisited = ls(LAST_VISITED_KEY)

    if (Object.keys(progress).length)
      await sb.from('lesson_progress').upsert(
        Object.entries(progress).map(([key, val]) => ({
          user_id: userId, lesson_key: key,
          watched_at: new Date(val.watchedAt || Date.now()).toISOString(),
        })),
        { onConflict: 'user_id,lesson_key' }
      )

    if (enrolled.length)
      await sb.from('enrollments').upsert(
        enrolled.map(key => ({ user_id: userId, subject_key: key })),
        { onConflict: 'user_id,subject_key' }
      )

    if (certs.length)
      await sb.from('certificates').upsert(
        certs.map(c => ({
          user_id:      userId,
          id:           c.id,
          program_id:   c.programId   || c.program_id,
          subject_id:   c.subjectId   || c.subject_id,
          program_name: c.programName || c.program_name,
          subject_name: c.subjectName || c.subject_name,
          user_name:    c.userName    || c.user_name,
          issued_at:    c.issuedAt
            ? new Date(c.issuedAt).toISOString()
            : (c.issued_at || new Date().toISOString()),
        })),
        { onConflict: 'id' }
      )

    if (Object.keys(positions).length)
      await sb.from('watch_positions').upsert(
        Object.entries(positions).map(([key, val]) => ({
          user_id: userId, lesson_key: key,
          pct: val.pct || 0, pos_seconds: val.pos || 0,
          saved_at: new Date(val.savedAt || Date.now()).toISOString(),
        })),
        { onConflict: 'user_id,lesson_key' }
      )

    const prefRows = []
    if (feedOrder.length)
      prefRows.push({ user_id: userId, key: 'feed_order', value: JSON.stringify(feedOrder) })
    if (lastVisited)
      prefRows.push({ user_id: userId, key: 'last_visited', value: JSON.stringify(lastVisited) })
    if (prefRows.length)
      await sb.from('user_preferences').upsert(prefRows, { onConflict: 'user_id,key' })

  } catch (_) {}
  lsDel('ff_upgrade_pending')
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
      if (sb && p?.supabaseId)
        fg(sb.from('enrollments').upsert(
          { user_id: p.supabaseId, subject_key: key },
          { onConflict: 'user_id,subject_key' }
        ))
    }
  }
}

export function unenroll(programId, subjectId) {
  if (!isSignedIn()) return
  const key = `${programId}/${subjectId}`
  lsSet(KEYS.ENROLLED, getEnrolled().filter(k => k !== key))
  if (isGlobalAccount()) {
    const sb = getSupabase(); const p = getProfile()
    if (sb && p?.supabaseId)
      fg(sb.from('enrollments').delete().eq('user_id', p.supabaseId).eq('subject_key', key))
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
    if (sb && prof?.supabaseId)
      fg(sb.from('lesson_progress').upsert(
        { user_id: prof.supabaseId, lesson_key: key, watched_at: new Date().toISOString() },
        { onConflict: 'user_id,lesson_key' }
      ))
  }
}

export function unmarkWatched(programId, subjectId, topicId, lessonId) {
  if (!isSignedIn()) return
  const p = getProgress(), key = `${programId}/${subjectId}/${topicId}/${lessonId}`
  delete p[key]
  lsSet(KEYS.PROGRESS, p)
  if (isGlobalAccount()) {
    const sb = getSupabase(); const prof = getProfile()
    if (sb && prof?.supabaseId)
      fg(sb.from('lesson_progress').delete().eq('user_id', prof.supabaseId).eq('lesson_key', key))
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

// ── Watch position (resume playback) — synced ─────────────────────────
function getWatchPositions() { return ls(WATCH_POS_KEY, {}) }

export function saveWatchProgress(lessonKey, pct, posSeconds) {
  if (!isSignedIn() || !lessonKey) return
  const all = getWatchPositions()
  all[lessonKey] = { pct, pos: posSeconds, savedAt: Date.now() }
  lsSet(WATCH_POS_KEY, all)
  if (isGlobalAccount()) {
    const sb = getSupabase(); const prof = getProfile()
    if (sb && prof?.supabaseId)
      fg(sb.from('watch_positions').upsert(
        { user_id: prof.supabaseId, lesson_key: lessonKey, pct, pos_seconds: posSeconds, saved_at: new Date().toISOString() },
        { onConflict: 'user_id,lesson_key' }
      ))
  }
}

export function getWatchProgress(lessonKey) {
  if (!lessonKey) return null
  return getWatchPositions()[lessonKey] || null
}

// ── Last activity — synced ─────────────────────────────────────────────
export function setLastVisited(programId, subjectId, topicId, lessonId) {
  const val = {
    key: `${programId}/${subjectId}/${topicId}/${lessonId}`,
    savedAt: Date.now(),
  }
  lsSet(LAST_VISITED_KEY, val)
  if (isGlobalAccount()) {
    const sb = getSupabase(); const prof = getProfile()
    if (sb && prof?.supabaseId)
      fg(sb.from('user_preferences').upsert(
        { user_id: prof.supabaseId, key: 'last_visited', value: JSON.stringify(val) },
        { onConflict: 'user_id,key' }
      ))
  }
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

// ── Feed order — synced ───────────────────────────────────────────────
export function getFeedOrder() { return ls(KEYS.FEED_ORDER, []) }

export function saveFeedOrder(order) {
  lsSet(KEYS.FEED_ORDER, order)
  if (isGlobalAccount()) {
    const sb = getSupabase(); const prof = getProfile()
    if (sb && prof?.supabaseId)
      fg(sb.from('user_preferences').upsert(
        { user_id: prof.supabaseId, key: 'feed_order', value: JSON.stringify(order) },
        { onConflict: 'user_id,key' }
      ))
  }
}

// ── Certificates ──────────────────────────────────────────────────────
export function getCerts() { return ls(KEYS.CERTS, []) }
export function hasCert(programId, subjectId) {
  return getCerts().some(c =>
    (c.programId || c.program_id) === programId &&
    (c.subjectId || c.subject_id) === subjectId
  )
}
export async function issueCert(programId, subjectId, subjectName, programName, userName) {
  if (!isSignedIn()) return null

  // Return existing cert if already issued for this subject
  const certs = getCerts()
  const existing = certs.find(c =>
    (c.programId || c.program_id) === programId &&
    (c.subjectId || c.subject_id) === subjectId
  )
  if (existing) return existing

  // Build cert object and save to localStorage immediately
  const cert = {
    id:          `FEYN-${Date.now().toString(36).toUpperCase()}`,
    programId,   subjectId,
    subjectName, programName,
    userName,    issuedAt: Date.now(),
  }
  lsSet(KEYS.CERTS, [...certs, cert])

  // Sync to Supabase for global accounts
  if (isGlobalAccount()) {
    const sb = getSupabase()
    if (!sb) {
      console.warn('[Feyn] issueCert: Supabase client unavailable')
      return cert
    }

    // Explicitly verify the session is active before inserting.
    // Supabase v2 restores the session async from localStorage — if the
    // client was just created, getSession() forces that restoration.
    const { data: sessionData, error: sessionError } = await sb.auth.getSession()
    if (sessionError || !sessionData?.session) {
      console.error('[Feyn] issueCert: no active session — cert saved locally only', sessionError)
      return cert
    }

    const { error } = await sb.from('certificates').insert({
      user_id:      sessionData.session.user.id,
      id:           cert.id,
      program_id:   cert.programId,
      subject_id:   cert.subjectId,
      program_name: cert.programName,
      subject_name: cert.subjectName,
      user_name:    cert.userName,
      issued_at:    new Date(cert.issuedAt).toISOString(),
    })

    if (error) {
      // Duplicate key = cert already in DB from a previous attempt. Fine.
      if (error.code === '23505') return cert
      console.error('[Feyn] issueCert: DB insert failed', error.code, error.message)
    }
  }

  return cert
}

// ── Export data ───────────────────────────────────────────────────────
export function exportAccountData() {
  return {
    profile:      getProfile(),
    enrolled:     getEnrolled(),
    progress:     getProgress(),
    watchPositions: getWatchPositions(),
    feedOrder:    getFeedOrder(),
    certs:        getCerts(),
    exportedAt:   new Date().toISOString(),
  }
}

// ── Compat shim ───────────────────────────────────────────────────────
export async function signIn(opts) {
  return signInLocal({ name: opts.name || '', username: opts.username || '' })
}
