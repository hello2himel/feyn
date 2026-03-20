// ============================================================
// AuthFlow — Feyn authentication + onboarding  (v19)
//
// Flow:
//   Sign-up:  auth → otp? → class → subjects → interests → done
//   Sign-in:  auth → (otp if unconfirmed) → done
//
// Onboarding steps:
//   'class'     — pick JSC / SSC / HSC / Not a student
//   'subjects'  — pick subjects for that class (skipped if 'none')
//   'interests' — pick from genre topics (always shown, skippable)
//   'done'      — celebration, auto-advances to home
// ============================================================

import { useState, useEffect, useMemo, useRef, useCallback } from 'react'
import {
  signUpGlobal, signInGlobal, verifyOtp, resendOtp, setOnboarded,
} from '../lib/userStore'
import data from '../data/index.js'

const GRADE_ORDER = ['jsc', 'ssc', 'hsc']
const GRADE_META = {
  jsc: { label: 'JSC', sub: 'Junior School',    icon: 'ri-seedling-line' },
  ssc: { label: 'SSC', sub: 'Secondary Cert.',  icon: 'ri-school-line' },
  hsc: { label: 'HSC', sub: 'Higher Secondary', icon: 'ri-graduation-cap-line' },
}
const NON_DISMISSIBLE = ['otp', 'class', 'subjects', 'interests', 'done']
const OB_STEPS = ['class', 'subjects', 'interests']

// ── Progress dots ─────────────────────────────────────────────────────
function StepDots({ current }) {
  return (
    <div style={{ display: 'flex', gap: 5, justifyContent: 'center', marginBottom: 28 }}>
      {OB_STEPS.map((_, i) => (
        <span key={i} style={{
          height: 5, borderRadius: 3,
          background: i === current ? 'var(--accent)' : 'var(--border-2)',
          width: i === current ? 20 : 5, transition: 'all 220ms ease',
          display: 'inline-block',
        }} />
      ))}
    </div>
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

// ── OTP ───────────────────────────────────────────────────────────────
function OtpInput({ value, onChange, disabled }) {
  const inputs = useRef([])
  function handleKey(i, e) {
    if (e.key === 'Backspace' && !e.target.value && i > 0) inputs.current[i - 1]?.focus()
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
        <input key={i} ref={el => inputs.current[i] = el}
          className={`otp-box ${value[i] ? 'filled' : ''}`}
          type="text" inputMode="numeric" maxLength={1}
          value={value[i] || ''}
          onChange={e => handleInput(i, e)}
          onKeyDown={e => handleKey(i, e)}
          disabled={disabled} autoFocus={i === 0} autoComplete="one-time-code" />
      ))}
    </div>
  )
}

// ── Class card ────────────────────────────────────────────────────────
function ClassCard({ id, label, sub, icon, selected, onSelect }) {
  return (
    <button type="button" onClick={onSelect} style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      gap: 10, padding: '20px 10px',
      background: selected ? 'var(--accent-glow)' : 'var(--bg-3)',
      border: `2px solid ${selected ? 'var(--accent)' : 'var(--border-2)'}`,
      borderRadius: 'var(--radius-md)', cursor: 'pointer',
      transition: 'all 180ms ease', position: 'relative', flex: 1,
    }}>
      <div style={{
        width: 48, height: 48, borderRadius: '50%',
        background: selected ? 'var(--accent-glow)' : 'var(--bg-4)',
        border: `1.5px solid ${selected ? 'var(--accent)' : 'var(--border)'}`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: '1.4rem', color: selected ? 'var(--accent)' : 'var(--text-3)',
        transition: 'all 180ms',
      }}>
        <i className={icon} />
      </div>
      <div style={{ textAlign: 'center' }}>
        <p style={{ fontFamily: 'var(--font-serif)', fontSize: '1.05rem', color: selected ? 'var(--accent)' : 'var(--text)', marginBottom: 2 }}>{label}</p>
        <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.58rem', letterSpacing: '0.06em', color: selected ? 'var(--accent-2)' : 'var(--text-3)' }}>{sub}</p>
      </div>
      {selected && (
        <span style={{
          position: 'absolute', top: 7, right: 7,
          width: 18, height: 18, borderRadius: '50%',
          background: 'var(--accent)', color: '#0d0d0d',
          display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.65rem',
        }}><i className="ri-check-fill" /></span>
      )}
    </button>
  )
}

