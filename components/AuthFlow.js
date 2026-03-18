// ============================================================
// AuthFlow — sign in / sign up + YouTube-style onboarding
// ============================================================
// Modes:
//   'auth'       — sign in / create account screen
//   'onboarding' — interest grid (post sign-up, or triggered manually)
// ============================================================

import { useState, useEffect } from 'react'
import { signIn, setOnboarded, enroll, saveFeedOrder } from '../lib/userStore'
import { classifySubjects } from '../data/courseHelpers'

// ── Visual interest card ───────────────────────────────────────────────
function InterestCard({ program, subject, selected, onToggle }) {
  const firstVid = subject.topics?.[0]?.lessons?.[0]?.videoId
  const hasThumb = firstVid && firstVid !== 'YOUTUBE_ID_HERE'

  return (
    <button
      type="button"
      className={`interest-card ${selected ? 'interest-card--selected' : ''}`}
      onClick={onToggle}
      aria-pressed={selected}
    >
      {/* Background thumbnail or gradient */}
      <div className="interest-card__bg">
        {hasThumb ? (
          <img
            src={`https://i.ytimg.com/vi/${firstVid}/mqdefault.jpg`}
            alt=""
            onError={e => { e.target.style.display = 'none' }}
          />
        ) : (
          <div className="interest-card__gradient" />
        )}
        <div className="interest-card__overlay" />
      </div>

      {/* Icon */}
      <i className={`${subject.icon || 'ri-book-open-line'} interest-card__icon`} />

      {/* Label */}
      <span className="interest-card__label">{subject.name}</span>
      {program && (
        <span className="interest-card__program">{program.name}</span>
      )}

      {/* Check */}
      {selected && (
        <span className="interest-card__check">
          <i className="ri-check-line" />
        </span>
      )}
    </button>
  )
}

