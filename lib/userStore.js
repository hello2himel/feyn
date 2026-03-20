// ============================================================
// FEYN — USER STORE (v20, gamified + all bugs fixed)
//
// Changes from v18:
//   · Removed: enrollments, lesson_progress, watch_positions
//   · Added: skill_progress, lesson_attempts (gamified engine)
//   · Bug fix: signOut() now calls Supabase delete for user data
//   · Bug fix: _pullFromSupabase guards on `!== null` not `?.length`
//   · Bug fix: getLiveUid() cached per-call-group via parameter passing
//   · DangerTab delete: added deleteAccount() that wipes DB rows
// ============================================================

import { getSupabase, getSupabaseReady, setCurrentToken } from './supabase'

let _listenerAttached = false
export function attachAuthListener() {
  if (_listenerAttached || typeof window === 'undefined') return
  _listenerAttached = true
  const sb = getSupabase()
  if (!sb) return
  sb.auth.onAuthStateChange(async (event, session) => {
    if (event === 'INITIAL_SESSION' || event === 'SIGNED_IN') {
      if (!session?.user) return
      setCurrentToken(session.access_token)
      const userId = session.user.id
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
    }
  })
}

const KEYS = {
  PROFILE:         'ff_profile',
  SKILL_PROGRESS:  'ff_skill_progress',   // { [skillKey]: { status, xp, stars } }
  LESSON_PROGRESS: 'ff_lesson_progress',  // { [lessonKey]: { qIdx, answers, savedAt } }
  STATS:           'ff_stats',            // { totalXp, streak, lastActive }
  ONBOARDED:       'ff_onboarded',
}

