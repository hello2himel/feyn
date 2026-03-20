// ============================================================
// FEYN — USER STORE  (v19 — Supabase-unified)
//
// ALL accounts are Supabase accounts. Local account mode is removed.
//
// UID SOURCE OF TRUTH:
//   Always obtained from sb.auth.getUser() (live JWT verified by
//   Supabase). Never read from localStorage. This makes every DB
//   call's user_id match auth.uid() in RLS policies — no 403s.
//
// localStorage usage (cache only — never authoritative for UID):
//   ff_profile        — display name/username/email cache
//   ff_progress       — lesson progress cache
//   ff_enrolled       — enrollments cache
//   ff_certs          — certificates cache
//   ff_feed_order     — feed order cache
//   ff_watch_pos      — watch positions cache
//   ff_last_visited   — last visited lesson cache
//   ff_onboarded      — per-device onboarding flag (intentionally local)
//
// NO MORE:
//   ff_account_type   — removed. All accounts are Supabase.
//   ff_pending_*      — cleaned up after sign-in finalise.
//   ff_upgrade_*      — removed. No local→global migration path.
//   supabaseId in DB  — UID always from getUser(), not cache.
// ============================================================

import { getSupabase, getSupabaseReady, setCurrentToken } from './supabase'

// ── Auth state listener (page reload + cross-tab sync) ────────────────
// Attach once at module scope — NOT inside useEffect — so it's registered
// before INITIAL_SESSION fires (which happens during getSession() at
// getSupabase() call time, before React mounts).
let _listenerAttached = false
export function attachAuthListener() {
  if (_listenerAttached || typeof window === 'undefined') return
  _listenerAttached = true
  const sb = getSupabase()
  if (!sb) return
  sb.auth.onAuthStateChange(async (event, session) => {
    if (event === 'INITIAL_SESSION' || event === 'SIGNED_IN') {
      if (!session?.user) return

      // Set token FIRST — before any DB call.
      setCurrentToken(session.access_token)

      const userId = session.user.id

      // Rebuild ff_profile from DB if missing or stale
      const cached = ls(KEYS.PROFILE)
      if (!cached || cached.supabaseId !== userId) {
        const { data: dbProfile } = await sb
          .from('profiles').select('*').eq('id', userId).maybeSingle()
        if (dbProfile) {
          lsSet(KEYS.PROFILE, {
            name:       dbProfile.name || session.user.user_metadata?.name || 'User',
            username:   dbProfile.username || '',
            email:      session.user.email,
            supabaseId: userId,
            createdAt:  new Date(session.user.created_at).getTime(),
            updatedAt:  Date.now(),
            global:     true,
          })
        }
      }

      await _pullFromSupabase(userId, sb)

    } else if (event === 'SIGNED_OUT') {
      setCurrentToken(null)
      Object.values(KEYS).forEach(k => lsDel(k))
      lsDel(WATCH_POS_KEY)
      lsDel(LAST_VISITED_KEY)
    }
  })
}

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
function fg(queryPromise) {
  ;(async () => {
    try {
      const result = await queryPromise
      if (result?.error) {
        console.warn('[Feyn] DB write error:', result.error.code, result.error.message)
      }
    } catch (e) {
      console.warn('[Feyn] DB write exception:', e?.message)
    }
  })()
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

// ── Get the live UID from Supabase session ────────────────────────────
// This is the ONLY correct UID for DB calls. auth.uid() in RLS
// policies matches this — never the cached supabaseId in ff_profile.
async function getLiveUid() {
  const sb = await getSupabaseReady()
  if (!sb) return null
  const { data, error } = await sb.auth.getUser()
  if (error || !data?.user) return null
  return data.user.id
}

// ── Auth state ────────────────────────────────────────────────────────
export function getProfile()  { return ls(KEYS.PROFILE) }
export function isSignedIn()  { return !!ls(KEYS.PROFILE) }

// Backwards compat — all signed-in accounts are global
export function isGlobalAccount() { return isSignedIn() }
export function getAccountType()  { return isSignedIn() ? 'global' : 'local' }

// ── Sign-up ───────────────────────────────────────────────────────────
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

    if (data.session) {
      await _finaliseSignIn(data.user, data.session, sb)
      return { ok: true, needsOtp: false }
    }

    lsSet('ff_pending_profile', {
      name: name.trim(),
      username: (username || '').trim(),
      email: email.trim(),
    })
    return { ok: true, needsOtp: true, email: email.trim() }

  } catch (e) {
    return { ok: false, error: e?.message || 'Something went wrong. Please try again.' }
  }
}