// ── Main component ─────────────────────────────────────────────────────
export default function AuthFlow({ programs, onComplete, initialMode = 'auth' }) {
  const [mode, setMode]         = useState(initialMode) // 'auth' | 'interests' | 'done'
  const [authTab, setAuthTab]   = useState('signup')    // 'signup' | 'signin'
  const [name, setName]         = useState('')
  const [username, setUsername] = useState('')
  const [error, setError]       = useState('')
  const [selected, setSelected] = useState(new Set())   // "programId/subjectId"
  const [filter, setFilter]     = useState('all')       // 'all' | 'class' | 'genre'
  const [animOut, setAnimOut]   = useState(false)

  const { classes, genres } = classifySubjects(programs)
  const allItems = [
    ...classes.map(x => ({ ...x, type: 'class' })),
    ...genres.map(x  => ({ ...x, type: 'genre' })),
  ]
  const filtered = filter === 'all' ? allItems
    : filter === 'class' ? allItems.filter(x => x.type === 'class')
    : allItems.filter(x => x.type === 'genre')

  function transition(nextMode) {
    setAnimOut(true)
    setTimeout(() => { setAnimOut(false); setMode(nextMode) }, 220)
  }

  // ── Auth submit ──────────────────────────────────────────────────────
  function handleAuth(e) {
    e.preventDefault()
    if (!name.trim()) { setError('Please enter your name.'); return }
    setError('')
    signIn({ name: name.trim(), username: username.trim() })
    transition('interests')
  }

  // ── Interest toggle ──────────────────────────────────────────────────
  function toggle(programId, subjectId) {
    const key = `${programId}/${subjectId}`
    setSelected(prev => {
      const next = new Set(prev)
      next.has(key) ? next.delete(key) : next.add(key)
      return next
    })
  }

  // ── Finish onboarding ────────────────────────────────────────────────
  function handleFinish() {
    const order = []
    for (const key of selected) {
      const [programId, subjectId] = key.split('/')
      enroll(programId, subjectId)
      const item = allItems.find(x => x.program.id === programId && x.subject.id === subjectId)
      if (item) order.push({ type: item.type, programId, subjectId })
    }
    saveFeedOrder(order)
    setOnboarded()
    transition('done')
  }

  function handleSkipInterests() {
    setOnboarded()
    setSelected(new Set())
    transition('done')
  }

  useEffect(() => {
    if (mode === 'done') {
      setTimeout(() => onComplete(), 600)
    }
  }, [mode, onComplete])

  return (
    <div className="authflow-overlay" onClick={e => e.target === e.currentTarget && mode !== 'done' && onComplete()}>
      <div className={`authflow-modal ${animOut ? 'authflow-modal--out' : ''}`}>

        {/* ── AUTH ── */}
        {mode === 'auth' && (
          <div className="authflow-panel">
            <div className="authflow-brand">
              <i className="ri-play-circle-fill authflow-brand__icon" />
              <span className="authflow-brand__name">Feyn</span>
            </div>

            <div className="authflow-tabs">
              <button
                className={`authflow-tab ${authTab === 'signup' ? 'authflow-tab--active' : ''}`}
                onClick={() => setAuthTab('signup')}
              >Create account</button>
              <button
                className={`authflow-tab ${authTab === 'signin' ? 'authflow-tab--active' : ''}`}
                onClick={() => setAuthTab('signin')}
              >Sign in</button>
            </div>

            <form onSubmit={handleAuth} className="authflow-form">
              <div className="authflow-field">
                <label className="authflow-label">
                  {authTab === 'signup' ? 'Your name' : 'Name on your account'}
                </label>
                <input
                  className="authflow-input"
                  placeholder={authTab === 'signup' ? 'e.g. Himel' : 'Enter your name'}
                  value={name}
                  onChange={e => { setName(e.target.value); setError('') }}
                  autoFocus
                />
              </div>

              {authTab === 'signup' && (
                <div className="authflow-field">
                  <label className="authflow-label">
                    Username <span className="authflow-label__opt">(optional)</span>
                  </label>
                  <div className="authflow-input-prefix-wrap">
                    <span className="authflow-input-prefix">@</span>
                    <input
                      className="authflow-input authflow-input--prefixed"
                      placeholder="username"
                      value={username}
                      onChange={e => setUsername(e.target.value.replace(/\s/g, ''))}
                    />
                  </div>
                </div>
              )}

              {error && <p className="authflow-error"><i className="ri-error-warning-line" /> {error}</p>}

              <button type="submit" className="authflow-submit">
                {authTab === 'signup' ? 'Create account' : 'Sign in'}
                <i className="ri-arrow-right-line" />
              </button>
            </form>

            <p className="authflow-disclaimer">
              Your data stays on this device. No passwords, no email required.
            </p>

            <button className="authflow-guest" onClick={onComplete}>
              Continue as guest <i className="ri-arrow-right-s-line" />
            </button>
          </div>
        )}

        {/* ── INTERESTS ── */}
        {mode === 'interests' && (
          <div className="authflow-panel authflow-panel--wide">
            <div className="authflow-interests-header">
              <div>
                <h2 className="authflow-interests-title">What do you want to learn?</h2>
                <p className="authflow-interests-sub">
                  Pick anything that interests you. You can change this anytime.
                </p>
              </div>
              <button className="authflow-skip-interests" onClick={handleSkipInterests}>
                Skip <i className="ri-skip-forward-line" />
              </button>
            </div>

            {/* Filter tabs */}
            <div className="authflow-filter-tabs">
              {[['all', 'All'], ['class', 'Classes'], ['genre', 'Interests']].map(([val, label]) => (
                <button
                  key={val}
                  className={`authflow-filter-tab ${filter === val ? 'authflow-filter-tab--active' : ''}`}
                  onClick={() => setFilter(val)}
                >{label}</button>
              ))}
              {selected.size > 0 && (
                <span className="authflow-selected-count">
                  {selected.size} selected
                </span>
              )}
            </div>

            {/* Interest grid */}
            <div className="interest-grid">
              {filtered.map(({ program, subject, type }) => (
                <InterestCard
                  key={`${program.id}/${subject.id}`}
                  program={type === 'class' ? program : null}
                  subject={subject}
                  selected={selected.has(`${program.id}/${subject.id}`)}
                  onToggle={() => toggle(program.id, subject.id)}
                />
              ))}
              {filtered.length === 0 && (
                <p style={{ gridColumn: '1/-1', padding: '40px 0', color: 'var(--text-3)', fontStyle: 'italic', textAlign: 'center' }}>
                  No content available yet.
                </p>
              )}
            </div>

            <div className="authflow-interests-footer">
              <button
                className="authflow-submit"
                disabled={selected.size === 0}
                onClick={handleFinish}
              >
                {selected.size > 0
                  ? `Done — ${selected.size} selected`
                  : 'Select at least one'}
                <i className="ri-check-line" />
              </button>
            </div>
          </div>
        )}

        {/* ── DONE ── */}
        {mode === 'done' && (
          <div className="authflow-panel authflow-panel--center">
            <div className="authflow-done-icon">
              <i className="ri-checkbox-circle-line" />
            </div>
            <h2 className="authflow-done-title">You're in!</h2>
            <p className="authflow-done-sub">Your feed is ready.</p>
          </div>
        )}

      </div>
    </div>
  )
}