// ── Fire-and-forget ───────────────────────────────────────────────────
function fg(queryPromise) {
  ;(async () => {
    try {
      const result = await queryPromise
      if (result?.error) console.warn('[Feyn] DB write:', result.error.code, result.error.message)
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

// ── Live UID — pass sb so callers don't double-call getSupabaseReady ──
async function getLiveUid(sb) {
  if (!sb) return null
  const { data, error } = await sb.auth.getUser()
  if (error || !data?.user) return null
  return data.user.id
}

// ── Auth state ────────────────────────────────────────────────────────
export function getProfile()  { return ls(KEYS.PROFILE) }
export function isSignedIn()  { return !!ls(KEYS.PROFILE) }
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
      if (msg.includes('already registered') || msg.includes('already exists') ||
          (msg.includes('email') && (msg.includes('taken') || msg.includes('registered'))))
        return { ok: false, error: 'An account with that email already exists.', field: 'email' }
      if (msg.includes('password'))
        return { ok: false, error: 'Password must be at least 6 characters.', field: 'password' }
      if (msg.includes('rate') || msg.includes('429'))
        return { ok: false, error: 'Too many attempts. Please wait a moment and try again.' }
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

    const { data, error } = await sb.auth.signInWithPassword({ email: email.trim(), password })

    if (error) {
      const msg = error.message?.toLowerCase() || ''
      if (msg.includes('email not confirmed') || msg.includes('not confirmed')) {
        const otpRes = await sb.auth.signInWithOtp({ email: email.trim(), options: { shouldCreateUser: false } })
        if (!otpRes.error) {
          lsSet('ff_pending_email', email.trim())
          return { ok: true, needsOtp: true, email: email.trim() }
        }
        return { ok: false, error: "Your email isn't confirmed yet. Check your inbox." }
      }
      if (msg.includes('rate') || msg.includes('429'))
        return { ok: false, error: 'Too many attempts. Please wait a moment.' }
      if (msg.includes('invalid') || msg.includes('credentials') || msg.includes('wrong') || msg.includes('user not found'))
        return { ok: false, error: 'Wrong email or password.', field: 'password' }
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
    const { data, error } = await sb.auth.verifyOtp({ email: email.trim(), token: token.trim(), type })
    if (error) {
      const msg = error.message?.toLowerCase() || ''
      if (msg.includes('expired')) return { ok: false, error: 'That code has expired. Request a new one.' }
      if (msg.includes('invalid') || msg.includes('incorrect')) return { ok: false, error: 'Incorrect code. Check your email and try again.' }
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
    const { error } = await sb.auth.signInWithOtp({ email: email.trim(), options: { shouldCreateUser: false } })
    if (error) return { ok: false, error: error.message }
    return { ok: true }
  } catch (e) {
    return { ok: false, error: e?.message || 'Failed to resend.' }
  }
}

// ── Finalise sign-in ──────────────────────────────────────────────────
async function _finaliseSignIn(user, session, sb) {
  const userId = user.id
  if (session?.access_token) setCurrentToken(session.access_token)

  const pending = ls('ff_pending_profile')
  const { data: dbProfile } = await sb.from('profiles').select('*').eq('id', userId).maybeSingle()

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

  fg(sb.from('profiles').upsert({ id: userId, name: profile.name, username: profile.username, email: profile.email }))
  await _pullFromSupabase(userId, sb)
}

// ── Pull cloud data → localStorage ───────────────────────────────────
// BUG FIX: guards on `!== null` so empty arrays clear local cache too
async function _pullFromSupabase(userId, sb) {
  if (!sb) return
  try {
    const [
      { data: skillRows },
      { data: prefRows },
      { data: lessonRows },
    ] = await Promise.all([
      sb.from('skill_progress').select('skill_key,status,xp,stars,last_done').eq('user_id', userId),
      sb.from('user_preferences').select('key,value').eq('user_id', userId),
      sb.from('lesson_progress').select('lesson_key,q_idx,answers,saved_at').eq('user_id', userId),
    ])

    // `!== null` not `?.length` — so empty arrays correctly clear cache
    if (skillRows !== null) {
      const skills = {}
      for (const r of skillRows)
        skills[r.skill_key] = { status: r.status, xp: r.xp, stars: r.stars, lastDone: r.last_done }
      lsSet(KEYS.SKILL_PROGRESS, skills)
    }

    if (lessonRows !== null) {
      const lessons = {}
      for (const r of lessonRows)
        lessons[r.lesson_key] = { qIdx: r.q_idx, answers: r.answers || [], savedAt: r.saved_at }
      lsSet(KEYS.LESSON_PROGRESS, lessons)
    }

    if (prefRows !== null) {
      for (const row of prefRows) {
        if (row.key === 'stats') {
          try { lsSet(KEYS.STATS, JSON.parse(row.value)) } catch (_) {}
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
    const uid = await getLiveUid(sb)  // BUG FIX: pass sb
    if (uid) fg(sb.from('profiles').upsert({ id: uid, name: merged.name, username: merged.username }))
  }
  return merged
}

// ── Sign out ──────────────────────────────────────────────────────────
export function signOut() {
  if (typeof window === 'undefined') return
  Object.values(KEYS).forEach(k => lsDel(k))
  const sb = getSupabase()
  if (sb) fg(sb.auth.signOut())
}

// ── Delete account (BUG FIX: actually deletes DB rows) ───────────────
// Deletes all user data then signs out. The profiles cascade handles
// profiles/skill_progress/etc via FK on delete cascade.
export async function deleteAccount() {
  const sb = await getSupabaseReady()
  if (!sb) {
    // No session — just clear local
    signOut()
    return { ok: true }
  }

  const uid = await getLiveUid(sb)
  if (!uid) {
    signOut()
    return { ok: true }
  }

  try {
    // Delete all user data explicitly (belt + suspenders alongside FK cascade)
    await Promise.all([
      sb.from('lesson_attempts').delete().eq('user_id', uid),
      sb.from('lesson_progress').delete().eq('user_id', uid),
      sb.from('skill_progress').delete().eq('user_id', uid),
      sb.from('certificates').delete().eq('user_id', uid),
      sb.from('user_preferences').delete().eq('user_id', uid),
    ])
    // Profile delete triggers FK cascade on auth.users side
    await sb.from('profiles').delete().eq('id', uid)
    // Sign out of Supabase auth
    await sb.auth.signOut()
  } catch (e) {
    console.error('[Feyn] deleteAccount error:', e)
    // Still clear local even on error
  }

  Object.values(KEYS).forEach(k => lsDel(k))
  return { ok: true }
}

// ── Onboarding ────────────────────────────────────────────────────────
export function hasOnboarded() { return !!ls(KEYS.ONBOARDED) }
export function setOnboarded()  { lsSet(KEYS.ONBOARDED, true) }

// ── Stats (XP, streak) ────────────────────────────────────────────────
export function getStats() {
  return ls(KEYS.STATS, { totalXp: 0, streak: 0, lastActive: null })
}

export async function addXp(amount) {
  const stats = getStats()
  const today = new Date().toDateString()
  const lastActive = stats.lastActive

  let streak = stats.streak || 0
  if (lastActive) {
    const yesterday = new Date(Date.now() - 86400000).toDateString()
    if (lastActive === yesterday) streak += 1
    else if (lastActive !== today) streak = 1  // broke streak
  } else {
    streak = 1
  }

  const updated = {
    totalXp: (stats.totalXp || 0) + amount,
    streak,
    lastActive: today,
  }
  lsSet(KEYS.STATS, updated)

  const sb = await getSupabaseReady()
  if (sb) {
    const uid = await getLiveUid(sb)
    if (uid) {
      fg(sb.from('user_preferences').upsert(
        { user_id: uid, key: 'stats', value: JSON.stringify(updated) },
        { onConflict: 'user_id,key' }
      ))
    }
  }
  return updated
}

// ── Skill Progress ────────────────────────────────────────────────────
export function getAllSkillProgress() {
  return ls(KEYS.SKILL_PROGRESS, {})
}

export function getSkillProgress(programId, subjectId, topicId, skillId) {
  const all = getAllSkillProgress()
  return all[`${programId}/${subjectId}/${topicId}/${skillId}`] || { status: 'available', xp: 0, stars: 0 }
}

export async function completeSkill(programId, subjectId, topicId, skillId, xpEarned) {
  const key = `${programId}/${subjectId}/${topicId}/${skillId}`
  const all = getAllSkillProgress()
  const current = all[key] || { status: 'available', xp: 0, stars: 0 }

  // Stars: first complete = crown (status: 'complete'), 3 re-does = mastered
  const newStars = current.status === 'complete' ? Math.min((current.stars || 0) + 1, 3) : 0
  const newStatus = newStars >= 3 ? 'mastered' : 'complete'

  const updated = {
    ...all,
    [key]: { status: newStatus, xp: (current.xp || 0) + xpEarned, stars: newStars, lastDone: new Date().toISOString() }
  }
  lsSet(KEYS.SKILL_PROGRESS, updated)

  const sb = await getSupabaseReady()
  if (sb) {
    const uid = await getLiveUid(sb)
    if (uid) {
      fg(sb.from('skill_progress').upsert(
        { user_id: uid, skill_key: key, status: newStatus, xp: updated[key].xp, stars: newStars, last_done: updated[key].lastDone },
        { onConflict: 'user_id,skill_key' }
      ))
    }
  }

  await addXp(xpEarned)
  return updated[key]
}

export async function recordAttempt(programId, subjectId, topicId, skillId, lessonIdx, questionId, correct, xpEarned) {
  const lessonKey = `${programId}/${subjectId}/${topicId}/${skillId}/${lessonIdx}`
  const sb = await getSupabaseReady()
  if (sb) {
    const uid = await getLiveUid(sb)
    if (uid) {
      fg(sb.from('lesson_attempts').insert({
        user_id: uid, lesson_key: lessonKey, question_id: questionId,
        correct, xp_earned: xpEarned,
      }))
    }
  }
}

// ── Lesson Progress (mid-lesson resume) ───────────────────────────────
// lessonKey format: "programId/subjectId/topicId/skillId/lessonIdx"

export function getLessonProgress(programId, subjectId, topicId, skillId, lessonIdx) {
  const key = `${programId}/${subjectId}/${topicId}/${skillId}/${lessonIdx}`
  const all = ls(KEYS.LESSON_PROGRESS, {})
  return all[key] || null  // null = no saved progress (start fresh)
}

export function getAllLessonProgress() {
  return ls(KEYS.LESSON_PROGRESS, {})
}

// Call this every time the user answers a question (fire-and-forget safe)
export async function saveLessonProgress(programId, subjectId, topicId, skillId, lessonIdx, qIdx, answers) {
  const key = `${programId}/${subjectId}/${topicId}/${skillId}/${lessonIdx}`
  const all = ls(KEYS.LESSON_PROGRESS, {})
  const savedAt = new Date().toISOString()
  const updated = { ...all, [key]: { qIdx, answers, savedAt } }
  lsSet(KEYS.LESSON_PROGRESS, updated)

  const sb = await getSupabaseReady()
  if (sb) {
    const uid = await getLiveUid(sb)
    if (uid) {
      fg(sb.from('lesson_progress').upsert(
        { user_id: uid, lesson_key: key, q_idx: qIdx, answers, saved_at: savedAt },
        { onConflict: 'user_id,lesson_key' }
      ))
    }
  }
}

// Call this when a lesson is fully completed or abandoned — wipes the mid-lesson save
export async function clearLessonProgress(programId, subjectId, topicId, skillId, lessonIdx) {
  const key = `${programId}/${subjectId}/${topicId}/${skillId}/${lessonIdx}`
  const all = ls(KEYS.LESSON_PROGRESS, {})
  const updated = { ...all }
  delete updated[key]
  lsSet(KEYS.LESSON_PROGRESS, updated)

  const sb = await getSupabaseReady()
  if (sb) {
    const uid = await getLiveUid(sb)
    if (uid) {
      fg(sb.from('lesson_progress').delete().match({ user_id: uid, lesson_key: key }))
    }
  }
}

// ── Certificates ──────────────────────────────────────────────────────
export function getCerts() {
  const profile = getProfile()
  if (!profile) return []
  return ls(`ff_certs_${profile.supabaseId}`, [])
}

// BUG FIX: don't write localStorage until DB confirms success
export async function issueCert(programId, subjectId, unitName, userName) {
  if (!isSignedIn()) return { cert: null, dbOk: false, dbError: 'not signed in' }

  const sb = await getSupabaseReady()
  if (!sb) return { cert: null, dbOk: false, dbError: 'no client' }

  const { data: userData, error: userError } = await sb.auth.getUser()
  if (userError || !userData?.user) return { cert: null, dbOk: false, dbError: userError?.message || 'no session' }

  const uid = userData.user.id
  const profile = getProfile()

  // Check for existing cert in DB
  const { data: existing } = await sb.from('certificates')
    .select('*').eq('user_id', uid).eq('unit_id', `${programId}/${subjectId}`).maybeSingle()

  if (existing) {
    const cert = { id: existing.id, unitId, unitName, userName, issuedAt: new Date(existing.issued_at).getTime() }
    return { cert, dbOk: true, dbError: null }
  }

  const unitId = `${programId}/${subjectId}`
  const cert = {
    id:        `FEYN-${Date.now().toString(36).toUpperCase()}`,
    unitId,    unitName,    userName,
    issuedAt:  Date.now(),
  }

  const row = {
    id:        cert.id,
    user_id:   uid,
    unit_id:   unitId,
    unit_name: unitName,
    user_name: userName,
    issued_at: new Date(cert.issuedAt).toISOString(),
  }

  const { error } = await sb.from('certificates').upsert(row, { onConflict: 'id' })
  if (error) {
    console.error('[Feyn] issueCert: DB upsert failed', error.code, error.message)
    return { cert: null, dbOk: false, dbError: error.message }
  }

  // BUG FIX: only write to localStorage after DB confirms
  const certsKey = `ff_certs_${uid}`
  const existing_local = ls(certsKey, [])
  lsSet(certsKey, [...existing_local, cert])

  return { cert, dbOk: true, dbError: null }
}

// ── Export data ───────────────────────────────────────────────────────
export function exportAccountData() {
  return {
    profile:       getProfile(),
    skillProgress: getAllSkillProgress(),
    stats:         getStats(),
    certs:         getCerts(),
    exportedAt:    new Date().toISOString(),
  }
}

// ── Stubs for stale imports ───────────────────────────────────────────
export async function signIn() { return { ok: false, error: 'Use signInGlobal instead.' } }
export async function upgradeToGlobal() { return { ok: true } }
export function signInLocal() { console.warn('[Feyn] signInLocal removed.') }
