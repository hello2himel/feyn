// ============================================================
// AuthFlow — sign in/up + YouTube-style onboarding
//
// Modes:
//   local signup  — name + username. No network.
//   global signup — name + username + email + password.
//   global signin — email + password.
//   interests     — onboarding grade/courses/interests
//   upgrade       — local user adding email+pass to go global
// ============================================================

import { useState, useEffect, useMemo } from 'react'
import {
  signInLocal, signUpGlobal, signInGlobal,
  setOnboarded, enroll, saveFeedOrder,
} from '../lib/userStore'
import { isSupabaseAvailable } from '../lib/supabase'
import { getClasses, getInterests } from '../data/courseHelpers'

// ── Grade card ────────────────────────────────────────────────────────
const GRADE_ORDER = ['primary', 'jsc', 'ssc', 'hsc']
const GRADE_ICONS = { primary: 'ri-seedling-line', jsc: 'ri-school-line', ssc: 'ri-building-4-line', hsc: 'ri-graduation-cap-line' }

function GradeCard({ program, selected, onSelect }) {
  return (
    <button type="button" className={`grade-card ${selected ? 'grade-card--selected' : ''}`} onClick={onSelect}>
      <i className={GRADE_ICONS[program.id] || 'ri-book-open-line'} />
      <span className="grade-card__name">{program.name}</span>
      <span className="grade-card__desc">{program.description?.split('—')[0].trim()}</span>
      {selected && <span className="grade-card__check"><i className="ri-check-fill" /></span>}
    </button>
  )
}

// ── Interest tile ─────────────────────────────────────────────────────
function InterestCard({ subject, selected, onToggle }) {
  const firstVid = subject.topics?.[0]?.lessons?.[0]?.videoId
  const hasThumb = firstVid && firstVid !== 'YOUTUBE_ID_HERE'
  return (
    <button type="button" className={`interest-card ${selected ? 'interest-card--selected' : ''}`} onClick={onToggle}>
      <div className="interest-card__bg">
        {hasThumb
          ? <img src={`https://i.ytimg.com/vi/${firstVid}/mqdefault.jpg`} alt="" onError={e => { e.target.style.display = 'none' }} />
          : <div className="interest-card__gradient" />}
        <div className="interest-card__overlay" />
      </div>
      <i className={`${subject.icon || 'ri-book-open-line'} interest-card__icon`} />
      <span className="interest-card__label">{subject.name}</span>
      {selected && <span className="interest-card__check"><i className="ri-check-line" /></span>}
    </button>
  )
}

// ── Field component ───────────────────────────────────────────────────
function Field({ label, optional, children, error }) {
  return (
    <div className="authflow-field">
      <label className="authflow-label">
        {label} {optional && <span className="authflow-label__opt">(optional)</span>}
      </label>
      {children}
      {error && (
        <p className="authflow-field-error">
          <i className="ri-error-warning-line" /> {error}
        </p>
      )}
    </div>
  )
}

