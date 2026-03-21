import Head from 'next/head'
import Link from 'next/link'
import dynamic from 'next/dynamic'
import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { getProgram, getSubject, getTopic, getSkill, getLessonNav, getCoachesFor, getSubjectMaterials, getTotalLessons, getAllLessonPaths } from '../../../../../data/courseHelpers'
import { Nav, Footer, Breadcrumb, DonateStrip, CoachChip, MaterialsSidebar, LessonMaterials, useAuth } from '../../../../../components/Layout'
import { isWatched, markWatched, unmarkWatched, getSubjectProgress, issueCert, hasCert, getProfile, getWatchProgress, saveLessonProgress, recordAttempt, clearLessonProgress, getLessonProgress } from '../../../../../lib/userStore'
import { downloadCertificate } from '../../../../../lib/certificate'

const SmartPlayer = dynamic(() => import('../../../../../components/SmartPlayer'), { ssr: false })

// ─────────────────────────────────────────────────────────────────────
// Q&A ENGINE — inline, no external component
// ─────────────────────────────────────────────────────────────────────

function QAEngine({ lesson, programId, subjectId, topicId, skillId, lessonIdx, onComplete, onExit }) {
  const questions = lesson.questions || []

  // Load any saved mid-lesson progress from localStorage (written by saveLessonProgress).
  // answers is stored as { [qId]: userAnswer } — same format this engine uses.
  const saved = getLessonProgress(programId, subjectId, topicId, skillId, lessonIdx)

  const [idx, setIdx]           = useState(saved?.qIdx ?? 0)
  const [answers, setAnswers]   = useState(saved?.answers ?? {})
  const [revealed, setRevealed] = useState(() => {
    // Mark all questions before the saved position as already revealed
    if (!saved?.answers) return {}
    const r = {}
    Object.keys(saved.answers).forEach(qId => { r[qId] = true })
    return r
  })
  const [done, setDone]         = useState(false)
  const [streak, setStreak]     = useState(0)
  const [resumeBanner, setResumeBanner] = useState(!!saved)

  const q = questions[idx]

  // ── Evaluate correctness for a single answer ────────────────────
  function isCorrect(question, ans) {
    if (ans === undefined || ans === null) return false
    if (question.type === 'mcq')          return ans === question.correct
    if (question.type === 'fill') {
      const all = [question.answer, ...(question.aliases || [])].map(a => a.toLowerCase().trim())
      return all.includes(String(ans).toLowerCase().trim())
    }
    if (question.type === 'tap-correct') {
      return [...(ans || [])].sort().join(',') === [...question.correct].sort().join(',')
    }
    // explain / match — attempted counts as pass
    return !!ans
  }

  // ── Submit: lock answer, persist to DB, advance streak ──────────
  function submitAnswer(qId, value) {
    // value is passed explicitly by each question type on submit
    const question  = questions.find(q => q.id === qId)
    const finalAns  = value !== undefined ? value : answers[qId]
    const correct   = isCorrect(question, finalAns)
    const newStreak = correct ? streak + 1 : 0
    const xp        = correct ? (10 + (newStreak % 3 === 0 && newStreak > 0 ? 5 : 0)) : 0
    setStreak(newStreak)
    setRevealed(r => ({ ...r, [qId]: true }))

    // Persist answer record + mid-lesson progress
    recordAttempt(programId, subjectId, topicId, skillId, lessonIdx, qId, correct, xp)
    saveLessonProgress(programId, subjectId, topicId, skillId, lessonIdx, idx,
      { ...answers, [qId]: finalAns })
  }

  function handleNext() {
    if (idx < questions.length - 1) {
      setIdx(idx + 1)
    } else {
      clearLessonProgress(programId, subjectId, topicId, skillId, lessonIdx)
      setDone(true)
    }
  }

  // ── Score for summary ────────────────────────────────────────────
  const score = useMemo(() => {
    let correct = 0
    for (const q of questions) {
      if (isCorrect(q, answers[q.id])) correct++
    }
    return correct
  }, [done, answers, questions]) // eslint-disable-line react-hooks/exhaustive-deps

  if (done) {
    return <QASummary questions={questions} answers={answers} score={score} onComplete={onComplete} onExit={onExit} />
  }

  return (
    <div className="qa-engine">
      {/* Resume banner — shown once when restoring a saved session */}
      {resumeBanner && (
        <div className="qa-resume-banner">
          <i className="ri-history-line" />
          <span>Resuming where you left off — question {idx + 1} of {questions.length}</span>
          <button className="qa-resume-banner__dismiss" onClick={() => setResumeBanner(false)}>
            <i className="ri-close-line" />
          </button>
        </div>
      )}
      {/* Progress bar */}
      <div className="qa-progress">
        <div className="qa-progress__bar">
          <div className="qa-progress__fill" style={{ width: `${(idx / questions.length) * 100}%` }} />
        </div>
        <span className="qa-progress__label">{idx + 1} / {questions.length}</span>
        <button className="qa-exit-btn" onClick={onExit} title="Exit questions">
          <i className="ri-close-line" />
        </button>
      </div>

      {/* Question card */}
      <div className="qa-card">
        <QAQuestion
          key={q.id}
          q={q}
          answer={answers[q.id]}
          isRevealed={!!revealed[q.id]}
          onAnswer={val => setAnswers(a => ({ ...a, [q.id]: val }))}
          onSubmit={(val) => submitAnswer(q.id, val)}
          onNext={handleNext}
          isLast={idx === questions.length - 1}
        />
      </div>
    </div>
  )
}

