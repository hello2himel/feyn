// ============================================================
// AuthFlow — Feyn authentication + onboarding  (v18)
//
// Sign-up flow:   auth → otp → grade → courses → interests → done
// Sign-in flow:   auth → (otp if unconfirmed) → done
//
// v18 changes:
//   · Removed local account mode entirely. All accounts are Supabase.
//   · Removed Local/Global toggle — email+password always shown.
//   · Removed isGlobal state — no longer needed.
//   · signInLocal removed from imports.
// ============================================================

import { useState, useEffect, useMemo, useRef, useCallback } from 'react'
import {
  signUpGlobal, signInGlobal, verifyOtp, resendOtp,
  setOnboarded, enroll, saveFeedOrder,
} from '../lib/userStore'
import { getClasses, getInterests } from '../data/courseHelpers'

const GRADE_ORDER = ['primary', 'jsc', 'ssc', 'hsc']
const GRADE_ICONS = { primary: 'ri-seedling-line', jsc: 'ri-school-line', ssc: 'ri-building-4-line', hsc: 'ri-graduation-cap-line' }

// Modes that must NOT be dismissible by clicking the overlay backdrop.
// Auth mode IS dismissible (guest continue). Onboarding steps are NOT —
// they must be completed or explicitly skipped so setOnboarded() is called.
const NON_DISMISSIBLE_MODES = ['otp', 'grade', 'courses', 'interests', 'done']

// ── Sub-components ────────────────────────────────────────────────────
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

function InterestCard({ subject, selected, onToggle }) {
  const vid = subject.topics?.[0]?.lessons?.[0]?.videoId
  return (
    <button type="button" className={`interest-card ${selected ? 'interest-card--selected' : ''}`} onClick={onToggle}>
      <div className="interest-card__bg">
        {vid && vid !== 'YOUTUBE_ID_HERE'
          ? <img src={`https://i.ytimg.com/vi/${vid}/mqdefault.jpg`} alt="" crossOrigin="anonymous" onError={e => { e.target.style.display = 'none' }} />
          : <div className="interest-card__gradient" />}
        <div className="interest-card__overlay" />
      </div>
      <i className={`${subject.icon || 'ri-book-open-line'} interest-card__icon`} />
      <span className="interest-card__label">{subject.name}</span>
      {selected && <span className="interest-card__check"><i className="ri-check-line" /></span>}
    </button>
  )
}

function Field({ label, optional, error, children }) {
  return (
    <div className="authflow-field">
      <label className="authflow-label">
        {label}{optional && <span className="authflow-label__opt"> (optional)</span>}
      </label>
      {children}
      {error && <p className="authflow-field-error"><i className="ri-error-warning-line" /> {error}</p>}
    </div>
  )
}

// ── OTP input: 6 boxes ────────────────────────────────────────────────
function OtpInput({ value, onChange, disabled }) {
  const inputs = useRef([])

  function handleKey(i, e) {
    if (e.key === 'Backspace' && !e.target.value && i > 0) {
      inputs.current[i - 1]?.focus()
    }
  }
  function handleInput(i, e) {
    const char = e.target.value.replace(/\D/g, '').slice(-1)
    const arr = value.split('')
    arr[i] = char
    const next = arr.join('').slice(0, 6)
    onChange(next)
    if (char && i < 5) inputs.current[i + 1]?.focus()
  }
  function handlePaste(e) {
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6)
    if (pasted) { onChange(pasted); inputs.current[Math.min(pasted.length, 5)]?.focus() }
    e.preventDefault()
  }

  return (
    <div className="otp-input-row" onPaste={handlePaste}>
      {Array.from({ length: 6 }).map((_, i) => (
        <input
          key={i}
          ref={el => inputs.current[i] = el}
          className={`otp-box ${value[i] ? 'filled' : ''}`}
          type="text"
          inputMode="numeric"
          maxLength={1}
          value={value[i] || ''}
          onChange={e => handleInput(i, e)}
          onKeyDown={e => handleKey(i, e)}
          disabled={disabled}
          autoFocus={i === 0}
          autoComplete="one-time-code"
        />
      ))}
    </div>
  )
}