// ── Sign-in ───────────────────────────────────────────────────────────
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

  if (session?.access_token) setCurrentToken(session.access_token)

  const pending = ls('ff_pending_profile')

  const { data: dbProfile } = await sb
    .from('profiles').select('*').eq('id', userId).maybeSingle()

  const profile = {
    name:       pending?.name || dbProfile?.name || user.user_metadata?.name || 'User',
    username:   pending?.username || dbProfile?.username || user.user_metadata?.username || '',
    email:      user.email,
    supabaseId: userId,
    createdAt:  new Date(user.created_at).getTime(),
    updatedAt:  Date.now(),
    global:     true,
  }

  lsSet(KEYS.PROFILE, profile)
  lsDel('ff_pending_profile')
  lsDel('ff_pending_email')

  fg(sb.from('profiles').upsert({
    id: userId, name: profile.name, username: profile.username, email: profile.email,
  }))

  await _pullFromSupabase(userId, sb)
}

// ── Pull all synced data from Supabase → localStorage cache ───────────
async function _pullFromSupabase(userId, sb) {
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

// ── Save profile ──────────────────────────────────────────────────────
export async function saveProfile(data) {
  if (!isSignedIn()) return null
  const merged = { ...getProfile(), ...data, updatedAt: Date.now() }
  lsSet(KEYS.PROFILE, merged)
  const sb = await getSupabaseReady()
  if (sb) {
    const uid = await getLiveUid()
    if (uid) fg(sb.from('profiles').upsert({ id: uid, name: merged.name, username: merged.username }))
  }
  return merged
}

// ── Sign out ──────────────────────────────────────────────────────────
export function signOut() {
  if (typeof window === 'undefined') return
  Object.values(KEYS).forEach(k => lsDel(k))
  lsDel(WATCH_POS_KEY)
  lsDel(LAST_VISITED_KEY)
  lsDel('ff_pending_profile')
  lsDel('ff_pending_email')
  const sb = getSupabase()
  if (sb) fg(sb.auth.signOut())
}

// ── Onboarding ────────────────────────────────────────────────────────
export function hasOnboarded() { return !!ls(KEYS.ONBOARDED) }
export function setOnboarded()  { lsSet(KEYS.ONBOARDED, true) }

// ── Enrollment ────────────────────────────────────────────────────────
export function getEnrolled()                    { return ls(KEYS.ENROLLED, []) }
export function isEnrolled(programId, subjectId) { return getEnrolled().includes(`${programId}/${subjectId}`) }

export async function enroll(programId, subjectId) {
  if (!isSignedIn()) return
  const list = getEnrolled(), key = `${programId}/${subjectId}`
  if (!list.includes(key)) {
    lsSet(KEYS.ENROLLED, [...list, key])
    const sb = await getSupabaseReady()
    if (sb) {
      const uid = await getLiveUid()
      if (uid)
        fg(sb.from('enrollments').upsert(
          { user_id: uid, subject_key: key },
          { onConflict: 'user_id,subject_key' }
        ))
    }
  }
}

export async function unenroll(programId, subjectId) {
  if (!isSignedIn()) return
  const key = `${programId}/${subjectId}`
  lsSet(KEYS.ENROLLED, getEnrolled().filter(k => k !== key))
  const sb = await getSupabaseReady()
  if (sb) {
    const uid = await getLiveUid()
    if (uid)
      fg(sb.from('enrollments').delete().eq('user_id', uid).eq('subject_key', key))
  }
}

// ── Progress ──────────────────────────────────────────────────────────
export function getProgress() { return ls(KEYS.PROGRESS, {}) }

export async function markWatched(programId, subjectId, topicId, lessonId) {
  if (!isSignedIn()) return
  const p = getProgress(), key = `${programId}/${subjectId}/${topicId}/${lessonId}`
  p[key] = { watchedAt: Date.now() }
  lsSet(KEYS.PROGRESS, p)
  const sb = await getSupabaseReady()
  if (sb) {
    const uid = await getLiveUid()
    if (uid)
      fg(sb.from('lesson_progress').upsert(
        { user_id: uid, lesson_key: key, watched_at: new Date().toISOString() },
        { onConflict: 'user_id,lesson_key' }
      ))
  }
}

export async function unmarkWatched(programId, subjectId, topicId, lessonId) {
  if (!isSignedIn()) return
  const p = getProgress(), key = `${programId}/${subjectId}/${topicId}/${lessonId}`
  delete p[key]
  lsSet(KEYS.PROGRESS, p)
  const sb = await getSupabaseReady()
  if (sb) {
    const uid = await getLiveUid()
    if (uid)
      fg(sb.from('lesson_progress').delete().eq('user_id', uid).eq('lesson_key', key))
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

export async function saveWatchProgress(lessonKey, pct, posSeconds) {
  if (!isSignedIn() || !lessonKey) return
  const all = getWatchPositions()
  all[lessonKey] = { pct, pos: posSeconds, savedAt: Date.now() }
  lsSet(WATCH_POS_KEY, all)
  const sb = await getSupabaseReady()
  if (sb) {
    const uid = await getLiveUid()
    if (uid)
      fg(sb.from('watch_positions').upsert(
        { user_id: uid, lesson_key: lessonKey, pct, pos_seconds: posSeconds, saved_at: new Date().toISOString() },
        { onConflict: 'user_id,lesson_key' }
      ))
  }
}

export function getWatchProgress(lessonKey) {
  if (!lessonKey) return null
  return getWatchPositions()[lessonKey] || null
}

// ── Last activity ─────────────────────────────────────────────────────
export async function setLastVisited(programId, subjectId, topicId, lessonId) {
  const val = { key: `${programId}/${subjectId}/${topicId}/${lessonId}`, savedAt: Date.now() }
  lsSet(LAST_VISITED_KEY, val)
  const sb = await getSupabaseReady()
  if (sb) {
    const uid = await getLiveUid()
    if (uid)
      fg(sb.from('user_preferences').upsert(
        { user_id: uid, key: 'last_visited', value: JSON.stringify(val) },
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

// ── Feed order ────────────────────────────────────────────────────────
export function getFeedOrder() { return ls(KEYS.FEED_ORDER, []) }

export async function saveFeedOrder(order) {
  lsSet(KEYS.FEED_ORDER, order)
  const sb = await getSupabaseReady()
  if (sb) {
    const uid = await getLiveUid()
    if (uid)
      fg(sb.from('user_preferences').upsert(
        { user_id: uid, key: 'feed_order', value: JSON.stringify(order) },
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
  if (!isSignedIn()) return { cert: null, dbOk: false, dbError: 'not signed in' }

  const certs    = getCerts()
  const existing = certs.find(c =>
    (c.programId || c.program_id) === programId &&
    (c.subjectId || c.subject_id) === subjectId
  )

  const cert = existing || (() => {
    const c = {
      id:          `FEYN-${Date.now().toString(36).toUpperCase()}`,
      programId,   subjectId,
      subjectName, programName,
      userName,    issuedAt: Date.now(),
    }
    lsSet(KEYS.CERTS, [...certs, c])
    return c
  })()

  const sb = await getSupabaseReady()
  if (!sb) return { cert, dbOk: false, dbError: 'no client' }

  const { data: userData, error: userError } = await sb.auth.getUser()
  if (userError || !userData?.user) {
    console.error('[Feyn] issueCert: no active session', userError)
    return { cert, dbOk: false, dbError: userError?.message || 'no session' }
  }

  const uid = userData.user.id

  const row = {
    user_id:      uid,
    id:           cert.id,
    program_id:   cert.programId   || cert.program_id,
    subject_id:   cert.subjectId   || cert.subject_id,
    program_name: cert.programName || cert.program_name,
    subject_name: cert.subjectName || cert.subject_name,
    user_name:    cert.userName    || cert.user_name,
    issued_at:    cert.issuedAt
      ? new Date(cert.issuedAt).toISOString()
      : (cert.issued_at || new Date().toISOString()),
  }

  const { error } = await sb.from('certificates').upsert(row, { onConflict: 'id' })
  if (error) {
    console.error('[Feyn] issueCert: DB upsert failed', error.code, error.message)
    return { cert, dbOk: false, dbError: error.message }
  }

  const { data: confirmed } = await sb.from('certificates').select('id').eq('id', cert.id).maybeSingle()
  return { cert, dbOk: !!confirmed, dbError: confirmed ? null : 'not found after upsert' }
}

// ── Export data ───────────────────────────────────────────────────────
export function exportAccountData() {
  return {
    profile:        getProfile(),
    enrolled:       getEnrolled(),
    progress:       getProgress(),
    watchPositions: getWatchPositions(),
    feedOrder:      getFeedOrder(),
    certs:          getCerts(),
    exportedAt:     new Date().toISOString(),
  }
}

// ── Removed — stubs for any stale imports ────────────────────────────
export async function signIn() { return { ok: false, error: 'Use signInGlobal instead.' } }
export async function upgradeToGlobal() { return { ok: true } }
export function signInLocal() { console.warn('[Feyn] signInLocal removed. Use signUpGlobal/signInGlobal.') }
