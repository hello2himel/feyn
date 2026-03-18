// ============================================================
// FEYN — AUTH + ONBOARDING
//
// AuthModal:  shown when user clicks the profile icon while guest.
//             Step 1: name + username  →  Step 2: classes  →  Step 3: interests
//
// useAuth:    hook that any component can call to get auth state
//             and open the auth modal.
//
// SignInGate: wrapper that shows "sign in to access this" UI
//             when the user is a guest.
// ============================================================

import { useState, useEffect, useCallback, createContext, useContext, useRef } from 'react'
import { signIn, signOut, isSignedIn, getProfile, hasOnboarded,
         setOnboarded, enroll, saveFeedOrder } from '../lib/userStore'
import { classifySubjects } from './Onboarding'

// ── Context ───────────────────────────────────────────────────────────
const AuthCtx = createContext(null)

export function AuthProvider({ children, programs = [] }) {
  const [profile,    setProfile]    = useState(null)
  const [onboarded,  setOnboardedSt] = useState(false)
  const [modalOpen,  setModalOpen]  = useState(false)
  const [mounted,    setMounted]    = useState(false)
  // Callback to run after successful auth (e.g. re-render feed)
  const afterAuthRef = useRef(null)

  const refresh = useCallback(() => {
    setProfile(getProfile())
    setOnboardedSt(hasOnboarded())
  }, [])

  useEffect(() => {
    setMounted(true)
    refresh()
  }, [refresh])

  function openAuth(afterAuth) {
    if (afterAuth) afterAuthRef.current = afterAuth
    setModalOpen(true)
  }

  function handleAuthComplete() {
    refresh()
    setModalOpen(false)
    const cb = afterAuthRef.current
    afterAuthRef.current = null
    if (cb) cb()
  }

  function handleSignOut() {
    signOut()
    refresh()
  }

  return (
    <AuthCtx.Provider value={{
      profile, onboarded, mounted,
      signedIn: !!profile,
      openAuth, handleSignOut, refresh,
    }}>
      {children}
      {mounted && modalOpen && (
        <AuthModal
          programs={programs}
          existingProfile={profile}
          onComplete={handleAuthComplete}
          onDismiss={() => setModalOpen(false)}
        />
      )}
    </AuthCtx.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthCtx)
  // Safe defaults for SSR / outside provider
  if (!ctx) return {
    profile: null, onboarded: false, mounted: false, signedIn: false,
    openAuth: () => {}, handleSignOut: () => {}, refresh: () => {},
  }
  return ctx
}

// ── AuthModal ─────────────────────────────────────────────────────────
// Steps: 'account' → 'classes' → 'interests' → 'done'

