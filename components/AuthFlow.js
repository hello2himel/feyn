// ============================================================
// AuthFlow — Feyn sign-in, sign-up and onboarding  (v19)
//
// Flow:  auth → (otp, only if the email needs confirming) → pick → done
//
// v19 changes, all in service of "ask for less":
//   · Username dropped from sign-up. It was optional, cost a round-trip
//     to check availability, and is editable in Settings — so it does
//     not belong on the first screen anyone sees.
//   · Onboarding collapsed from three steps (grade → class courses →
//     interests) to one. The grade step selected nothing that was ever
//     persisted; it only filtered the next screen's list, which is what
//     the filter row on that screen already does.
//   · Every step is skippable and says so. Nothing is a dead end.
// ============================================================

import { useState, useEffect, useMemo, useRef, useCallback } from 'react'
import {
  signUpGlobal, signInGlobal, verifyOtp, resendOtp,
  setOnboarded, enroll, saveFeedOrder,
} from '../lib/userStore'

const MIN_PASSWORD = 6
const RESEND_COOLDOWN_S = 30

// Onboarding must be completed or explicitly skipped so setOnboarded()
// always runs; only the first screen can be dismissed by the backdrop.
const DISMISSIBLE_MODES = ['auth']

// ── OTP input: 6 boxes ────────────────────────────────────────────────
function OtpInput({ value, onChange, disabled }) {
  const inputs = useRef([])

  function handleKey(i, e) {
    if (e.key === 'Backspace' && !e.target.value && i > 0) inputs.current[i - 1]?.focus()
  }
  function handleInput(i, e) {
    const char = e.target.value.replace(/\D/g, '').slice(-1)
    const arr = value.split('')
    arr[i] = char
    onChange(arr.join('').slice(0, 6))
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
          aria-label={`Digit ${i + 1} of 6`}
        />
      ))}
    </div>
  )
}

function Field({ id, label, hint, error, children }) {
  return (
    <div className="af-field">
      <label className="af-label" htmlFor={id}>{label}</label>
      {children}
      {error
        ? <p className="af-error-text" role="alert"><i className="ri-error-warning-line" aria-hidden="true" /> {error}</p>
        : hint ? <p className="af-hint">{hint}</p> : null}
    </div>
  )
}

function CourseTile({ program, subject, selected, onToggle }) {
  const vid = subject.topics?.[0]?.lessons?.[0]?.videoId
  return (
    <button
      type="button"
      className={`af-tile${selected ? ' af-tile--on' : ''}`}
      onClick={onToggle}
      aria-pressed={selected}
    >
      <span className="af-tile__thumb">
        {vid && vid !== 'YOUTUBE_ID_HERE'
          ? <img src={`https://i.ytimg.com/vi/${vid}/mqdefault.jpg`} alt="" crossOrigin="anonymous"
                 onError={e => { e.target.style.visibility = 'hidden' }} />
          : <i className={subject.icon || 'ri-book-open-line'} aria-hidden="true" />}
        {selected && <span className="af-tile__check"><i className="ri-check-line" aria-hidden="true" /></span>}
      </span>
      <span className="af-tile__name">{subject.name}</span>
      <span className="af-tile__program">{program.name}</span>
    </button>
  )
}

