// ============================================================
// AuthFlow — sign in/up + YouTube-style onboarding
// Steps: auth → pick grade/class → pick courses → interests → done
// ============================================================

import { useState, useEffect, useMemo } from 'react'
import { signIn, setOnboarded, enroll, saveFeedOrder } from '../lib/userStore'
import { getClasses, getInterests } from '../data/courseHelpers'

// ── Interest tile ─────────────────────────────────────────────────────
function InterestCard({ program, subject, selected, onToggle }) {
  const firstVid = subject.topics?.[0]?.lessons?.[0]?.videoId
  const hasThumb = firstVid && firstVid !== 'YOUTUBE_ID_HERE'
  return (
    <button type="button" className={`interest-card ${selected ? 'interest-card--selected' : ''}`} onClick={onToggle} aria-pressed={selected}>
      <div className="interest-card__bg">
        {hasThumb
          ? <img src={`https://i.ytimg.com/vi/${firstVid}/mqdefault.jpg`} alt="" onError={e => { e.target.style.display='none' }} />
          : <div className="interest-card__gradient" />}
        <div className="interest-card__overlay" />
      </div>
      <i className={`${subject.icon || 'ri-book-open-line'} interest-card__icon`} />
      <span className="interest-card__label">{subject.name}</span>
      {selected && <span className="interest-card__check"><i className="ri-check-line" /></span>}
    </button>
  )
}

// ── Grade selector ────────────────────────────────────────────────────
// Academic grades in order
const GRADE_ORDER = ['primary', 'jsc', 'ssc', 'hsc']

function GradeCard({ program, selected, onSelect }) {
  const gradeIcons = {
    primary: 'ri-seedling-line',
    jsc:     'ri-school-line',
    ssc:     'ri-building-4-line',
    hsc:     'ri-graduation-cap-line',
  }
  const icon = gradeIcons[program.id] || 'ri-book-open-line'
  return (
    <button
      type="button"
      className={`grade-card ${selected ? 'grade-card--selected' : ''}`}
      onClick={onSelect}
      aria-pressed={selected}
    >
      <i className={icon} />
      <span className="grade-card__name">{program.name}</span>
      <span className="grade-card__desc">{program.description?.split('—')[0].trim()}</span>
      {selected && <span className="grade-card__check"><i className="ri-check-fill" /></span>}
    </button>
  )
}