function AuthModal({ programs, existingProfile, onComplete, onDismiss }) {
  const isNew = !existingProfile
  const [step,     setStep]     = useState(isNew ? 'account' : 'classes')
  const [name,     setName]     = useState(existingProfile?.name || '')
  const [username, setUsername] = useState(existingProfile?.username || '')
  const [nameErr,  setNameErr]  = useState('')
  const [selCls,   setSelCls]   = useState([])
  const [selGen,   setSelGen]   = useState([])
  const [exiting,  setExiting]  = useState(false)

  const { classes, genres } = classifySubjects(programs)

  const STEPS = isNew
    ? ['account', 'classes', 'interests', 'done']
    : ['classes', 'interests', 'done']

  const stepIdx  = STEPS.indexOf(step)
  const stepFrac = stepIdx / (STEPS.length - 1)

  function exit(fn) {
    setExiting(true)
    setTimeout(() => { setExiting(false); fn() }, 220)
  }

  function goNext() { exit(() => setStep(STEPS[stepIdx + 1])) }

  function handleAccount() {
    if (!name.trim()) { setNameErr('Please enter your name'); return }
    setNameErr('')
    signIn({ name, username })
    goNext()
  }

  function toggleCls(programId, subjectId) {
    const k = `${programId}/${subjectId}`
    setSelCls(p => p.find(x => `${x.programId}/${x.subjectId}` === k)
      ? p.filter(x => `${x.programId}/${x.subjectId}` !== k)
      : [...p, { programId, subjectId }])
  }
  function toggleGen(programId, subjectId) {
    const k = `${programId}/${subjectId}`
    setSelGen(p => p.find(x => `${x.programId}/${x.subjectId}` === k)
      ? p.filter(x => `${x.programId}/${x.subjectId}` !== k)
      : [...p, { programId, subjectId }])
  }
  function isCls(pid, sid) { return !!selCls.find(x => x.programId === pid && x.subjectId === sid) }
  function isGen(pid, sid) { return !!selGen.find(x => x.programId === pid && x.subjectId === sid) }

  function finish() {
    for (const { programId, subjectId } of selCls) enroll(programId, subjectId)
    for (const { programId, subjectId } of selGen)  enroll(programId, subjectId)
    saveFeedOrder([
      ...selCls.map(x => ({ type: 'class', ...x })),
      ...selGen.map(x  => ({ type: 'genre', ...x })),
    ])
    setOnboarded()
    goNext()
  }

  function skipOnboarding() {
    setOnboarded()
    exit(onComplete)
  }

  return (
    <div className="auth-overlay" onClick={e => e.target === e.currentTarget && onDismiss()}>
      <div className={`auth-modal ${exiting ? 'auth-modal--exit' : ''}`}>

        {/* Progress bar */}
        {step !== 'done' && (
          <div className="auth-modal__progress">
            <div className="auth-modal__progress-fill" style={{ width: `${stepFrac * 100}%` }} />
          </div>
        )}

        {/* Close */}
        {step !== 'done' && (
          <button className="auth-modal__close" onClick={onDismiss} aria-label="Close">
            <i className="ri-close-line" />
          </button>
        )}

        {/* ── ACCOUNT ── */}
        {step === 'account' && (
          <div className="auth-step">
            <div className="auth-step__icon"><i className="ri-user-smile-line" /></div>
            <h2 className="auth-step__title">Create your account</h2>
            <p className="auth-step__sub">It's local for now — no email, no password. Just your name.</p>

            <div className="auth-fields">
              <div className="auth-field">
                <label className="auth-field__label">Your name <span className="auth-field__req">*</span></label>
                <input
                  className={`auth-input ${nameErr ? 'auth-input--err' : ''}`}
                  placeholder="e.g. Himel"
                  value={name}
                  onChange={e => { setName(e.target.value); setNameErr('') }}
                  onKeyDown={e => e.key === 'Enter' && handleAccount()}
                  autoFocus
                />
                {nameErr && <p className="auth-field__err"><i className="ri-error-warning-line" /> {nameErr}</p>}
              </div>
              <div className="auth-field">
                <label className="auth-field__label">Username <span className="auth-field__opt">optional</span></label>
                <input
                  className="auth-input"
                  placeholder="@username"
                  value={username}
                  onChange={e => setUsername(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleAccount()}
                />
              </div>
            </div>

            <button className="auth-btn auth-btn--primary" onClick={handleAccount}>
              Continue <i className="ri-arrow-right-line" />
            </button>
          </div>
        )}

        {/* ── CLASSES ── */}
        {step === 'classes' && (
          <div className="auth-step">
            <div className="auth-step__icon auth-step__icon--class"><i className="ri-graduation-cap-line" /></div>
            <h2 className="auth-step__title">Which class are you in?</h2>
            <p className="auth-step__sub">Select your courses. We'll build your feed around them.</p>

            {classes.length === 0
              ? <p className="auth-empty">No classes available yet.</p>
              : (
                <div className="auth-chips">
                  {classes.map(({ program, subject }) => (
                    <button
                      key={`${program.id}/${subject.id}`}
                      className={`auth-chip ${isCls(program.id, subject.id) ? 'auth-chip--sel' : ''}`}
                      onClick={() => toggleCls(program.id, subject.id)}
                    >
                      <i className={subject.icon || 'ri-book-open-line'} />
                      <span>
                        <strong>{program.name}</strong>
                        <em>{subject.name}</em>
                      </span>
                      {isCls(program.id, subject.id) && <i className="ri-check-line auth-chip__check" />}
                    </button>
                  ))}
                </div>
              )
            }

            <div className="auth-step__actions">
              <button className="auth-btn auth-btn--primary" onClick={goNext}>
                {selCls.length > 0 ? `Enrol in ${selCls.length} — Next` : 'Skip for now'}
                <i className="ri-arrow-right-line" />
              </button>
            </div>
          </div>
        )}

        {/* ── INTERESTS ── */}
        {step === 'interests' && (
          <div className="auth-step">
            <div className="auth-step__icon auth-step__icon--interest"><i className="ri-compass-discover-line" /></div>
            <h2 className="auth-step__title">What else interests you?</h2>
            <p className="auth-step__sub">Pick topics beyond your classes — music, skills, hobbies.</p>

            {genres.length === 0
              ? <p className="auth-empty">More content coming soon.</p>
              : (
                <div className="auth-chips">
                  {genres.map(({ program, subject }) => (
                    <button
                      key={`${program.id}/${subject.id}`}
                      className={`auth-chip ${isGen(program.id, subject.id) ? 'auth-chip--sel' : ''}`}
                      onClick={() => toggleGen(program.id, subject.id)}
                    >
                      <i className={subject.icon || 'ri-star-line'} />
                      <span><em>{subject.name}</em></span>
                      {isGen(program.id, subject.id) && <i className="ri-check-line auth-chip__check" />}
                    </button>
                  ))}
                </div>
              )
            }

            <div className="auth-step__actions">
              <button className="auth-btn auth-btn--primary" onClick={finish}>
                {selGen.length > 0 ? `Add ${selGen.length} — Done` : 'Finish'}
                <i className="ri-check-line" />
              </button>
              <button className="auth-btn auth-btn--ghost" onClick={skipOnboarding}>
                Skip
              </button>
            </div>
          </div>
        )}

        {/* ── DONE ── */}
        {step === 'done' && (
          <div className="auth-step auth-step--done">
            <div className="auth-step__icon auth-step__icon--done">
              <i className="ri-checkbox-circle-line" />
            </div>
            <h2 className="auth-step__title">
              {name ? `Welcome, ${name}!` : 'You\'re in!'}
            </h2>
            <p className="auth-step__sub">
              Your feed is ready.
              {selCls.length > 0 && ` Enrolled in ${selCls.length} class${selCls.length > 1 ? 'es' : ''}.`}
              {selGen.length > 0 && ` ${selGen.length} interest${selGen.length > 1 ? 's' : ''} added.`}
            </p>
            <button className="auth-btn auth-btn--primary" onClick={() => exit(onComplete)}>
              Go to my feed <i className="ri-arrow-right-line" />
            </button>
          </div>
        )}

      </div>
    </div>
  )
}

// ── SignInGate ────────────────────────────────────────────────────────
// Wrap any gated UI. Shows prompt if guest, renders children if signed in.

export function SignInGate({ children, message = 'Sign in to track your progress', compact = false }) {
  const { signedIn, openAuth } = useAuth()
  if (signedIn) return children

  if (compact) {
    return (
      <button className="signin-gate-compact" onClick={() => openAuth()}>
        <i className="ri-lock-line" /> {message}
      </button>
    )
  }

  return (
    <div className="signin-gate">
      <i className="ri-lock-2-line signin-gate__icon" />
      <p className="signin-gate__msg">{message}</p>
      <button className="btn btn--accent" onClick={() => openAuth()}>
        <i className="ri-user-line" /> Sign in
      </button>
    </div>
  )
}