export default function AuthFlow({ programs = [], onComplete, initialMode = 'auth' }) {
  const [mode, setMode]       = useState(initialMode)
  const [tab, setTab]         = useState('signup')   // 'signup' | 'signin'
  const [leaving, setLeaving] = useState(false)
  const [loading, setLoading] = useState(false)
  const [errors, setErrors]   = useState({})

  const [name, setName]         = useState('')
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [showPass, setShowPass] = useState(false)

  const [otpEmail, setOtpEmail]   = useState('')
  const [otpCode, setOtpCode]     = useState('')
  const [otpError, setOtpError]   = useState('')
  const [otpBusy, setOtpBusy]     = useState(false)
  const [cooldown, setCooldown]   = useState(0)
  // Whether OTP success should continue into onboarding (new account) or
  // just close (existing account that had never confirmed its email).
  const [otpIsNewAccount, setOtpIsNewAccount] = useState(true)

  const [picked, setPicked] = useState(() => new Set())
  const [filter, setFilter] = useState('all')

  const withCourses = useMemo(() => programs.filter(p => p.subjects?.length > 0), [programs])
  const flatCourses = useMemo(
    () => withCourses.flatMap(p => p.subjects.map(s => ({ program: p, subject: s }))),
    [withCourses]
  )
  const shown = filter === 'all'
    ? flatCourses
    : flatCourses.filter(x => x.program.id === filter)

  useEffect(() => {
    if (cooldown <= 0) return
    const t = setTimeout(() => setCooldown(c => c - 1), 1000)
    return () => clearTimeout(t)
  }, [cooldown])

  // Escape closes the dismissible first screen, matching the backdrop.
  useEffect(() => {
    function onKey(e) {
      if (e.key === 'Escape' && DISMISSIBLE_MODES.includes(mode)) onComplete()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [mode, onComplete])

  function go(next) {
    setLeaving(true)
    setTimeout(() => { setLeaving(false); setMode(next) }, 180)
  }

  const setErr   = (f, m) => setErrors(p => ({ ...p, [f]: m }))
  const clearErr = f => setErrors(p => { const n = { ...p }; delete n[f]; return n })

  // ── Auth submit ────────────────────────────────────────────────────
  async function handleAuth(e) {
    e.preventDefault()
    const next = {}
    if (tab === 'signup' && !name.trim()) next.name = 'Tell us what to call you.'
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) next.email = 'That does not look like an email address.'
    if (!password || password.length < MIN_PASSWORD)
      next.password = `At least ${MIN_PASSWORD} characters.`
    setErrors(next)
    if (Object.keys(next).length) return

    setLoading(true)
    const res = tab === 'signin'
      ? await signInGlobal({ email, password })
      : await signUpGlobal({ name, email, password })
    setLoading(false)

    if (!res.ok) {
      setErrors({ [res.field || 'general']: res.error })
      return
    }

    if (res.needsOtp) {
      setOtpEmail(res.email || email)
      setOtpIsNewAccount(tab === 'signup')
      go('otp')
      return
    }

    // Signed in already. New accounts get onboarding; returning ones don't.
    if (tab === 'signup') go('pick')
    else onComplete()
  }

  // ── OTP ────────────────────────────────────────────────────────────
  const handleOtp = useCallback(async (e) => {
    e?.preventDefault()
    if (otpCode.length !== 6) { setOtpError('Enter all six digits.'); return }
    setOtpBusy(true)
    setOtpError('')
    const res = await verifyOtp({ email: otpEmail, token: otpCode })
    setOtpBusy(false)
    if (!res.ok) { setOtpError(res.error); return }
    if (otpIsNewAccount) go('pick')
    else onComplete()
  }, [otpCode, otpEmail, otpIsNewAccount, onComplete])

  useEffect(() => {
    if (otpCode.length === 6 && mode === 'otp' && !otpBusy) handleOtp()
  }, [otpCode, mode, otpBusy, handleOtp])

  async function handleResend() {
    if (cooldown > 0) return
    setOtpError('')
    setOtpCode('')
    const res = await resendOtp(otpEmail)
    if (res.ok) setCooldown(RESEND_COOLDOWN_S)
    else setOtpError(res.error)
  }

  // ── Onboarding ─────────────────────────────────────────────────────
  function toggle(programId, subjectId) {
    const key = `${programId}/${subjectId}`
    setPicked(prev => {
      const n = new Set(prev)
      n.has(key) ? n.delete(key) : n.add(key)
      return n
    })
  }

  async function finish() {
    setLoading(true)
    const order = []
    for (const key of picked) {
      const [programId, subjectId] = key.split('/')
      const program = withCourses.find(p => p.id === programId)
      await enroll(programId, subjectId)
      order.push({
        type: program?.type === 'class' ? 'class' : 'genre',
        programId,
        subjectId,
      })
    }
    if (order.length) await saveFeedOrder(order)
    setOnboarded()
    setLoading(false)
    go('done')
  }

  function skip() { setOnboarded(); onComplete() }

  useEffect(() => {
    if (mode === 'done') {
      const t = setTimeout(onComplete, 900)
      return () => clearTimeout(t)
    }
  }, [mode, onComplete])

  function onBackdrop(e) {
    if (e.target !== e.currentTarget) return
    if (!DISMISSIBLE_MODES.includes(mode)) return
    onComplete()
  }

  const wide = mode === 'pick'

  return (
    <div className="af-overlay" onClick={onBackdrop}>
      <div
        className={`af-modal${wide ? ' af-modal--wide' : ''}${leaving ? ' af-modal--leaving' : ''}`}
        role="dialog"
        aria-modal="true"
        aria-label={mode === 'pick' ? 'Choose your courses' : 'Sign in to Feyn'}
      >

        {/* ── AUTH ── */}
        {mode === 'auth' && (
          <div className="af-panel">
            <button className="af-close" onClick={onComplete} aria-label="Close">
              <i className="ri-close-line" aria-hidden="true" />
            </button>

            <h2 className="af-title">
              {tab === 'signup' ? 'Create your account' : 'Welcome back'}
            </h2>
            <p className="af-sub">
              {tab === 'signup'
                ? 'Saves your progress across devices. Takes a moment.'
                : 'Sign in to pick up where you left off.'}
            </p>

            <form onSubmit={handleAuth} className="af-form" noValidate>
              {errors.general && (
                <p className="af-error" role="alert">
                  <i className="ri-error-warning-line" aria-hidden="true" /> {errors.general}
                </p>
              )}

              {tab === 'signup' && (
                <Field id="af-name" label="Your name" error={errors.name}>
                  <input
                    id="af-name"
                    className={`af-input${errors.name ? ' af-input--bad' : ''}`}
                    value={name}
                    onChange={e => { setName(e.target.value); clearErr('name') }}
                    autoComplete="name"
                    autoFocus
                  />
                </Field>
              )}

              <Field id="af-email" label="Email" error={errors.email}>
                <input
                  id="af-email"
                  type="email"
                  className={`af-input${errors.email ? ' af-input--bad' : ''}`}
                  value={email}
                  onChange={e => { setEmail(e.target.value); clearErr('email') }}
                  autoComplete="email"
                  autoFocus={tab === 'signin'}
                />
              </Field>

              <Field
                id="af-pass"
                label="Password"
                hint={tab === 'signup' ? `At least ${MIN_PASSWORD} characters.` : undefined}
                error={errors.password}
              >
                <span className="af-pass">
                  <input
                    id="af-pass"
                    type={showPass ? 'text' : 'password'}
                    className={`af-input${errors.password ? ' af-input--bad' : ''}`}
                    value={password}
                    onChange={e => { setPassword(e.target.value); clearErr('password') }}
                    autoComplete={tab === 'signup' ? 'new-password' : 'current-password'}
                  />
                  <button
                    type="button"
                    className="af-pass__toggle"
                    onClick={() => setShowPass(s => !s)}
                    aria-label={showPass ? 'Hide password' : 'Show password'}
                  >
                    <i className={showPass ? 'ri-eye-off-line' : 'ri-eye-line'} aria-hidden="true" />
                  </button>
                </span>
              </Field>

              <button type="submit" className="af-submit" disabled={loading}>
                {loading
                  ? 'Working…'
                  : tab === 'signup' ? 'Create account' : 'Sign in'}
              </button>
            </form>

            <p className="af-switch">
              {tab === 'signup' ? 'Already have an account?' : 'New to Feyn?'}{' '}
              <button
                type="button"
                onClick={() => { setTab(tab === 'signup' ? 'signin' : 'signup'); setErrors({}) }}
              >
                {tab === 'signup' ? 'Sign in' : 'Create one'}
              </button>
            </p>

            <button className="af-later" onClick={onComplete}>
              Browse without an account
            </button>
          </div>
        )}

        {/* ── OTP ── */}
        {mode === 'otp' && (
          <div className="af-panel af-panel--center">
            <h2 className="af-title">Check your email</h2>
            <p className="af-sub">
              We sent a six-digit code to <strong className="af-email">{otpEmail}</strong>.
              It expires in ten minutes.
            </p>

            <form onSubmit={handleOtp}>
              <OtpInput value={otpCode} onChange={v => { setOtpCode(v); setOtpError('') }} disabled={otpBusy} />
              {otpError && (
                <p className="af-error" role="alert">
                  <i className="ri-error-warning-line" aria-hidden="true" /> {otpError}
                </p>
              )}
              <button type="submit" className="af-submit" disabled={otpBusy || otpCode.length < 6}>
                {otpBusy ? 'Verifying…' : 'Verify'}
              </button>
            </form>

            <p className="af-fineprint">
              <button type="button" className="af-linkbtn" onClick={handleResend} disabled={cooldown > 0}>
                {cooldown > 0 ? `Resend in ${cooldown}s` : 'Resend code'}
              </button>
              {' · '}
              <button type="button" className="af-linkbtn" onClick={() => { go('auth'); setOtpCode(''); setOtpError('') }}>
                Use a different email
              </button>
            </p>
            <p className="af-fineprint af-fineprint--quiet">Not there? Check your spam folder.</p>
          </div>
        )}

        {/* ── PICK COURSES (single onboarding step) ── */}
        {mode === 'pick' && (
          <div className="af-panel af-panel--wide">
            <div className="af-pick__head">
              <h2 className="af-title">What do you want to learn?</h2>
              <p className="af-sub">
                Pick as many as you like — they go on your home page. You can change this any time.
              </p>
            </div>

            {withCourses.length > 1 && (
              <div className="seg af-pick__filter" role="tablist" aria-label="Filter courses">
                <button
                  role="tab"
                  aria-selected={filter === 'all'}
                  className={`seg__btn${filter === 'all' ? ' seg__btn--on' : ''}`}
                  onClick={() => setFilter('all')}
                >
                  All
                </button>
                {withCourses.map(p => (
                  <button
                    key={p.id}
                    role="tab"
                    aria-selected={filter === p.id}
                    className={`seg__btn${filter === p.id ? ' seg__btn--on' : ''}`}
                    onClick={() => setFilter(p.id)}
                  >
                    {p.name}
                  </button>
                ))}
              </div>
            )}

            <div className="af-pick__body">
              {shown.length === 0 ? (
                <p className="empty-state">No courses published yet — you can skip this.</p>
              ) : (
                <div className="af-tiles">
                  {shown.map(({ program, subject }) => (
                    <CourseTile
                      key={`${program.id}/${subject.id}`}
                      program={program}
                      subject={subject}
                      selected={picked.has(`${program.id}/${subject.id}`)}
                      onToggle={() => toggle(program.id, subject.id)}
                    />
                  ))}
                </div>
              )}
            </div>

            <div className="af-pick__foot">
              <button className="af-linkbtn" onClick={skip}>Skip for now</button>
              <button className="af-submit af-submit--inline" onClick={finish} disabled={loading}>
                {loading
                  ? 'Saving…'
                  : picked.size > 0
                    ? `Continue with ${picked.size}`
                    : 'Continue'}
              </button>
            </div>
          </div>
        )}

        {/* ── DONE ── */}
        {mode === 'done' && (
          <div className="af-panel af-panel--center">
            <i className="ri-checkbox-circle-line af-done__icon" aria-hidden="true" />
            <h2 className="af-title">You're set.</h2>
            <p className="af-sub">Taking you to your courses.</p>
          </div>
        )}

      </div>
    </div>
  )
}