// ── Dispatcher: routes to correct question type ─────────────────────
function QAQuestion({ q, answer, isRevealed, onAnswer, onSubmit, onNext, isLast }) {
  const typeLabel = { mcq: 'Multiple choice', fill: 'Fill in the blank', 'tap-correct': 'Select all that apply', explain: 'Short answer', match: 'Match the pairs' }

  return (
    <div className="qa-q">
      <p className="qa-q__type-tag">{typeLabel[q.type] || q.type}</p>
      <p className="qa-q__prompt">{q.prompt}</p>

      {q.type === 'mcq'         && <MCQ         q={q} answer={answer} isRevealed={isRevealed} onAnswer={onAnswer} onSubmit={onSubmit} onNext={onNext} isLast={isLast} />}
      {q.type === 'fill'        && <Fill        q={q} answer={answer} isRevealed={isRevealed} onAnswer={onAnswer} onSubmit={onSubmit} onNext={onNext} isLast={isLast} />}
      {q.type === 'tap-correct' && <TapCorrect  q={q} answer={answer} isRevealed={isRevealed} onAnswer={onAnswer} onSubmit={onSubmit} onNext={onNext} isLast={isLast} />}
      {q.type === 'explain'     && <Explain     q={q} answer={answer} isRevealed={isRevealed} onAnswer={onAnswer} onSubmit={onSubmit} onNext={onNext} isLast={isLast} />}
      {q.type === 'match'       && <Match       q={q} answer={answer} isRevealed={isRevealed} onAnswer={onAnswer} onSubmit={onSubmit} onNext={onNext} isLast={isLast} />}
    </div>
  )
}

// ── MCQ ──────────────────────────────────────────────────────────────
function MCQ({ q, answer, isRevealed, onAnswer, onSubmit, onNext, isLast }) {
  function pick(i) {
    if (isRevealed) return
    onAnswer(i)
    // pass value directly — onAnswer is async setState, can't rely on it being set yet
    onSubmit(i)
  }

  return (
    <div className="qa-mcq">
      <div className="qa-mcq__options">
        {q.options.map((opt, i) => {
          let state = ''
          if (isRevealed) {
            if (i === q.correct) state = 'correct'
            else if (i === answer && i !== q.correct) state = 'wrong'
            else state = 'dim'
          } else if (answer === i) {
            state = 'selected'
          }
          return (
            <button
              key={i}
              className={`qa-mcq__opt qa-mcq__opt--${state || 'idle'}`}
              onClick={() => pick(i)}
              disabled={isRevealed}
            >
              <span className="qa-mcq__opt-letter">{String.fromCharCode(65 + i)}</span>
              <span className="qa-mcq__opt-text">{opt}</span>
              {isRevealed && i === q.correct && <i className="ri-check-line qa-mcq__tick" />}
              {isRevealed && i === answer && i !== q.correct && <i className="ri-close-line qa-mcq__cross" />}
            </button>
          )
        })}
      </div>
      {isRevealed && <Explanation text={q.explanation} correct={answer === q.correct} />}
      {isRevealed && <NextBtn onNext={onNext} isLast={isLast} />}
    </div>
  )
}