// ── Main ──────────────────────────────────────────────────────────────
export default function AuthFlow({ programs, onComplete, initialMode = 'auth' }) {
  const supabaseOn = isSupabaseAvailable()

  // Auth screen state
  const [mode, setMode]     = useState(initialMode)
  const [authTab, setAuthTab] = useState('signup')
  const [isGlobal, setIsGlobal] = useState(false)
  const [animOut, setAnimOut]   = useState(false)
  const [loading, setLoading]   = useState(false)
  const [globalSuccess, setGlobalSuccess] = useState(null) // 'verify' | null

  // Form fields
  const [name, setName]         = useState('')
  const [username, setUsername] = useState('')
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [showPass, setShowPass] = useState(false)

  // Per-field errors
  const [errors, setErrors] = useState({})

  // Onboarding state
  const [selectedGrade, setSelectedGrade]   = useState(null)
  const [selectedCourses, setSelectedCourses]   = useState(new Set())
  const [selectedInterests, setSelectedInterests] = useState(new Set())
  const [interestFilter, setInterestFilter] = useState('all')

  const classes   = getClasses()
  const interests = getInterests()

  const sortedClasses = useMemo(() =>
    [...classes].sort((a, b) => {
      const ai = GRADE_ORDER.indexOf(a.id), bi = GRADE_ORDER.indexOf(b.id)
      return (ai < 0 ? 99 : ai) - (bi < 0 ? 99 : bi)
    })
  , [])

  const gradeProgram = selectedGrade && selectedGrade !== 'none'
    ? classes.find(p => p.id === selectedGrade) : null

  const allInterests = interests.flatMap(p => p.subjects.map(s => ({ program: p, subject: s })))
  const filteredInterests = interestFilter === 'all' ? allInterests
    : allInterests.filter(x => x.program.id === interestFilter)

  function transition(next) {
    setAnimOut(true)
    setTimeout(() => { setAnimOut(false); setMode(next) }, 220)
  }

  function setError(field, msg) {
    setErrors(prev => ({ ...prev, [field]: msg }))
  }
  function clearError(field) {
    setErrors(prev => { const n = { ...prev }; delete n[field]; return n })
  }
  function clearAllErrors() { setErrors({}) }

  // ── Submit auth ────────────────────────────────────────────────────
  async function handleAuth(e) {
    e.preventDefault()
    clearAllErrors()

    // Validation
    let hasError = false
    if (authTab === 'signup' && !name.trim()) {
      setError('name', 'Please enter your name.')
      hasError = true
    }
    if (isGlobal || authTab === 'signin') {
      if (!email.trim() || !email.includes('@')) { setError('email', 'Enter a valid email address.'); hasError = true }
      if (!password || password.length < 6)       { setError('password', 'Password must be at least 6 characters.'); hasError = true }
    }
    if (hasError) return

    setLoading(true)

    if (authTab === 'signin') {
      // Global sign in
      const res = await signInGlobal({ email, password })
      setLoading(false)
      if (!res.ok) {
        if (res.field) setError(res.field, res.error)
        else setError('general', res.error)
        return
      }
      transition('grade')
    } else if (isGlobal) {
      // Global sign up
      const res = await signUpGlobal({ name, username, email, password })
      setLoading(false)
      if (!res.ok) {
        if (res.field) setError(res.field, res.error)
        else setError('general', res.error)
        return
      }
      if (res.needsVerify) {
        setGlobalSuccess('verify')
        return
      }
      transition('grade')
    } else {
      // Local sign up
      signInLocal({ name: name.trim(), username: username.trim() })
      setLoading(false)
      transition('grade')
    }
  }

  // ── Onboarding navigation ──────────────────────────────────────────
  function handleGradeNext() {
    if (!selectedGrade) return
    if (selectedGrade === 'none' || !gradeProgram) transition('interests')
    else transition('courses')
  }

  function toggleCourse(pId, sId) {
    const key = `${pId}/${sId}`
    setSelectedCourses(prev => { const n = new Set(prev); n.has(key) ? n.delete(key) : n.add(key); return n })
  }
  function toggleInterest(pId, sId) {
    const key = `${pId}/${sId}`
    setSelectedInterests(prev => { const n = new Set(prev); n.has(key) ? n.delete(key) : n.add(key); return n })
  }

  function handleFinish() {
    const order = []
    for (const key of selectedCourses) {
      const [pId, sId] = key.split('/')
      enroll(pId, sId)
      order.push({ type: 'class', programId: pId, subjectId: sId })
    }
    for (const key of selectedInterests) {
      const [pId, sId] = key.split('/')
      enroll(pId, sId)
      order.push({ type: 'genre', programId: pId, subjectId: sId })
    }
    saveFeedOrder(order)
    setOnboarded()
    transition('done')
  }

  function skipOnboarding() { setOnboarded(); onComplete() }

  useEffect(() => {
    if (mode === 'done') setTimeout(() => onComplete(), 700)
  }, [mode])

  const totalSelected = selectedCourses.size + selectedInterests.size
  const isWide = ['grade', 'courses', 'interests'].includes(mode)

  return (
    <div className="authflow-overlay" onClick={e => e.target === e.currentTarget && mode !== 'done' && onComplete()}>
      <div className={`authflow-modal ${animOut ? 'authflow-modal--out' : ''} ${isWide ? 'authflow-modal--wide' : ''}`}>

        {/* ── EMAIL VERIFY SCREEN ── */}
        {globalSuccess === 'verify' && (
          <div className="authflow-panel">
            <div className="authflow-verify">
              <div className="authflow-verify__icon">
                <i className="ri-mail-check-line" />
              </div>
              <h2 className="authflow-verify__title">Check your inbox</h2>
              <p className="authflow-verify__body">
                We sent a confirmation link to
              </p>
              <p className="authflow-verify__email">{email}</p>
              <p className="authflow-verify__body">
                Click the link in that email to activate your account. It may take a minute or two.
              </p>

              <div className="authflow-verify__steps">
                {[
                  { icon: 'ri-mail-open-line', text: 'Open the email from Feyn' },
                  { icon: 'ri-cursor-line',    text: 'Click the confirmation link' },
                  { icon: 'ri-login-box-line', text: 'Come back here and sign in' },
                ].map((s, i) => (
                  <div key={i} className="authflow-verify__step">
                    <span className="authflow-verify__step-num">{i + 1}</span>
                    <i className={s.icon} />
                    <span>{s.text}</span>
                  </div>
                ))}
              </div>

              <button className="authflow-submit" style={{ marginTop: 8 }} onClick={() => {
                setGlobalSuccess(null)
                setAuthTab('signin')
                clearAllErrors()
              }}>
                I've confirmed — sign me in <i className="ri-arrow-right-line" />
              </button>

              <p className="authflow-verify__trouble">
                Didn't get the email? Check your spam folder, or{' '}
                <button
                  type="button"
                  className="authflow-verify__retry"
                  onClick={() => {
                    setGlobalSuccess(null)
                    clearAllErrors()
                  }}
                >
                  try a different email
                </button>.
              </p>

              <div className="authflow-verify__note">
                <i className="ri-information-line" />
                <p>
                  The confirmation link will redirect you to this site. Make sure the link in the email
                  goes to <strong>{typeof window !== 'undefined' ? window.location.origin : 'feyn.netlify.app'}</strong>.
                  If it says localhost, your Supabase redirect URL needs to be updated in your Supabase dashboard under
                  Authentication &gt; URL Configuration.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* ── AUTH SCREEN ── */}
        {mode === 'auth' && !globalSuccess && (
          <div className="authflow-panel">
            <div className="authflow-brand">
              <i className="ri-play-circle-fill authflow-brand__icon" />
              <span className="authflow-brand__name">Feyn</span>
            </div>

            {/* Tabs */}
            <div className="authflow-tabs">
              <button className={`authflow-tab ${authTab === 'signup' ? 'authflow-tab--active' : ''}`}
                onClick={() => { setAuthTab('signup'); clearAllErrors() }}>
                Create account
              </button>
              <button className={`authflow-tab ${authTab === 'signin' ? 'authflow-tab--active' : ''}`}
                onClick={() => { setAuthTab('signin'); clearAllErrors() }}>
                Sign in
              </button>
            </div>

            <form onSubmit={handleAuth} className="authflow-form">

              {/* General error */}
              {errors.general && (
                <p className="authflow-error"><i className="ri-error-warning-line" /> {errors.general}</p>
              )}

              {/* Name — signup only */}
              {authTab === 'signup' && (
                <Field label="Your name" error={errors.name}>
                  <input
                    className={`authflow-input ${errors.name ? 'authflow-input--error' : ''}`}
                    placeholder="e.g. Himel"
                    value={name}
                    onChange={e => { setName(e.target.value); clearError('name') }}
                    autoFocus
                  />
                </Field>
              )}

              {/* Username — signup only, local or global */}
              {authTab === 'signup' && (
                <Field label="Username" optional error={errors.username}>
                  <div className={`authflow-input-prefix-wrap ${errors.username ? 'authflow-input-prefix-wrap--error' : ''}`}>
                    <span className="authflow-input-prefix">@</span>
                    <input
                      className="authflow-input authflow-input--prefixed"
                      placeholder="username"
                      value={username}
                      onChange={e => { setUsername(e.target.value.replace(/\s/g, '')); clearError('username') }}
                    />
                  </div>
                </Field>
              )}

              {/* Email — global or signin */}
              {(isGlobal || authTab === 'signin') && (
                <Field label="Email" error={errors.email}>
                  <input
                    className={`authflow-input ${errors.email ? 'authflow-input--error' : ''}`}
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={e => { setEmail(e.target.value); clearError('email') }}
                    autoFocus={authTab === 'signin'}
                  />
                </Field>
              )}

              {/* Password — global or signin */}
              {(isGlobal || authTab === 'signin') && (
                <Field
                  label={authTab === 'signin' ? 'Password' : 'Create a password'}
                  error={errors.password}
                >
                  <div className="authflow-pass-wrap">
                    <input
                      className={`authflow-input authflow-input--pass ${errors.password ? 'authflow-input--error' : ''}`}
                      type={showPass ? 'text' : 'password'}
                      placeholder={authTab === 'signin' ? 'Your password' : 'Min. 6 characters'}
                      value={password}
                      onChange={e => { setPassword(e.target.value); clearError('password') }}
                    />
                    <button
                      type="button"
                      className="authflow-pass-toggle"
                      onClick={() => setShowPass(s => !s)}
                      aria-label={showPass ? 'Hide password' : 'Show password'}
                    >
                      <i className={showPass ? 'ri-eye-off-line' : 'ri-eye-line'} />
                    </button>
                  </div>
                </Field>
              )}

              <button type="submit" className="authflow-submit" disabled={loading}>
                {loading
                  ? <><i className="ri-loader-4-line" style={{ animation: 'spin 1s linear infinite' }} /> Working</>
                  : <>{authTab === 'signup' ? 'Create account' : 'Sign in'} <i className="ri-arrow-right-line" /></>}
              </button>
            </form>

            {/* Disclaimer changes based on account type */}
            <p className="authflow-disclaimer">
              {isGlobal
                ? 'Your progress syncs across all your devices.'
                : 'Your data stays on this device only.'}
            </p>

            {/* Account type pill toggle */}
            {supabaseOn && authTab === 'signup' && (
              <div className="authflow-type-toggle">
                <button
                  type="button"
                  className={`authflow-type-pill ${!isGlobal ? 'active' : ''}`}
                  onClick={() => { setIsGlobal(false); clearAllErrors() }}
                >
                  <i className="ri-hard-drive-line" />
                  Local
                </button>
                <button
                  type="button"
                  className={`authflow-type-pill ${isGlobal ? 'active' : ''}`}
                  onClick={() => { setIsGlobal(true); clearAllErrors() }}
                >
                  <i className="ri-cloud-line" />
                  Global
                </button>
              </div>
            )}

            <button className="authflow-guest" onClick={onComplete}>
              Continue as guest <i className="ri-arrow-right-s-line" />
            </button>
          </div>
        )}

        {/* ── GRADE PICKER ── */}
        {mode === 'grade' && (
          <div className="authflow-panel authflow-panel--wide">
            <button className="authflow-skip-interests" onClick={skipOnboarding}>Skip <i className="ri-skip-forward-line" /></button>
            <div className="authflow-ob-header">
              <div className="authflow-ob-step">1 of 3</div>
              <h2 className="authflow-ob-title">What class are you in?</h2>
              <p className="authflow-ob-sub">We'll suggest the right courses for you.</p>
            </div>
            <div className="grade-grid">
              {sortedClasses.map(p => (
                <GradeCard key={p.id} program={p} selected={selectedGrade === p.id} onSelect={() => setSelectedGrade(p.id)} />
              ))}
              <button type="button"
                className={`grade-card grade-card--none ${selectedGrade === 'none' ? 'grade-card--selected' : ''}`}
                onClick={() => setSelectedGrade('none')}
              >
                <i className="ri-user-smile-line" />
                <span className="grade-card__name">Not a student</span>
                <span className="grade-card__desc">/ Not applicable</span>
                {selectedGrade === 'none' && <span className="grade-card__check"><i className="ri-check-fill" /></span>}
              </button>
            </div>
            <div className="authflow-interests-footer">
              <button className="authflow-submit" disabled={!selectedGrade} onClick={handleGradeNext} style={{ maxWidth: 320, margin: '0 auto' }}>
                Continue <i className="ri-arrow-right-line" />
              </button>
            </div>
          </div>
        )}

        {/* ── COURSE PICKER ── */}
        {mode === 'courses' && gradeProgram && (
          <div className="authflow-panel authflow-panel--wide">
            <button className="authflow-skip-interests" onClick={() => transition('interests')}>Skip <i className="ri-skip-forward-line" /></button>
            <div className="authflow-ob-header">
              <div className="authflow-ob-step">2 of 3</div>
              <h2 className="authflow-ob-title">Pick your {gradeProgram.name} courses</h2>
              <p className="authflow-ob-sub">Select what you study. You can change this anytime in Settings.</p>
            </div>
            <div className="interest-grid" style={{ padding: '16px 32px' }}>
              {gradeProgram.subjects.map(subject => {
                const sel = selectedCourses.has(`${gradeProgram.id}/${subject.id}`)
                return (
                  <button key={subject.id} type="button"
                    className={`interest-card ${sel ? 'interest-card--selected' : ''}`}
                    onClick={() => toggleCourse(gradeProgram.id, subject.id)}
                  >
                    <div className="interest-card__bg">
                      {subject.topics[0]?.lessons[0]?.videoId
                        ? <img src={`https://i.ytimg.com/vi/${subject.topics[0].lessons[0].videoId}/mqdefault.jpg`} alt="" onError={e => { e.target.style.display = 'none' }} />
                        : <div className="interest-card__gradient" />}
                      <div className="interest-card__overlay" />
                    </div>
                    <i className={`${subject.icon || 'ri-book-open-line'} interest-card__icon`} />
                    <span className="interest-card__label">{subject.name}</span>
                    {subject.certificate && <span className="interest-card__cert"><i className="ri-medal-line" /></span>}
                    {sel && <span className="interest-card__check"><i className="ri-check-line" /></span>}
                  </button>
                )
              })}
            </div>
            <div className="authflow-interests-footer">
              <button className="authflow-submit" onClick={() => transition('interests')} style={{ maxWidth: 320, margin: '0 auto' }}>
                {selectedCourses.size > 0 ? `${selectedCourses.size} selected, Next` : 'Next'} <i className="ri-arrow-right-line" />
              </button>
            </div>
          </div>
        )}

        {/* ── INTERESTS ── */}
        {mode === 'interests' && (
          <div className="authflow-panel authflow-panel--wide">
            <button className="authflow-skip-interests" onClick={handleFinish}>
              {totalSelected > 0 ? 'Done' : 'Skip'} <i className="ri-skip-forward-line" />
            </button>
            <div className="authflow-ob-header">
              <div className="authflow-ob-step">{selectedGrade === 'none' ? '1 of 1' : '3 of 3'}</div>
              <h2 className="authflow-ob-title">Any other interests?</h2>
              <p className="authflow-ob-sub">Music, tech, art, languages, pick anything you're curious about.</p>
            </div>
            <div className="authflow-filter-tabs">
              <button className={`authflow-filter-tab ${interestFilter === 'all' ? 'authflow-filter-tab--active' : ''}`} onClick={() => setInterestFilter('all')}>All</button>
              {interests.map(p => (
                <button key={p.id} className={`authflow-filter-tab ${interestFilter === p.id ? 'authflow-filter-tab--active' : ''}`} onClick={() => setInterestFilter(p.id)}>{p.name}</button>
              ))}
              {selectedInterests.size > 0 && <span className="authflow-selected-count">{selectedInterests.size} selected</span>}
            </div>
            <div className="interest-grid">
              {filteredInterests.map(({ program, subject }) => (
                <InterestCard
                  key={`${program.id}/${subject.id}`}
                  subject={subject}
                  selected={selectedInterests.has(`${program.id}/${subject.id}`)}
                  onToggle={() => toggleInterest(program.id, subject.id)}
                />
              ))}
            </div>
            <div className="authflow-interests-footer">
              <button className="authflow-submit" onClick={handleFinish} style={{ maxWidth: 320, margin: '0 auto' }}>
                {totalSelected > 0 ? `Done, ${totalSelected} selected` : 'Finish'} <i className="ri-check-line" />
              </button>
            </div>
          </div>
        )}

        {/* ── DONE ── */}
        {mode === 'done' && (
          <div className="authflow-panel authflow-panel--center">
            <div className="authflow-done-icon"><i className="ri-checkbox-circle-line" /></div>
            <h2 className="authflow-done-title">You're all set!</h2>
            <p className="authflow-done-sub">Your personalised feed is ready.</p>
          </div>
        )}

      </div>
    </div>
  )
}
