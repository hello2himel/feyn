import { useState } from 'react'
import { saveProfile, setOnboarded, enroll, saveFeedOrder } from '../lib/userStore'

export { classifySubjects } from '../data/courseHelpers'

// ── Onboarding steps ─────────────────────────────────────────────────
const STEPS = ['welcome', 'identity', 'class', 'interests', 'done']

export default function Onboarding({ programs, onComplete }) {
  const [step, setStep]         = useState(0)
  const [name, setName]         = useState('')
  const [username, setUsername] = useState('')
  const [selClasses, setSelClasses] = useState([])   // [{ programId, subjectId }]
  const [selGenres, setSelGenres]   = useState([])   // [{ programId, subjectId }]
  const [leaving, setLeaving]       = useState(false)

  const { classes, genres } = classifySubjects(programs)
  const currentStep = STEPS[step]

  function next() {
    setLeaving(true)
    setTimeout(() => { setLeaving(false); setStep(s => s + 1) }, 250)
  }
  function skip() {
    setOnboarded()
    onComplete()
  }

  function toggleClass(programId, subjectId) {
    const key = `${programId}/${subjectId}`
    setSelClasses(prev =>
      prev.find(x => `${x.programId}/${x.subjectId}` === key)
        ? prev.filter(x => `${x.programId}/${x.subjectId}` !== key)
        : [...prev, { programId, subjectId }]
    )
  }
  function toggleGenre(programId, subjectId) {
    const key = `${programId}/${subjectId}`
    setSelGenres(prev =>
      prev.find(x => `${x.programId}/${x.subjectId}` === key)
        ? prev.filter(x => `${x.programId}/${x.subjectId}` !== key)
        : [...prev, { programId, subjectId }]
    )
  }

  function finish() {
    // Save profile
    if (name || username) saveProfile({ name: name.trim(), username: username.trim() })

    // Enroll in selected classes
    for (const { programId, subjectId } of selClasses) enroll(programId, subjectId)
    for (const { programId, subjectId } of selGenres)  enroll(programId, subjectId)

    // Build initial feed order: classes first, then genres
    const order = [
      ...selClasses.map(x => ({ type: 'class', ...x })),
      ...selGenres.map(x  => ({ type: 'genre', ...x })),
    ]
    saveFeedOrder(order)
    setOnboarded()
    next() // go to 'done' step
  }

  function isClassSel(programId, subjectId) {
    return !!selClasses.find(x => x.programId === programId && x.subjectId === subjectId)
  }
  function isGenreSel(programId, subjectId) {
    return !!selGenres.find(x => x.programId === programId && x.subjectId === subjectId)
  }

  return (
    <div className={`onboarding-overlay ${leaving ? 'leaving' : ''}`}>
      <div className="onboarding-modal">

        {/* Skip button (always visible except done) */}
        {currentStep !== 'done' && (
          <button className="onboarding-skip" onClick={skip}>
            Skip <i className="ri-skip-forward-line" />
          </button>
        )}

        {/* Step indicators */}
        {currentStep !== 'done' && currentStep !== 'welcome' && (
          <div className="onboarding-steps">
            {STEPS.slice(1, -1).map((s, i) => (
              <div
                key={s}
                className={`onboarding-steps__dot ${
                  i < step - 1 ? 'done' : i === step - 1 ? 'active' : ''
                }`}
              />
            ))}
          </div>
        )}

        {/* ── WELCOME ── */}
        {currentStep === 'welcome' && (
          <div className="onboarding-step">
            <div className="onboarding-step__icon"><i className="ri-sparkling-line" /></div>
            <h1 className="onboarding-step__title">Welcome to Feyn</h1>
            <p className="onboarding-step__body">
              A learning space inspired by Richard Feynman — where every concept is
              built from the ground up, one idea at a time.
            </p>
            <p className="onboarding-step__body" style={{ marginTop: 8, opacity: 0.6, fontSize: '0.85rem' }}>
              Let's personalise your experience. Takes 30 seconds.
            </p>
            <button className="onboarding-btn" onClick={next}>
              Get started <i className="ri-arrow-right-line" />
            </button>
          </div>
        )}

        {/* ── IDENTITY ── */}
        {currentStep === 'identity' && (
          <div className="onboarding-step">
            <div className="onboarding-step__icon"><i className="ri-user-line" /></div>
            <h2 className="onboarding-step__title">What should we call you?</h2>
            <p className="onboarding-step__body">You can always change this later in your profile.</p>
            <div className="onboarding-fields">
              <div className="onboarding-field">
                <label className="onboarding-field__label">Display name</label>
                <input
                  className="onboarding-input"
                  placeholder="e.g. Himel"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && next()}
                  autoFocus
                />
              </div>
              <div className="onboarding-field">
                <label className="onboarding-field__label">Username <span style={{ opacity: 0.5 }}>(optional)</span></label>
                <input
                  className="onboarding-input"
                  placeholder="e.g. @himel"
                  value={username}
                  onChange={e => setUsername(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && next()}
                />
              </div>
            </div>
            <button className="onboarding-btn" onClick={next}>
              Continue <i className="ri-arrow-right-line" />
            </button>
          </div>
        )}

        {/* ── CLASS ── */}
        {currentStep === 'class' && (
          <div className="onboarding-step">
            <div className="onboarding-step__icon"><i className="ri-graduation-cap-line" /></div>
            <h2 className="onboarding-step__title">Which classes are you in?</h2>
            <p className="onboarding-step__body">Select any that apply. We'll add them to your feed.</p>

            {classes.length === 0 ? (
              <p className="onboarding-empty">No classes available yet.</p>
            ) : (
              <div className="onboarding-chips">
                {classes.map(({ program, subject }) => {
                  const sel = isClassSel(program.id, subject.id)
                  return (
                    <button
                      key={`${program.id}/${subject.id}`}
                      className={`onboarding-chip ${sel ? 'selected' : ''}`}
                      onClick={() => toggleClass(program.id, subject.id)}
                    >
                      <i className={subject.icon || 'ri-book-open-line'} />
                      <span>{program.name} — {subject.name}</span>
                      {sel && <i className="ri-check-line onboarding-chip__check" />}
                    </button>
                  )
                })}
              </div>
            )}

            <button className="onboarding-btn" onClick={next}>
              {selClasses.length > 0 ? `Enrolled in ${selClasses.length} — Continue` : 'Skip for now'} <i className="ri-arrow-right-line" />
            </button>
          </div>
        )}

        {/* ── INTERESTS / GENRES ── */}
        {currentStep === 'interests' && (
          <div className="onboarding-step">
            <div className="onboarding-step__icon"><i className="ri-heart-line" /></div>
            <h2 className="onboarding-step__title">Any other interests?</h2>
            <p className="onboarding-step__body">
              Beyond your classes — what else would you like to explore?
            </p>

            {genres.length === 0 ? (
              <p className="onboarding-empty">No content available yet.</p>
            ) : (
              <div className="onboarding-chips">
                {genres.map(({ program, subject }) => {
                  const sel = isGenreSel(program.id, subject.id)
                  return (
                    <button
                      key={`${program.id}/${subject.id}`}
                      className={`onboarding-chip ${sel ? 'selected' : ''}`}
                      onClick={() => toggleGenre(program.id, subject.id)}
                    >
                      <i className={subject.icon || 'ri-compass-discover-line'} />
                      <span>{subject.name}</span>
                      {sel && <i className="ri-check-line onboarding-chip__check" />}
                    </button>
                  )
                })}
              </div>
            )}

            <button className="onboarding-btn" onClick={finish}>
              {selGenres.length > 0 ? `Add ${selGenres.length} interests — Finish` : 'Finish'} <i className="ri-check-line" />
            </button>
          </div>
        )}

        {/* ── DONE ── */}
        {currentStep === 'done' && (
          <div className="onboarding-step" style={{ textAlign: 'center' }}>
            <div className="onboarding-step__icon onboarding-step__icon--success">
              <i className="ri-checkbox-circle-line" />
            </div>
            <h2 className="onboarding-step__title">
              {name ? `You're all set, ${name}!` : "You're all set!"}
            </h2>
            <p className="onboarding-step__body">
              Your feed is ready.
              {selClasses.length > 0 && ` Enrolled in ${selClasses.length} class${selClasses.length > 1 ? 'es' : ''}.`}
              {selGenres.length > 0 && ` Added ${selGenres.length} interest${selGenres.length > 1 ? 's' : ''}.`}
            </p>
            <button className="onboarding-btn" onClick={onComplete}>
              Go to my feed <i className="ri-arrow-right-line" />
            </button>
          </div>
        )}

      </div>
    </div>
  )
}