// ── Subject chip ──────────────────────────────────────────────────────
function SubjectChip({ subject, selected, onToggle }) {
  const topicCount = subject.topics.filter(t => t.skills.length > 0).length
  return (
    <button type="button" onClick={onToggle} style={{
      display: 'flex', alignItems: 'center', gap: 12, padding: '13px 16px',
      background: selected ? 'var(--accent-glow)' : 'var(--bg-3)',
      border: `1.5px solid ${selected ? 'var(--accent)' : 'var(--border-2)'}`,
      borderRadius: 'var(--radius-md)', cursor: 'pointer',
      transition: 'all 160ms ease', width: '100%', textAlign: 'left',
    }}>
      <div style={{
        width: 38, height: 38, borderRadius: '50%', flexShrink: 0,
        background: selected ? 'var(--accent-glow)' : 'var(--bg-4)',
        border: `1px solid ${selected ? 'var(--accent)' : 'var(--border)'}`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: '1rem', color: selected ? 'var(--accent)' : 'var(--text-3)',
      }}><i className={subject.icon || 'ri-book-open-line'} /></div>
      <div style={{ flex: 1 }}>
        <p style={{ fontSize: '0.92rem', color: 'var(--text)', marginBottom: 2 }}>{subject.name}</p>
        <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.6rem', color: 'var(--text-3)', letterSpacing: '0.05em' }}>
          {topicCount > 0 ? `${topicCount} topic${topicCount !== 1 ? 's' : ''} available` : 'Coming soon'}
        </p>
      </div>
      <span style={{
        width: 24, height: 24, borderRadius: '50%', flexShrink: 0,
        background: selected ? 'var(--accent)' : 'transparent',
        border: `1.5px solid ${selected ? 'var(--accent)' : 'var(--border-2)'}`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: '0.7rem', color: selected ? '#0d0d0d' : 'var(--text-3)',
        transition: 'all 160ms',
      }}>
        {selected ? <i className="ri-check-fill" /> : <i className="ri-add-line" />}
      </span>
    </button>
  )
}

// ── Interest tile ─────────────────────────────────────────────────────
function InterestTile({ subject, selected, onToggle }) {
  return (
    <button type="button" onClick={onToggle} style={{
      position: 'relative', borderRadius: 'var(--radius-md)', overflow: 'hidden',
      aspectRatio: '4/3', cursor: 'pointer',
      border: `2px solid ${selected ? 'var(--accent)' : 'transparent'}`,
      transition: 'all 200ms ease', background: 'var(--bg-3)',
      display: 'flex', flexDirection: 'column', alignItems: 'flex-start',
      justifyContent: 'flex-end', padding: 10,
    }}>
      <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(135deg, var(--bg-3), var(--bg-4))' }} />
      <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(0,0,0,.75) 0%, rgba(0,0,0,.1) 60%, transparent 100%)' }} />
      <i className={subject.icon || 'ri-book-open-line'} style={{
        position: 'relative', fontSize: '1.35rem',
        color: selected ? 'var(--accent)' : 'rgba(255,255,255,.85)', marginBottom: 4,
      }} />
      <span style={{ position: 'relative', fontFamily: 'var(--font-sans)', fontSize: '0.78rem', color: '#fff', lineHeight: 1.2 }}>
        {subject.name}
      </span>
      {selected && (
        <span style={{
          position: 'absolute', top: 8, right: 8,
          width: 22, height: 22, borderRadius: '50%',
          background: 'var(--accent)', color: '#000',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '0.7rem',
        }}><i className="ri-check-fill" /></span>
      )}
    </button>
  )
}

// ── Shared back button ────────────────────────────────────────────────
function BackBtn({ onClick }) {
  return (
    <button onClick={onClick} style={{
      display: 'flex', alignItems: 'center', gap: 4,
      fontFamily: 'var(--font-mono)', fontSize: '0.68rem', letterSpacing: '0.08em',
      textTransform: 'uppercase', color: 'var(--text-3)',
      background: 'none', border: 'none', cursor: 'pointer',
    }}>
      <i className="ri-arrow-left-s-line" /> Back
    </button>
  )
}