// ── Fill in the blank ─────────────────────────────────────────────────
function Fill({ q, answer, isRevealed, onAnswer, onSubmit, onNext, isLast }) {
  const inputRef = useRef(null)
  useEffect(() => { if (inputRef.current && !isRevealed) inputRef.current.focus() }, [])

  const allValid  = [q.answer, ...(q.aliases || [])].map(a => a.toLowerCase().trim())
  const isCorrect = isRevealed && allValid.includes(String(answer || '').toLowerCase().trim())

  function handleKey(e) {
    if (e.key === 'Enter' && !isRevealed && answer) onSubmit(answer)
  }

  return (
    <div className="qa-fill">
      <div className={`qa-fill__input-wrap ${isRevealed ? (isCorrect ? 'correct' : 'wrong') : ''}`}>
        <input
          ref={inputRef}
          className="qa-fill__input"
          value={answer || ''}
          onChange={e => !isRevealed && onAnswer(e.target.value)}
          onKeyDown={handleKey}
          placeholder="Type your answer…"
          disabled={isRevealed}
        />
        {!isRevealed && (
          <button className="qa-fill__submit" disabled={!answer} onClick={() => onSubmit(answer)}>
            Check <i className="ri-arrow-right-line" />
          </button>
        )}
        {isRevealed && (
          <span className="qa-fill__verdict">
            {isCorrect ? <><i className="ri-check-line" /> Correct</> : <><i className="ri-close-line" /> Incorrect</>}
          </span>
        )}
      </div>
      {isRevealed && !isCorrect && (
        <p className="qa-fill__correct-ans">Correct answer: <strong>{q.answer}</strong></p>
      )}
      {isRevealed && <Explanation text={q.explanation} correct={isCorrect} />}
      {isRevealed && <NextBtn onNext={onNext} isLast={isLast} />}
    </div>
  )
}

// ── Tap-correct (multi-select) ────────────────────────────────────────
function TapCorrect({ q, answer, isRevealed, onAnswer, onSubmit, onNext, isLast }) {
  const selected = answer || []

  function toggle(i) {
    if (isRevealed) return
    const next = selected.includes(i) ? selected.filter(x => x !== i) : [...selected, i]
    onAnswer(next)
  }

  const correct = q.correct || []
  const isFullyCorrect = isRevealed &&
    [...selected].sort().join(',') === [...correct].sort().join(',')

  return (
    <div className="qa-tap">
      <p className="qa-tap__hint">Select all that apply</p>
      <div className="qa-tap__chips">
        {q.options.map((opt, i) => {
          let state = 'idle'
          if (isRevealed) {
            const inCorrect  = correct.includes(i)
            const inSelected = selected.includes(i)
            if (inCorrect && inSelected)  state = 'correct'
            else if (inCorrect)           state = 'missed'
            else if (inSelected)          state = 'wrong'
            else                          state = 'dim'
          } else if (selected.includes(i)) {
            state = 'selected'
          }
          return (
            <button
              key={i}
              className={`qa-tap__chip qa-tap__chip--${state}`}
              onClick={() => toggle(i)}
              disabled={isRevealed}
            >
              <span className="qa-tap__chip-check">
                {isRevealed && correct.includes(i) && <i className="ri-check-line" />}
                {isRevealed && !correct.includes(i) && selected.includes(i) && <i className="ri-close-line" />}
                {!isRevealed && selected.includes(i) && <i className="ri-check-line" />}
              </span>
              {opt}
            </button>
          )
        })}
      </div>
      {!isRevealed && (
        <button className="btn btn--accent qa-tap__btn" disabled={selected.length === 0} onClick={() => onSubmit(selected)}>
          Submit <i className="ri-check-line" />
        </button>
      )}
      {isRevealed && <Explanation text={q.explanation} correct={isFullyCorrect} />}
      {isRevealed && <NextBtn onNext={onNext} isLast={isLast} />}
    </div>
  )
}