// ── Main ──────────────────────────────────────────────────────────────
export default function AuthFlow({ programs, onComplete, initialMode = 'auth' }) {
  const [mode, setMode]         = useState(initialMode)
  const [authTab, setAuthTab]   = useState('signup')
  const [name, setName]         = useState('')
  const [username, setUsername] = useState('')
  const [error, setError]       = useState('')
  const [animOut, setAnimOut]   = useState(false)

  // Onboarding state
  const [selectedGrade, setSelectedGrade]     = useState(null)  // program id or 'none'
  const [selectedCourses, setSelectedCourses] = useState(new Set())  // "progId/subjId"
  const [selectedInterests, setSelectedInterests] = useState(new Set())
  const [interestFilter, setInterestFilter]   = useState('all')

  const classes   = getClasses()
  const interests = getInterests()

  // Sort classes by grade order
  const sortedClasses = useMemo(() => {
    return [...classes].sort((a, b) => {
      const ai = GRADE_ORDER.indexOf(a.id)
      const bi = GRADE_ORDER.indexOf(b.id)
      return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi)
    })
  }, [])

  // Courses available for selected grade
  const gradeProgram = selectedGrade && selectedGrade !== 'none'
    ? classes.find(p => p.id === selectedGrade)
    : null

  // Interest filtering
  const allInterestSubjects = interests.flatMap(p => p.subjects.map(s => ({ program: p, subject: s })))
  const filteredInterests = interestFilter === 'all'
    ? allInterestSubjects
    : allInterestSubjects.filter(x => x.program.id === interestFilter)

  function transition(nextMode) {
    setAnimOut(true)
    setTimeout(() => { setAnimOut(false); setMode(nextMode) }, 220)
  }

  function handleAuth(e) {
    e.preventDefault()
    if (!name.trim()) { setError('Please enter your name.'); return }
    setError('')
    signIn({ name: name.trim(), username: username.trim() })
    transition('grade')
  }

  function handleGradeNext() {
    if (!selectedGrade) return
    // If 'none' or grade has no courses, skip to interests
    if (selectedGrade === 'none' || !gradeProgram) transition('interests')
    else transition('courses')
  }

  function toggleCourse(programId, subjectId) {
    const key = `${programId}/${subjectId}`
    setSelectedCourses(prev => { const n = new Set(prev); n.has(key) ? n.delete(key) : n.add(key); return n })
  }

  function toggleInterest(programId, subjectId) {
    const key = `${programId}/${subjectId}`
    setSelectedInterests(prev => { const n = new Set(prev); n.has(key) ? n.delete(key) : n.add(key); return n })
  }

  function isCourseSelected(pId, sId) { return selectedCourses.has(`${pId}/${sId}`) }
  function isInterestSelected(pId, sId) { return selectedInterests.has(`${pId}/${sId}`) }

  function handleFinish() {
    const order = []
    for (const key of selectedCourses) {
      const [programId, subjectId] = key.split('/')
      enroll(programId, subjectId)
      order.push({ type: 'class', programId, subjectId })
    }
    for (const key of selectedInterests) {
      const [programId, subjectId] = key.split('/')
      enroll(programId, subjectId)
      order.push({ type: 'genre', programId, subjectId })
    }
    saveFeedOrder(order)
    setOnboarded()
    transition('done')
  }

  function skipOnboarding() {
    setOnboarded()
    onComplete()
  }

  useEffect(() => {
    if (mode === 'done') setTimeout(() => onComplete(), 700)
  }, [mode])

  const totalSelected = selectedCourses.size + selectedInterests.size

  return (
    <div className="authflow-overlay" onClick={e => e.target === e.currentTarget && mode !== 'done' && onComplete()}>
      <div className={`authflow-modal ${animOut ? 'authflow-modal--out' : ''} ${['grade','courses','interests'].includes(mode) ? 'authflow-modal--wide' : ''}`}>

        {/* ── Auth ── */}
        {mode === 'auth' && (
          <div className="authflow-panel">
            <div className="authflow-brand">
              <i className="ri-play-circle-fill authflow-brand__icon" />
              <span className="authflow-brand__name">Feyn</span>
            </div>
            <div className="authflow-tabs">
              <button className={`authflow-tab ${authTab==='signup'?'authflow-tab--active':''}`} onClick={() => setAuthTab('signup')}>Create account</button>
              <button className={`authflow-tab ${authTab==='signin'?'authflow-tab--active':''}`} onClick={() => setAuthTab('signin')}>Sign in</button>
            </div>
            <form onSubmit={handleAuth} className="authflow-form">
              <div className="authflow-field">
                <label className="authflow-label">{authTab==='signup' ? 'Your name' : 'Name on your account'}</label>
                <input className="authflow-input" placeholder={authTab==='signup' ? 'e.g. Himel' : 'Enter your name'} value={name} onChange={e => { setName(e.target.value); setError('') }} autoFocus />
              </div>
              {authTab==='signup' && (
                <div className="authflow-field">
                  <label className="authflow-label">Username <span className="authflow-label__opt">(optional)</span></label>
                  <div className="authflow-input-prefix-wrap">
                    <span className="authflow-input-prefix">@</span>
                    <input className="authflow-input authflow-input--prefixed" placeholder="username" value={username} onChange={e => setUsername(e.target.value.replace(/\s/g,''))} />
                  </div>
                </div>
              )}
              {error && <p className="authflow-error"><i className="ri-error-warning-line" /> {error}</p>}
              <button type="submit" className="authflow-submit">
                {authTab==='signup' ? 'Create account' : 'Sign in'} <i className="ri-arrow-right-line" />
              </button>
            </form>
            <p className="authflow-disclaimer">Your data stays on this device. No email required.</p>
            <button className="authflow-guest" onClick={onComplete}>
              Continue as guest <i className="ri-arrow-right-s-line" />
            </button>
          </div>
        )}

        {/* ── Grade / Class picker ── */}
        {mode === 'grade' && (
          <div className="authflow-panel authflow-panel--wide">
            <button className="authflow-skip-interests" onClick={skipOnboarding}>Skip <i className="ri-skip-forward-line" /></button>
            <div className="authflow-ob-header">
              <div className="authflow-ob-step">1 of 3</div>
              <h2 className="authflow-ob-title">What class are you in?</h2>
              <p className="authflow-ob-sub">We'll suggest the right courses for you.</p>
            </div>

            <div className="grade-grid">
              {sortedClasses.map(program => (
                <GradeCard
                  key={program.id}
                  program={program}
                  selected={selectedGrade === program.id}
                  onSelect={() => setSelectedGrade(program.id)}
                />
              ))}
              {/* Not a student option */}
              <button
                type="button"
                className={`grade-card grade-card--none ${selectedGrade==='none' ? 'grade-card--selected' : ''}`}
                onClick={() => setSelectedGrade('none')}
              >
                <i className="ri-user-smile-line" />
                <span className="grade-card__name">Not a student</span>
                <span className="grade-card__desc">/ Not applicable</span>
                {selectedGrade==='none' && <span className="grade-card__check"><i className="ri-check-fill" /></span>}
              </button>
            </div>

            <div className="authflow-interests-footer">
              <button className="authflow-submit" disabled={!selectedGrade} onClick={handleGradeNext} style={{ maxWidth: 320, margin: '0 auto' }}>
                Continue <i className="ri-arrow-right-line" />
              </button>
            </div>
          </div>
        )}

        {/* ── Course picker (for selected grade) ── */}
        {mode === 'courses' && gradeProgram && (
          <div className="authflow-panel authflow-panel--wide">
            <button className="authflow-skip-interests" onClick={() => transition('interests')}>Skip <i className="ri-skip-forward-line" /></button>
            <div className="authflow-ob-header">
              <div className="authflow-ob-step">2 of 3</div>
              <h2 className="authflow-ob-title">Pick your {gradeProgram.name} courses</h2>
              <p className="authflow-ob-sub">Select what you study. You can change this anytime in Settings.</p>
            </div>

            <div className="interest-grid interest-grid--courses" style={{ padding: '16px 32px' }}>
              {gradeProgram.subjects.map(subject => {
                const sel = isCourseSelected(gradeProgram.id, subject.id)
                const firstVid = subject.topics[0]?.lessons[0]?.videoId
                const hasThumb = firstVid && firstVid !== 'YOUTUBE_ID_HERE'
                return (
                  <button
                    key={subject.id}
                    type="button"
                    className={`interest-card ${sel ? 'interest-card--selected' : ''}`}
                    onClick={() => toggleCourse(gradeProgram.id, subject.id)}
                  >
                    <div className="interest-card__bg">
                      {hasThumb
                        ? <img src={`https://i.ytimg.com/vi/${firstVid}/mqdefault.jpg`} alt="" onError={e=>{e.target.style.display='none'}} />
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
                {selectedCourses.size > 0 ? `${selectedCourses.size} selected — Next` : 'Next'} <i className="ri-arrow-right-line" />
              </button>
            </div>
          </div>
        )}

        {/* ── Interests ── */}
        {mode === 'interests' && (
          <div className="authflow-panel authflow-panel--wide">
            <button className="authflow-skip-interests" onClick={handleFinish}>
              {totalSelected > 0 ? 'Done' : 'Skip'} <i className="ri-skip-forward-line" />
            </button>
            <div className="authflow-ob-header">
              <div className="authflow-ob-step">{selectedGrade === 'none' ? '1 of 1' : '3 of 3'}</div>
              <h2 className="authflow-ob-title">Any other interests?</h2>
              <p className="authflow-ob-sub">Music, tech, art, languages — pick anything you're curious about.</p>
            </div>

            <div className="authflow-filter-tabs">
              <button className={`authflow-filter-tab ${interestFilter==='all'?'authflow-filter-tab--active':''}`} onClick={() => setInterestFilter('all')}>All</button>
              {interests.map(p => (
                <button key={p.id} className={`authflow-filter-tab ${interestFilter===p.id?'authflow-filter-tab--active':''}`} onClick={() => setInterestFilter(p.id)}>{p.name}</button>
              ))}
              {selectedInterests.size > 0 && <span className="authflow-selected-count">{selectedInterests.size} selected</span>}
            </div>

            <div className="interest-grid">
              {filteredInterests.map(({ program, subject }) => (
                <InterestCard
                  key={`${program.id}/${subject.id}`}
                  program={program} subject={subject}
                  selected={isInterestSelected(program.id, subject.id)}
                  onToggle={() => toggleInterest(program.id, subject.id)}
                />
              ))}
            </div>

            <div className="authflow-interests-footer">
              <button className="authflow-submit" onClick={handleFinish} style={{ maxWidth: 320, margin: '0 auto' }}>
                {totalSelected > 0 ? `Done — ${totalSelected} selected` : 'Finish'} <i className="ri-check-line" />
              </button>
            </div>
          </div>
        )}

        {/* ── Done ── */}
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