// ── Main ──────────────────────────────────────────────────────────────
export default function AuthFlow({ onComplete, initialMode = 'auth' }) {
  const [mode, setMode]       = useState(initialMode)
  const [authTab, setAuthTab] = useState('signup')
  const [animOut, setAnimOut] = useState(false)
  const [loading, setLoading] = useState(false)
  const [isSignUp, setIsSignUp] = useState(true)

  // Auth fields
  const [name, setName]         = useState('')
  const [username, setUsername] = useState('')
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [errors, setErrors]     = useState({})

  // OTP
  const [otpEmail, setOtpEmail]             = useState('')
  const [otpCode, setOtpCode]               = useState('')
  const [otpError, setOtpError]             = useState('')
  const [otpLoading, setOtpLoading]         = useState(false)
  const [resendCooldown, setResendCooldown] = useState(0)

  // Onboarding
  const [selectedClass, setSelectedClass]         = useState(null)
  const [selectedSubjects, setSelectedSubjects]   = useState(new Set())
  const [selectedInterests, setSelectedInterests] = useState(new Set())

  const classes    = data.programs.filter(p => p.type === 'class')
  const genreProgs = data.programs.filter(p => p.type === 'genre')

  const sortedClasses = useMemo(() =>
    [...classes].sort((a, b) => {
      const ai = GRADE_ORDER.indexOf(a.id), bi = GRADE_ORDER.indexOf(b.id)
      return (ai < 0 ? 99 : ai) - (bi < 0 ? 99 : bi)
    })
  , [classes])

  const classProgram = selectedClass && selectedClass !== 'none'
    ? classes.find(p => p.id === selectedClass) : null

  const allInterestSubjects = genreProgs.flatMap(p =>
    p.subjects.map(s => ({ programId: p.id, subject: s }))
  )

  // Resend cooldown
  useEffect(() => {
    if (resendCooldown <= 0) return
    const t = setTimeout(() => setResendCooldown(c => c - 1), 1000)
    return () => clearTimeout(t)
  }, [resendCooldown])

  // Auto-advance done screen
  useEffect(() => {
    if (mode === 'done') setTimeout(() => onComplete(), 1400)
  }, [mode, onComplete])

  function transition(next) {
    setAnimOut(true)
    setTimeout(() => { setAnimOut(false); setMode(next) }, 200)
  }

  function setErr(f, m) { setErrors(p => ({ ...p, [f]: m })) }
  function clearErr(f)  { setErrors(p => { const n = { ...p }; delete n[f]; return n }) }
  function clearErrs()  { setErrors({}) }

  function toggleSubject(pId, sId) {
    const key = `${pId}/${sId}`
    setSelectedSubjects(prev => { const n = new Set(prev); n.has(key) ? n.delete(key) : n.add(key); return n })
  }
  function toggleInterest(pId, sId) {
    const key = `${pId}/${sId}`
    setSelectedInterests(prev => { const n = new Set(prev); n.has(key) ? n.delete(key) : n.add(key); return n })
  }
  function finish() { setOnboarded(); transition('done') }
  function skipAll() { setOnboarded(); onComplete() }

  // ── Auth submit ────────────────────────────────────────────────────
  async function handleAuth(e) {
    e.preventDefault(); clearErrs()
    let hasErr = false
    if (authTab === 'signup' && !name.trim())     { setErr('name', 'Please enter your name.'); hasErr = true }
    if (!email.trim() || !email.includes('@'))    { setErr('email', 'Enter a valid email.'); hasErr = true }
    if (!password || password.length < 6)         { setErr('password', 'Min. 6 characters.'); hasErr = true }
    if (hasErr) return
    setLoading(true)
    if (authTab === 'signin') {
      const res = await signInGlobal({ email, password })
      setLoading(false)
      if (!res.ok) { res.field ? setErr(res.field, res.error) : setErr('general', res.error); return }
      if (res.needsOtp) { setOtpEmail(res.email || email); setIsSignUp(false); transition('otp') }
      else onComplete()
    } else {
      const res = await signUpGlobal({ name, username, email, password })
      setLoading(false)
      if (!res.ok) { res.field ? setErr(res.field, res.error) : setErr('general', res.error); return }
      if (res.needsOtp) { setOtpEmail(res.email || email); setIsSignUp(true); transition('otp') }
      else transition('class')
    }
  }

  // ── OTP submit ─────────────────────────────────────────────────────
  const handleOtp = useCallback(async (e) => {
    e?.preventDefault()
    if (otpCode.length !== 6) { setOtpError('Enter the full 6-digit code.'); return }
    setOtpLoading(true); setOtpError('')
    const res = await verifyOtp({ email: otpEmail, token: otpCode })
    setOtpLoading(false)
    if (!res.ok) { setOtpError(res.error); return }
    if (isSignUp) transition('class')
    else onComplete()
  }, [otpCode, otpEmail, isSignUp, onComplete])

  useEffect(() => {
    if (otpCode.length === 6 && mode === 'otp') handleOtp()
  }, [otpCode, mode, handleOtp])

  async function handleResend() {
    if (resendCooldown > 0) return
    setOtpError(''); setOtpCode('')
    const res = await resendOtp(otpEmail)
    if (res.ok) setResendCooldown(30)
    else setOtpError(res.error)
  }

  function handleOverlayClick(e) {
    if (e.target !== e.currentTarget) return
    if (NON_DISMISSIBLE.includes(mode)) return
    onComplete()
  }

  const isWide = ['subjects', 'interests'].includes(mode)

  return (
    <div className="authflow-overlay" onClick={handleOverlayClick}>
      <div className={`authflow-modal ${animOut ? 'authflow-modal--out' : ''} ${isWide ? 'authflow-modal--wide' : ''}`}>

        {/* ══ AUTH ══════════════════════════════════════════════════ */}
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
                    placeholder="e.g. Aryan" value={name}
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
              <Field label="Email" error={errors.email}>
                <input className={`authflow-input ${errors.email ? 'authflow-input--error' : ''}`}
                  type="email" placeholder="you@example.com" value={email}
                  onChange={e => { setEmail(e.target.value); clearErr('email') }}
                  autoFocus={authTab === 'signin'} />
              </Field>
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
                  ? <><i className="ri-loader-4-line" style={{ animation: 'spin 1s linear infinite' }} /> Working…</>
                  : <>{authTab === 'signup' ? 'Create account' : 'Sign in'} <i className="ri-arrow-right-line" /></>}
              </button>
            </form>
            <p className="authflow-disclaimer">Your progress syncs across all your devices.</p>
            <button className="authflow-guest" onClick={onComplete}>
              Continue as guest <i className="ri-arrow-right-s-line" />
            </button>
          </div>
        )}

        {/* ══ OTP ═══════════════════════════════════════════════════ */}
        {mode === 'otp' && (
          <div className="authflow-panel">
            <div className="authflow-verify">
              <div className="authflow-verify__icon"><i className="ri-secure-payment-line" /></div>
              <h2 className="authflow-verify__title">Check your email</h2>
              <p className="authflow-verify__body">We sent a 6-digit code to</p>
              <p className="authflow-verify__email">{otpEmail}</p>
              <p className="authflow-verify__body">Enter it below — expires in 10 minutes.</p>
              <form onSubmit={handleOtp} style={{ marginTop: 20 }}>
                <OtpInput value={otpCode} onChange={v => { setOtpCode(v); setOtpError('') }} disabled={otpLoading} />
                {otpError && (
                  <p className="authflow-error" style={{ marginTop: 12 }}>
                    <i className="ri-error-warning-line" /> {otpError}
                  </p>
                )}
                <button type="submit" className="authflow-submit"
                  disabled={otpLoading || otpCode.length < 6} style={{ marginTop: 16 }}>
                  {otpLoading
                    ? <><i className="ri-loader-4-line" style={{ animation: 'spin 1s linear infinite' }} /> Verifying…</>
                    : <>Verify <i className="ri-check-line" /></>}
                </button>
              </form>
              <div className="authflow-verify__resend">
                <button type="button" className="authflow-verify__retry"
                  onClick={handleResend} disabled={resendCooldown > 0}>
                  {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : 'Resend code'}
                </button>
                <span style={{ opacity: 0.4 }}> · </span>
                <button type="button" className="authflow-verify__retry"
                  onClick={() => { transition('auth'); setOtpCode(''); setOtpError('') }}>
                  Use different email
                </button>
              </div>
              <p className="authflow-verify__trouble">Check spam if you don't see it.</p>
            </div>
          </div>
        )}

        {/* ══ STEP 1 — SELECT CLASS ══════════════════════════════════ */}
        {mode === 'class' && (
          <div className="authflow-panel">
            <StepDots current={0} />

            <div style={{ textAlign: 'center', marginBottom: 28 }}>
              <p style={{
                fontFamily: 'var(--font-mono)', fontSize: '0.62rem', letterSpacing: '0.14em',
                textTransform: 'uppercase', color: 'var(--accent)', marginBottom: 10,
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
              }}>
                <i className="ri-graduation-cap-line" /> Step 1 of 3
              </p>
              <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.6rem', marginBottom: 8 }}>
                What class are you in?
              </h2>
              <p style={{ fontSize: '0.88rem', color: 'var(--text-2)', lineHeight: 1.6 }}>
                We'll build your learning path around your grade.
              </p>
            </div>

            {/* Class cards row */}
            <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
              {sortedClasses.map(p => {
                const m = GRADE_META[p.id] || { label: p.name, sub: '', icon: 'ri-book-open-line' }
                return (
                  <ClassCard key={p.id} id={p.id} label={m.label} sub={m.sub} icon={m.icon}
                    selected={selectedClass === p.id} onSelect={() => setSelectedClass(p.id)} />
                )
              })}
            </div>

            {/* Not a student row */}
            <button type="button" onClick={() => setSelectedClass('none')} style={{
              width: '100%', padding: '12px 16px', marginBottom: 24,
              display: 'flex', alignItems: 'center', gap: 12,
              background: selectedClass === 'none' ? 'var(--accent-glow)' : 'none',
              border: `1.5px solid ${selectedClass === 'none' ? 'var(--accent)' : 'var(--border-2)'}`,
              borderRadius: 'var(--radius-md)', cursor: 'pointer', transition: 'all 160ms',
            }}>
              <i className="ri-user-smile-line" style={{
                fontSize: '1.2rem', color: selectedClass === 'none' ? 'var(--accent)' : 'var(--text-3)',
              }} />
              <div style={{ textAlign: 'left', flex: 1 }}>
                <p style={{ fontSize: '0.9rem', color: selectedClass === 'none' ? 'var(--accent)' : 'var(--text)' }}>
                  Not a student
                </p>
                <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.58rem', color: 'var(--text-3)', letterSpacing: '0.06em' }}>
                  Just here to explore &amp; learn
                </p>
              </div>
              {selectedClass === 'none' && (
                <i className="ri-check-circle-fill" style={{ color: 'var(--accent)', fontSize: '1.1rem' }} />
              )}
            </button>

            <button className="authflow-submit" disabled={!selectedClass}
              onClick={() => selectedClass === 'none' ? transition('interests') : transition('subjects')}>
              Continue <i className="ri-arrow-right-line" />
            </button>

            <button className="authflow-guest" onClick={skipAll} style={{ marginTop: 10 }}>
              Skip setup <i className="ri-skip-forward-line" />
            </button>
          </div>
        )}

        {/* ══ STEP 2 — PICK SUBJECTS ════════════════════════════════ */}
        {mode === 'subjects' && classProgram && (
          <div className="authflow-panel authflow-panel--wide">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
              <BackBtn onClick={() => transition('class')} />
              <StepDots current={1} />
              <button className="authflow-skip-interests" onClick={() => transition('interests')}>
                Skip <i className="ri-skip-forward-line" />
              </button>
            </div>

            <div style={{ marginBottom: 20 }}>
              <p style={{
                fontFamily: 'var(--font-mono)', fontSize: '0.62rem', letterSpacing: '0.14em',
                textTransform: 'uppercase', color: 'var(--accent)', marginBottom: 8,
                display: 'flex', alignItems: 'center', gap: 6,
              }}>
                <i className="ri-book-open-line" /> Step 2 of 3 · {classProgram.name}
              </p>
              <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.45rem', marginBottom: 6 }}>
                Which subjects do you study?
              </h2>
              <p style={{ fontSize: '0.88rem', color: 'var(--text-2)' }}>
                Select what you take. Change this anytime.
              </p>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, overflowY: 'auto', paddingRight: 2 }}>
              {classProgram.subjects.map(subject => (
                <SubjectChip key={subject.id} subject={subject}
                  selected={selectedSubjects.has(`${classProgram.id}/${subject.id}`)}
                  onToggle={() => toggleSubject(classProgram.id, subject.id)} />
              ))}
            </div>

            <div className="authflow-interests-footer" style={{ marginTop: 20 }}>
              <button className="authflow-submit" onClick={() => transition('interests')}
                style={{ maxWidth: 340, margin: '0 auto' }}>
                {selectedSubjects.size > 0
                  ? `${selectedSubjects.size} subject${selectedSubjects.size !== 1 ? 's' : ''} selected — Next`
                  : 'Next'}
                {' '}<i className="ri-arrow-right-line" />
              </button>
            </div>
          </div>
        )}

        {/* ══ STEP 3 — INTERESTS ═══════════════════════════════════ */}
        {mode === 'interests' && (
          <div className="authflow-panel authflow-panel--wide">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
              <BackBtn onClick={() => selectedClass === 'none' ? transition('class') : transition('subjects')} />
              <StepDots current={2} />
              <button className="authflow-skip-interests" onClick={finish}>
                {selectedInterests.size > 0 ? 'Done' : 'Skip'} <i className="ri-skip-forward-line" />
              </button>
            </div>

            <div style={{ marginBottom: 16 }}>
              <p style={{
                fontFamily: 'var(--font-mono)', fontSize: '0.62rem', letterSpacing: '0.14em',
                textTransform: 'uppercase', color: 'var(--accent)', marginBottom: 8,
                display: 'flex', alignItems: 'center', gap: 6,
              }}>
                <i className="ri-compass-discover-line" /> Step 3 of 3
              </p>
              <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.45rem', marginBottom: 6 }}>
                Anything else you're curious about?
              </h2>
              <p style={{ fontSize: '0.88rem', color: 'var(--text-2)' }}>
                Astronomy, code, philosophy — pick what interests you beyond class.
              </p>
            </div>

            <div style={{
              display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))',
              gap: 10, overflowY: 'auto', paddingBottom: 4, maxHeight: 320,
            }}>
              {allInterestSubjects.map(({ programId, subject }) => (
                <InterestTile key={`${programId}/${subject.id}`} subject={subject}
                  selected={selectedInterests.has(`${programId}/${subject.id}`)}
                  onToggle={() => toggleInterest(programId, subject.id)} />
              ))}
            </div>

            <div className="authflow-interests-footer" style={{ marginTop: 16 }}>
              <button className="authflow-submit" onClick={finish}
                style={{ maxWidth: 340, margin: '0 auto' }}>
                {selectedInterests.size > 0 ? `Done — ${selectedInterests.size} selected` : 'Finish setup'}
                {' '}<i className="ri-check-line" />
              </button>
            </div>
          </div>
        )}

        {/* ══ DONE ════════════════════════════════════════════════ */}
        {mode === 'done' && (
          <div className="authflow-panel authflow-panel--center">
            <div style={{
              width: 72, height: 72, borderRadius: '50%',
              background: 'var(--success-bg)', border: '1px solid var(--success)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '2.2rem', color: 'var(--success)', marginBottom: 18,
            }}>
              <i className="ri-checkbox-circle-fill" />
            </div>
            <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.8rem', marginBottom: 8 }}>
              You're all set!
            </h2>
            <p style={{ fontSize: '0.9rem', color: 'var(--text-2)' }}>
              Your personalised learning path is ready.
            </p>
          </div>
        )}

      </div>
    </div>
  )
}