// ── Main ──────────────────────────────────────────────────────────────
export default function AuthFlow({ programs, onComplete, initialMode = 'auth' }) {
  const [mode, setMode]         = useState(initialMode)
  const [authTab, setAuthTab]   = useState('signup')
  const [animOut, setAnimOut]   = useState(false)
  const [loading, setLoading]   = useState(false)
  const [isSignUp, setIsSignUp] = useState(true)

  // Auth form fields
  const [name, setName]         = useState('')
  const [username, setUsername] = useState('')
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [errors, setErrors]     = useState({})

  // OTP
  const [otpEmail, setOtpEmail]         = useState('')
  const [otpCode, setOtpCode]           = useState('')
  const [otpError, setOtpError]         = useState('')
  const [otpLoading, setOtpLoading]     = useState(false)
  const [resendCooldown, setResendCooldown] = useState(0)

  // Onboarding
  const [selectedGrade, setSelectedGrade]         = useState(null)
  const [selectedCourses, setSelectedCourses]     = useState(new Set())
  const [selectedInterests, setSelectedInterests] = useState(new Set())
  const [interestFilter, setInterestFilter]       = useState('all')

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

  // Resend cooldown timer
  useEffect(() => {
    if (resendCooldown <= 0) return
    const t = setTimeout(() => setResendCooldown(c => c - 1), 1000)
    return () => clearTimeout(t)
  }, [resendCooldown])

  function transition(next) {
    setAnimOut(true)
    setTimeout(() => { setAnimOut(false); setMode(next) }, 220)
  }

  function setErr(f, m) { setErrors(p => ({ ...p, [f]: m })) }
  function clearErr(f)  { setErrors(p => { const n = { ...p }; delete n[f]; return n }) }
  function clearErrs()  { setErrors({}) }

  // ── Auth submit ────────────────────────────────────────────────────
  async function handleAuth(e) {
    e.preventDefault()
    clearErrs()

    let hasErr = false
    if (authTab === 'signup' && !name.trim()) { setErr('name', 'Please enter your name.'); hasErr = true }
    if (!email.trim() || !email.includes('@')) { setErr('email', 'Enter a valid email address.'); hasErr = true }
    if (!password || password.length < 6)       { setErr('password', 'Password must be at least 6 characters.'); hasErr = true }
    if (hasErr) return

    setLoading(true)

    if (authTab === 'signin') {
      const res = await signInGlobal({ email, password })
      setLoading(false)
      if (!res.ok) {
        if (res.field) setErr(res.field, res.error)
        else setErr('general', res.error)
        return
      }
      if (res.needsOtp) {
        setOtpEmail(res.email || email)
        setIsSignUp(false)
        transition('otp')
      } else {
        onComplete()
      }
    } else {
      const res = await signUpGlobal({ name, username, email, password })
      setLoading(false)
      if (!res.ok) {
        if (res.field) setErr(res.field, res.error)
        else setErr('general', res.error)
        return
      }
      if (res.needsOtp) {
        setOtpEmail(res.email || email)
        setIsSignUp(true)
        transition('otp')
      } else {
        // Email confirm disabled in Supabase — go straight to onboarding
        transition('grade')
      }
    }
  }

  // ── OTP submit ─────────────────────────────────────────────────────
  const handleOtp = useCallback(async (e) => {
    e?.preventDefault()
    if (otpCode.length !== 6) { setOtpError('Enter the full 6-digit code.'); return }
    setOtpLoading(true)
    setOtpError('')
    const res = await verifyOtp({ email: otpEmail, token: otpCode })
    setOtpLoading(false)
    if (!res.ok) { setOtpError(res.error); return }
    if (isSignUp) transition('grade')
    else onComplete()
  }, [otpCode, otpEmail, isSignUp, onComplete])

  // Auto-submit when 6 digits entered
  useEffect(() => {
    if (otpCode.length === 6 && mode === 'otp') handleOtp()
  }, [otpCode, mode, handleOtp])

  async function handleResend() {
    if (resendCooldown > 0) return
    setOtpError('')
    setOtpCode('')
    const res = await resendOtp(otpEmail)
    if (res.ok) {
      setResendCooldown(30)
    } else {
      setOtpError(res.error)
      // Don't start cooldown on failure so user can retry immediately
    }
  }

  // ── Onboarding ─────────────────────────────────────────────────────
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

  // ── Overlay click ─────────────────────────────────────────────────
  // FIX: only dismissible on 'auth' mode. Onboarding steps must be
  // completed or skipped explicitly — prevents half-onboarded state.
  function handleOverlayClick(e) {
    if (e.target !== e.currentTarget) return
    if (NON_DISMISSIBLE_MODES.includes(mode)) return
    onComplete()
  }

  const totalSelected = selectedCourses.size + selectedInterests.size
  const isWide = ['grade', 'courses', 'interests'].includes(mode)

  return (
    <div className="authflow-overlay" onClick={handleOverlayClick}>
      <div className={`authflow-modal ${animOut ? 'authflow-modal--out' : ''} ${isWide ? 'authflow-modal--wide' : ''}`}>

        {/* ── AUTH ── */}
        {mode === 'auth' && (
          <div className="authflow-panel">
            <div className="authflow-brand">
              <i className="ri-brain-line authflow-brand__icon" />
              <span className="authflow-brand__name">Feyn</span>
            </div>

            <div className="authflow-tabs">
              <button className={`authflow-tab ${authTab === 'signup' ? 'authflow-tab--active' : ''}`}
                onClick={() => { setAuthTab('signup'); clearErrs() }}>Create account</button>
              <button className={`authflow-tab ${authTab === 'signin' ? 'authflow-tab--active' : ''}`}
                onClick={() => { setAuthTab('signin'); clearErrs() }}>Sign in</button>
            </div>

            <form onSubmit={handleAuth} className="authflow-form">
              {errors.general && (
                <p className="authflow-error"><i className="ri-error-warning-line" /> {errors.general}</p>
              )}

              {authTab === 'signup' && (
                <Field label="Your name" error={errors.name}>
                  <input className={`authflow-input ${errors.name ? 'authflow-input--error' : ''}`}
                    placeholder="e.g. Himel" value={name}
                    onChange={e => { setName(e.target.value); clearErr('name') }} autoFocus />
                </Field>
              )}

              {authTab === 'signup' && (
                <Field label="Username" optional error={errors.username}>
                  <div className={`authflow-input-prefix-wrap ${errors.username ? 'authflow-input-prefix-wrap--error' : ''}`}>
                    <span className="authflow-input-prefix">@</span>
                    <input className="authflow-input authflow-input--prefixed" placeholder="username"
                      value={username} onChange={e => { setUsername(e.target.value.replace(/\s/g, '')); clearErr('username') }} />
                  </div>
                </Field>
              )}

              {(authTab === 'signup' || authTab === 'signin') && (
                <Field label="Email" error={errors.email}>
                  <input className={`authflow-input ${errors.email ? 'authflow-input--error' : ''}`}
                    type="email" placeholder="you@example.com" value={email}
                    onChange={e => { setEmail(e.target.value); clearErr('email') }}
                    autoFocus={authTab === 'signin'} />
                </Field>
              )}

              <Field label={authTab === 'signin' ? 'Password' : 'Create a password'} error={errors.password}>
                <div className="authflow-pass-wrap">
                  <input className={`authflow-input authflow-input--pass ${errors.password ? 'authflow-input--error' : ''}`}
                    type={showPass ? 'text' : 'password'}
                    placeholder={authTab === 'signin' ? 'Your password' : 'Min. 6 characters'}
                    value={password} onChange={e => { setPassword(e.target.value); clearErr('password') }} />
                  <button type="button" className="authflow-pass-toggle" onClick={() => setShowPass(s => !s)}>
                    <i className={showPass ? 'ri-eye-off-line' : 'ri-eye-line'} />
                  </button>
                </div>
              </Field>

              <button type="submit" className="authflow-submit" disabled={loading}>
                {loading
                  ? <><i className="ri-loader-4-line" style={{ animation: 'spin 1s linear infinite' }} /> Working</>
                  : <>{authTab === 'signup' ? 'Create account' : 'Sign in'} <i className="ri-arrow-right-line" /></>}
              </button>
            </form>

            <p className="authflow-disclaimer">
              Your progress syncs across all your devices.
            </p>

            <button className="authflow-guest" onClick={onComplete}>
              Continue as guest <i className="ri-arrow-right-s-line" />
            </button>
          </div>
        )}

        {/* ── OTP VERIFY ── */}
        {mode === 'otp' && (
          <div className="authflow-panel">
            <div className="authflow-verify">
              <div className="authflow-verify__icon"><i className="ri-secure-payment-line" /></div>
              <h2 className="authflow-verify__title">Check your email</h2>
              <p className="authflow-verify__body">We sent a 6-digit code to</p>
              <p className="authflow-verify__email">{otpEmail}</p>
              <p className="authflow-verify__body">Enter it below. It expires in 10 minutes.</p>

              <form onSubmit={handleOtp} style={{ marginTop: 20 }}>
                <OtpInput value={otpCode} onChange={v => { setOtpCode(v); setOtpError('') }} disabled={otpLoading} />
                {otpError && (
                  <p className="authflow-error" style={{ marginTop: 12 }}>
                    <i className="ri-error-warning-line" /> {otpError}
                  </p>
                )}
                <button type="submit" className="authflow-submit" disabled={otpLoading || otpCode.length < 6}
                  style={{ marginTop: 16 }}>
                  {otpLoading
                    ? <><i className="ri-loader-4-line" style={{ animation: 'spin 1s linear infinite' }} /> Verifying</>
                    : <>Verify <i className="ri-check-line" /></>}
                </button>
              </form>

              <div className="authflow-verify__resend">
                <button
                  type="button"
                  className="authflow-verify__retry"
                  onClick={handleResend}
                  disabled={resendCooldown > 0}
                >
                  {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : 'Resend code'}
                </button>
                <span style={{ opacity: 0.4 }}> · </span>
                <button type="button" className="authflow-verify__retry"
                  onClick={() => { transition('auth'); setOtpCode(''); setOtpError('') }}>
                  Use different email
                </button>
              </div>

              <p className="authflow-verify__trouble">
                Check your spam folder if you don't see it.
              </p>
            </div>
          </div>
        )}

        {/* ── GRADE PICKER ── */}
        {mode === 'grade' && (
          <div className="authflow-panel authflow-panel--wide">
            <button className="authflow-skip-interests" onClick={skipOnboarding}>
              Skip <i className="ri-skip-forward-line" />
            </button>
            <div className="authflow-ob-header">
              <div className="authflow-ob-step">1 of 3</div>
              <h2 className="authflow-ob-title">What class are you in?</h2>
              <p className="authflow-ob-sub">We'll curate your feed around your grade.</p>
            </div>
            <div className="grade-grid">
              {sortedClasses.map(p => (
                <GradeCard key={p.id} program={p} selected={selectedGrade === p.id} onSelect={() => setSelectedGrade(p.id)} />
              ))}
              <button type="button"
                className={`grade-card grade-card--none ${selectedGrade === 'none' ? 'grade-card--selected' : ''}`}
                onClick={() => setSelectedGrade('none')}>
                <i className="ri-user-smile-line" />
                <span className="grade-card__name">Not a student</span>
                <span className="grade-card__desc">Just here to explore</span>
                {selectedGrade === 'none' && <span className="grade-card__check"><i className="ri-check-fill" /></span>}
              </button>
            </div>
            <div className="authflow-interests-footer">
              <button className="authflow-submit" disabled={!selectedGrade} onClick={handleGradeNext}
                style={{ maxWidth: 320, margin: '0 auto' }}>
                Continue <i className="ri-arrow-right-line" />
              </button>
            </div>
          </div>
        )}

        {/* ── COURSE PICKER ── */}

        {mode === 'courses' && gradeProgram && (
          <div className="authflow-panel authflow-panel--wide">
            <button className="authflow-skip-interests" onClick={() => transition('interests')}>
              Skip <i className="ri-skip-forward-line" />
            </button>
            <div className="authflow-ob-header">
              <div className="authflow-ob-step">2 of 3</div>
              <h2 className="authflow-ob-title">Pick your {gradeProgram.name} courses</h2>
              <p className="authflow-ob-sub">Select what you study. Change this anytime in Settings.</p>
            </div>
            <div className="interest-grid" style={{ padding: '16px 32px' }}>
              {gradeProgram.subjects.map(subject => {
                const sel = selectedCourses.has(`${gradeProgram.id}/${subject.id}`)
                const vid = subject.topics[0]?.lessons[0]?.videoId
                return (
                  <button key={subject.id} type="button"
                    className={`interest-card ${sel ? 'interest-card--selected' : ''}`}
                    onClick={() => toggleCourse(gradeProgram.id, subject.id)}>
                    <div className="interest-card__bg">
                      {vid
                        ? <img src={`https://i.ytimg.com/vi/${vid}/mqdefault.jpg`} alt="" crossOrigin="anonymous" onError={e => { e.target.style.display = 'none' }} />
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
              <button className="authflow-submit" onClick={() => transition('interests')}
                style={{ maxWidth: 320, margin: '0 auto' }}>
                {selectedCourses.size > 0 ? `${selectedCourses.size} selected — Next` : 'Next'} <i className="ri-arrow-right-line" />
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
              <p className="authflow-ob-sub">Music, tech, art, languages. Pick anything you're curious about.</p>
            </div>
            <div className="authflow-filter-tabs">
              <button className={`authflow-filter-tab ${interestFilter === 'all' ? 'authflow-filter-tab--active' : ''}`}
                onClick={() => setInterestFilter('all')}>All</button>
              {interests.map(p => (
                <button key={p.id} className={`authflow-filter-tab ${interestFilter === p.id ? 'authflow-filter-tab--active' : ''}`}
                  onClick={() => setInterestFilter(p.id)}>{p.name}</button>
              ))}
              {selectedInterests.size > 0 && (
                <span className="authflow-selected-count">{selectedInterests.size} selected</span>
              )}
            </div>
            <div className="interest-grid">
              {filteredInterests.map(({ program, subject }) => (
                <InterestCard key={`${program.id}/${subject.id}`} subject={subject}
                  selected={selectedInterests.has(`${program.id}/${subject.id}`)}
                  onToggle={() => toggleInterest(program.id, subject.id)} />
              ))}
            </div>
            <div className="authflow-interests-footer">
              <button className="authflow-submit" onClick={handleFinish}
                style={{ maxWidth: 320, margin: '0 auto' }}>
                {totalSelected > 0 ? `Done — ${totalSelected} selected` : 'Finish'} <i className="ri-check-line" />
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