// ── Explain (open-ended, self-assessed) ──────────────────────────────
function Explain({ q, answer, isRevealed, onAnswer, onSubmit, onNext, isLast }) {
  return (
    <div className="qa-explain">
      <textarea
        className="qa-explain__textarea"
        value={answer || ''}
        onChange={e => !isRevealed && onAnswer(e.target.value)}
        placeholder="Write your explanation here…"
        disabled={isRevealed}
        rows={5}
      />
      {!isRevealed && (
        <button className="btn btn--accent qa-explain__btn" onClick={() => onSubmit(answer)} disabled={!answer || answer.trim().length < 10}>
          Reveal model answer <i className="ri-eye-line" />
        </button>
      )}
      {isRevealed && (
        <div className="qa-explain__model">
          <p className="qa-explain__model-label"><i className="ri-book-2-line" /> Model answer</p>
          <p className="qa-explain__model-text">{q.modelAnswer}</p>
          <p className="qa-explain__self-label">How did yours compare?</p>
          <div className="qa-explain__self-btns">
            <button className="qa-self-btn qa-self-btn--good" onClick={() => onNext()}>
              <i className="ri-thumb-up-line" /> Got it
            </button>
            <button className="qa-self-btn qa-self-btn--ok" onClick={() => onNext()}>
              <i className="ri-swap-line" /> Mostly
            </button>
            <button className="qa-self-btn qa-self-btn--bad" onClick={() => onNext()}>
              <i className="ri-repeat-line" /> Need review
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Match ─────────────────────────────────────────────────────────────
function Match({ q, answer, isRevealed, onAnswer, onSubmit, onNext, isLast }) {
  const pairs   = q.pairs || []
  const terms   = pairs.map(p => p[0])
  const defs    = useMemo(() => [...pairs.map(p => p[1])].sort(() => Math.random() - 0.5), [])
  // answer = { [term]: selectedDef }
  const sel     = answer || {}

  function pick(term, def) {
    if (isRevealed) return
    const next = { ...sel }
    // unassign def if already used
    for (const t in next) { if (next[t] === def) delete next[t] }
    next[term] = def
    onAnswer(next)
  }

  const allMatched = terms.every(t => sel[t])
  const allCorrect = isRevealed && pairs.every(([t, d]) => sel[t] === d)

  return (
    <div className="qa-match">
      <div className="qa-match__cols">
        <div className="qa-match__col">
          {terms.map((term, i) => (
            <div key={i} className="qa-match__term">
              <span className="qa-match__term-text">{term}</span>
              <select
                className={`qa-match__select ${isRevealed ? (sel[term] === pairs[i][1] ? 'correct' : 'wrong') : sel[term] ? 'filled' : ''}`}
                value={sel[term] || ''}
                onChange={e => pick(term, e.target.value)}
                disabled={isRevealed}
              >
                <option value="">— choose —</option>
                {defs.map((d, j) => <option key={j} value={d}>{d}</option>)}
              </select>
              {isRevealed && (
                <span className={`qa-match__verdict ${sel[term] === pairs[i][1] ? 'correct' : 'wrong'}`}>
                  <i className={sel[term] === pairs[i][1] ? 'ri-check-line' : 'ri-close-line'} />
                </span>
              )}
            </div>
          ))}
        </div>
      </div>
      {!isRevealed && (
        <button className="btn btn--accent" style={{ marginTop: 16 }} disabled={!allMatched} onClick={() => onSubmit(sel)}>
          Submit <i className="ri-check-line" />
        </button>
      )}
      {isRevealed && <Explanation text={q.explanation} correct={allCorrect} />}
      {isRevealed && <NextBtn onNext={onNext} isLast={isLast} />}
    </div>
  )
}

// ── Shared sub-components ─────────────────────────────────────────────
function Explanation({ text, correct }) {
  return (
    <div className={`qa-explanation qa-explanation--${correct ? 'correct' : 'wrong'}`}>
      <i className={correct ? 'ri-checkbox-circle-fill' : 'ri-close-circle-fill'} />
      <p>{text}</p>
    </div>
  )
}

function NextBtn({ onNext, isLast }) {
  return (
    <button className="btn btn--accent qa-next-btn" onClick={onNext}>
      {isLast ? <><i className="ri-flag-line" /> Finish</> : <>Next <i className="ri-arrow-right-line" /></>}
    </button>
  )
}

// ── Summary screen ────────────────────────────────────────────────────
function QASummary({ questions, answers, score, onComplete, onExit }) {
  const total      = questions.length
  const autoScored = questions.filter(q => ['mcq','fill','tap-correct'].includes(q.type)).length
  const pct        = autoScored ? Math.round((score / autoScored) * 100) : 100

  const grade = pct >= 80 ? { label: 'Excellent', icon: 'ri-trophy-fill', cls: 'gold' }
              : pct >= 60 ? { label: 'Good',      icon: 'ri-thumb-up-fill', cls: 'green' }
              :             { label: 'Keep at it', icon: 'ri-refresh-line',  cls: 'amber' }

  return (
    <div className="qa-summary">
      <div className={`qa-summary__badge qa-summary__badge--${grade.cls}`}>
        <i className={grade.icon} />
      </div>
      <h2 className="qa-summary__title">{grade.label}</h2>
      {autoScored > 0 && (
        <p className="qa-summary__score">{score} / {autoScored} correct</p>
      )}
      <div className="qa-summary__bar-wrap">
        <div className="qa-summary__bar">
          <div className="qa-summary__bar-fill" style={{ width: `${pct}%` }} />
        </div>
        <span className="qa-summary__pct">{pct}%</span>
      </div>

      {/* Per-question mini recap */}
      <div className="qa-summary__list">
        {questions.map((q, i) => {
          const ans = answers[q.id]
          let wasCorrect = false
          if (q.type === 'mcq') wasCorrect = ans === q.correct
          else if (q.type === 'fill') {
            const all = [q.answer, ...(q.aliases || [])].map(a => a.toLowerCase().trim())
            wasCorrect = all.includes(String(ans || '').toLowerCase().trim())
          } else if (q.type === 'tap-correct') {
            wasCorrect = [...(ans || [])].sort().join(',') === [...q.correct].sort().join(',')
          } else {
            wasCorrect = !!ans  // open-ended: attempted = pass
          }
          return (
            <div key={q.id} className={`qa-summary__item ${wasCorrect ? 'correct' : 'wrong'}`}>
              <i className={wasCorrect ? 'ri-check-line' : 'ri-close-line'} />
              <span className="qa-summary__item-num">Q{i + 1}</span>
              <span className="qa-summary__item-prompt">{q.prompt.slice(0, 80)}{q.prompt.length > 80 ? '…' : ''}</span>
            </div>
          )
        })}
      </div>

      <div className="qa-summary__actions">
        <button className="btn btn--accent" onClick={onComplete}>
          <i className="ri-arrow-right-line" /> Continue lesson
        </button>
        <button className="btn btn--ghost" onClick={onExit}>
          <i className="ri-close-line" /> Close
        </button>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────
// LESSON PAGE
// ─────────────────────────────────────────────────────────────────────
export default function LessonPage({ program, subject, topic, skill, lesson, prev, next, lessonIndex, totalLessons, subjectTotalLessons, allMaterials, skillId, lessonId }) {
  const { signedIn, setShowAuth, mounted } = useAuth()
  const [phase, setPhase]             = useState('video')   // 'video' | 'questions' | 'done'
  const [watched, setWatched]         = useState(false)
  const [videoPct, setVideoPct]       = useState(0)
  const [subjectPct, setSubjectPct]   = useState(0)
  const [certReady, setCertReady]     = useState(false)
  const [certLoading, setCertLoading] = useState(false)
  const [certStatus, setCertStatus]   = useState('')
  const [savedProgress, setSavedProgress] = useState(null)

  const coaches = useMemo(
    () => getCoachesFor(topic.coachIds || subject.coachIds || []),
    [topic.coachIds, subject.coachIds]
  )

  const lessonKey = `${program.id}/${subject.id}/${topic.id}/${lessonId}`

  const syncProgress = useCallback(() => {
    const pct = getSubjectProgress(program.id, subject.id, subject)
    setSubjectPct(pct)
    setCertReady(subject.certificate && pct === 100)
  }, [program.id, subject])

  useEffect(() => {
    if (!signedIn) return
    const w = isWatched(program.id, subject.id, topic.id, lessonId)
    setWatched(w)
    syncProgress()
    const wp = getWatchProgress(lessonKey)
    if (wp && !w) { setSavedProgress(wp.pct); setVideoPct(wp.pct) }
  }, [signedIn, lessonKey, syncProgress, program.id, subject.id, topic.id, lessonId])

  function handleAutoWatched() {
    if (!signedIn) return
    markWatched(program.id, subject.id, topic.id, lessonId)
    setWatched(true)
    syncProgress()
  }

  function handleUnmark() {
    unmarkWatched(program.id, subject.id, topic.id, lessonId)
    setWatched(false)
    syncProgress()
  }

  function handleStartQuestions() {
    setPhase('questions')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function handleQuestionsComplete() {
    setPhase('done')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function handleQuestionsExit() {
    setPhase('video')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  async function handleCert() {
    const profile    = getProfile()
    const userName   = profile?.name || 'Student'
    const coachName  = coaches[0]?.name  || 'Instructor'
    const coachTitle = coaches[0]?.title || 'Instructor'
    const coachSig   = coaches[0]?.signature || null
    setCertLoading(true); setCertStatus('fetching')
    const { cert, dbOk } = await issueCert(program.id, subject.id, subject.name, program.name, userName)
    if (!cert) { setCertLoading(false); setCertStatus(''); return }
    if (!dbOk) { setCertStatus('failed'); await new Promise(r => setTimeout(r, 1500)) }
    else       { setCertStatus('verified'); await new Promise(r => setTimeout(r, 800)) }
    await downloadCertificate({ cert, coachName, coachTitle, totalLessons: subjectTotalLessons, subjectDesc: subject.description || '', coachSignatureUrl: coachSig, isGlobal: true })
    setCertLoading(false); setCertStatus('')
  }

  const hasQuestions = lesson.questions && lesson.questions.length > 0
  const hasVideo     = lesson.videoId && lesson.videoId !== 'YOUTUBE_ID_HERE'

  // ── Questions phase — full-width, replaces page content ─────────
  if (phase === 'questions') {
    return (
      <>
        <Head>
          <title>{lesson.title} — Questions — Feyn</title>
        </Head>
        <Nav />
        <main>
          <div className="container qa-page">
            <div className="qa-page__header">
              <button className="qa-back-btn" onClick={handleQuestionsExit}>
                <i className="ri-arrow-left-line" /> Back to lesson
              </button>
              <div className="qa-page__meta">
                <span className="qa-page__skill">{skill.name}</span>
                <span>·</span>
                <span>{lesson.title}</span>
              </div>
            </div>
            <QAEngine
              lesson={lesson}
              programId={program.id}
              subjectId={subject.id}
              topicId={topic.id}
              skillId={skillId}
              lessonIdx={lessonIndex - 1}
              onComplete={handleQuestionsComplete}
              onExit={handleQuestionsExit}
            />
          </div>
        </main>
        <Footer />
      </>
    )
  }

  return (
    <>
      <Head>
        <title>{lesson.title} — {topic.name} — Feyn</title>
        <meta name="description" content={lesson.intro || lesson.title} />
      </Head>
      <Nav />
      <main>
        <div className="page-with-sidebar">
          <div className="main-content">
            <Breadcrumb crumbs={[
              { label: program.name, href: `/${program.id}` },
              { label: subject.name, href: `/${program.id}/${subject.id}` },
              { label: topic.name,   href: `/${program.id}/${subject.id}/${topic.id}` },
              { label: skill.name,   href: `/${program.id}/${subject.id}/${topic.id}` },
              { label: lesson.title },
            ]} />

            <section className="lesson-page">
              <div className="lesson-meta">
                <span>{skill.name}</span>
                <span>·</span>
                <span>Lesson {lessonIndex} of {totalLessons}</span>
                {lesson.duration && <><span>·</span><span><i className="ri-time-line" /> {lesson.duration}</span></>}
                {mounted && signedIn && watched && (
                  <span className="watched-badge"><i className="ri-checkbox-circle-fill" /> Watched</span>
                )}
              </div>

              <h1 className="lesson-title">{lesson.title}</h1>
              {lesson.intro && <p className="lesson-description">{lesson.intro}</p>}

              {coaches.length > 0 && (
                <div className="lesson-coaches">
                  {coaches.map(c => <CoachChip key={c.id} coach={c} />)}
                </div>
              )}

              {/* VIDEO */}
              {mounted ? (
                <SmartPlayer
                  videoId={lesson.videoId}
                  lessonKey={signedIn ? lessonKey : null}
                  savedProgress={signedIn ? savedProgress : null}
                  onAutoWatched={signedIn ? handleAutoWatched : undefined}
                  onProgress={signedIn ? setVideoPct : undefined}
                  alreadyWatched={watched}
                />
              ) : (
                <div className="video-wrap">
                  <div className="video-placeholder">
                    <i className="ri-play-circle-line" /><span>Loading player</span>
                  </div>
                </div>
              )}

              {/* Video progress bar */}
              <div className="video-meta-bar">
                <div className="video-meta-bar__left">
                  {mounted && signedIn ? (
                    <>
                      <div className="video-meta-bar__progress-track"
                        role="progressbar" aria-valuenow={videoPct} aria-valuemin={0} aria-valuemax={100}>
                        <div className="video-meta-bar__progress-fill" style={{ width:`${videoPct}%` }} />
                      </div>
                      <span className="video-meta-bar__pct">{videoPct}% watched</span>
                      <span className="video-meta-bar__course-pct" title={`${subject.name} overall`}>
                        <i className="ri-book-open-line" /> {subjectPct}% of course
                      </span>
                    </>
                  ) : (
                    <span className="video-meta-bar__guest">
                      <Link href={`/${program.id}/${subject.id}`} className="video-meta-bar__course-link">
                        <i className="ri-book-open-line" /> {subject.name}
                      </Link>
                    </span>
                  )}
                </div>
              </div>

              {/* ── QUESTIONS PROMPT ── */}
              {phase === 'video' && hasQuestions && (
                <div className="lesson-qa-prompt">
                  <div className="lesson-qa-prompt__left">
                    <div className="lesson-qa-prompt__icon-wrap">
                      <i className="ri-edit-box-line" />
                    </div>
                    <div>
                      <p className="lesson-qa-prompt__title">Test your understanding</p>
                      <p className="lesson-qa-prompt__sub">
                        {lesson.questions.length} question{lesson.questions.length !== 1 ? 's' : ''} on this lesson
                      </p>
                    </div>
                  </div>
                  <button className="lesson-qa-prompt__btn" onClick={handleStartQuestions}>
                    Start <i className="ri-arrow-right-line" />
                  </button>
                </div>
              )}

              {/* ── DONE banner ── */}
              {phase === 'done' && (
                <div className="lesson-done-banner">
                  <i className="ri-checkbox-circle-fill" />
                  <div>
                    <p className="lesson-done-banner__title">Lesson complete</p>
                    <p className="lesson-done-banner__sub">Move on to the next one.</p>
                  </div>
                  {hasQuestions && (
                    <button className="btn btn--ghost btn--sm" onClick={handleStartQuestions}>
                      <i className="ri-refresh-line" /> Redo questions
                    </button>
                  )}
                </div>
              )}

              {/* Lesson materials */}
              <LessonMaterials materials={lesson.materials || []} />

              {/* Auth / cert area */}
              {mounted && (
                <div className="lesson-actions">
                  {signedIn ? (
                    <>
                      {watched && (
                        <>
                          <span className="lesson-watched-status"><i className="ri-checkbox-circle-fill" /> Marked as watched</span>
                          <button className="btn btn--ghost btn--sm" onClick={handleUnmark}>
                            <i className="ri-close-circle-line" /> Mark as unwatched
                          </button>
                        </>
                      )}
                      {certReady && (
                        <button className="btn btn--cert" onClick={handleCert} disabled={certLoading}>
                          <i className={
                            certStatus === 'verified' ? 'ri-shield-check-fill'
                            : certStatus === 'failed' ? 'ri-error-warning-line'
                            : certStatus ? 'ri-loader-4-line ri-spin'
                            : 'ri-medal-line'
                          } />
                          {certStatus === 'fetching'  ? 'Fetching…'
                            : certStatus === 'failed' ? 'DB error — downloading anyway'
                            : certStatus === 'verified' ? 'Verified ✓'
                            : hasCert(program.id, subject.id) ? 'Re-download Certificate'
                            : 'Download Certificate'}
                        </button>
                      )}
                    </>
                  ) : (
                    <div className="lesson-auth-nudge">
                      <i className="ri-lock-line" />
                      <span>
                        <button className="lesson-auth-nudge__link" onClick={() => setShowAuth(true)}>Sign in</button>
                        {' '}to track progress and earn certificates
                      </span>
                    </div>
                  )}
                </div>
              )}

              {lessonIndex > 0 && lessonIndex % 3 === 0 && <DonateStrip />}

              {/* Prev/Next nav */}
              <nav className="lesson-nav" aria-label="Lesson navigation">
                {prev ? (
                  <Link href={`/${program.id}/${subject.id}/${topic.id}/${prev.skill.id}/${prev.lesson.id}`} className="lesson-nav__btn lesson-nav__btn--prev">
                    <span className="lesson-nav__label"><i className="ri-arrow-left-line" /> Previous</span>
                    <span className="lesson-nav__title">{prev.lesson.title}</span>
                  </Link>
                ) : <div className="lesson-nav__placeholder" />}
                {next ? (
                  <Link href={`/${program.id}/${subject.id}/${topic.id}/${next.skill.id}/${next.lesson.id}`} className="lesson-nav__btn lesson-nav__btn--next">
                    <span className="lesson-nav__label">Next <i className="ri-arrow-right-line" /></span>
                    <span className="lesson-nav__title">{next.lesson.title}</span>
                  </Link>
                ) : (
                  <Link href={`/${program.id}/${subject.id}/${topic.id}`} className="lesson-nav__btn lesson-nav__btn--next">
                    <span className="lesson-nav__label">Topic complete <i className="ri-check-line" /></span>
                    <span className="lesson-nav__title">Back to {topic.name}</span>
                  </Link>
                )}
              </nav>
            </section>
          </div>
          <MaterialsSidebar materials={allMaterials} subjectName={subject.name} />
        </div>
      </main>
      <Footer />
    </>
  )
}

export async function getStaticPaths() {
  return { paths: getAllLessonPaths().map(p => ({ params: p })), fallback: false }
}

export async function getStaticProps({ params }) {
  const { programId, subjectId, topicId, skillId, lessonId } = params
  const program = getProgram(programId)
  const subject = getSubject(programId, subjectId)
  const topic   = getTopic(programId, subjectId, topicId)
  const skill   = getSkill(programId, subjectId, topicId, skillId)
  const lesson  = skill?.lessons?.find(l => l.id === lessonId)
  if (!program || !subject || !topic || !skill || !lesson) return { notFound: true }

  const { prev, next } = getLessonNav(programId, subjectId, topicId, skillId, lessonId)

  let idx = 0, found = false
  for (const s of topic.skills) {
    if (found) break
    for (const l of (s.lessons || [])) {
      idx++
      if (s.id === skillId && l.id === lessonId) { found = true; break }
    }
  }

  const totalTopicLessons   = topic.skills.reduce((a, s) => a + (s.lessons || []).length, 0)
  const subjectTotalLessons = getTotalLessons(subject)

  function slimNav(n) {
    if (!n) return null
    return { skill: { id: n.skill.id }, lesson: { id: n.lesson.id, title: n.lesson.title } }
  }

  return {
    props: {
      program, subject, topic, skill, lesson,
      skillId, lessonId,
      prev: slimNav(prev), next: slimNav(next),
      lessonIndex: idx,
      totalLessons: totalTopicLessons,
      subjectTotalLessons,
      allMaterials: getSubjectMaterials(subject),
    }
  }
}
