// ============================================================
// FEYN — LessonEngine v2
//
// Layout: two-column on desktop (≥ 700px), single column mobile.
// Left panel: fixed context (lesson title, concept being tested,
//   running explanation panel).
// Right panel: question interaction area.
//
// Flow: teach → test → build → teach → test → build → connect
//   - 'teach' cards: read-only concept before first question in a group
//   - 'question' cards: interactive (mcq, fill, tap-correct, match, sort, explain)
//   - feedback shown inline below the question, not as a banner overlay
//   - results screen at end
//
// BUG FIX: each question component is keyed by question.id so React
//   always unmounts/remounts on question change — no stale state.
//
// Props:
//   lesson         { id, title, intro, questions[] }
//   programId, subjectId, topicId, skillId, lessonIdx
//   onComplete(xp, correct, total)
//   onExit()
// ============================================================

import { useState, useEffect, useRef, useCallback } from 'react'
import { recordAttempt, saveLessonProgress, clearLessonProgress, getLessonProgress } from '../lib/userStore'

// ── Bilingual field resolver ──────────────────────────────────────────
// Questions can have a `bn` object with Bangla overrides:
//   { prompt, options, answer, explanation, pairs, categories, items }
// If medium === 'bn' and the field exists in q.bn, use it. Else English.
function useField(q, field, medium) {
  if (medium === 'bn' && q.bn && q.bn[field] !== undefined) return q.bn[field]
  return q[field]
}


const XP_CORRECT = 10
const XP_STREAK  = 5
const HEARTS_MAX = 3

// ── Helpers ───────────────────────────────────────────────────────────

function Heart({ filled }) {
  return <i className={`le2-heart ${filled ? 'ri-heart-fill le2-heart--filled' : 'ri-heart-line'}`} />
}

function ProgressDots({ total, current, answers }) {
  return (
    <div className="le2-dots">
      {Array.from({ length: total }).map((_, i) => {
        let cls = 'le2-dot'
        if (i < current)        cls += answers[i] ? ' le2-dot--correct' : ' le2-dot--wrong'
        else if (i === current)  cls += ' le2-dot--active'
        return <span key={i} className={cls} />
      })}
    </div>
  )
}

// ── MCQ ──────────────────────────────────────────────────────────────
// Keyed by question.id — always fresh state on question change
function McqQuestion({ question, onAnswer, medium }) {
  const [selected, setSelected] = useState(null)
  const [submitted, setSubmitted] = useState(false)
  const prompt  = useField(question, 'prompt', medium)
  const options = useField(question, 'options', medium)

  function pick(idx) {
    if (submitted) return
    setSelected(idx)
  }

  function submit() {
    if (selected === null || submitted) return
    setSubmitted(true)
    const correct = selected === question.correct
    onAnswer(correct, selected)
  }

  return (
    <div className="le2-q-body">
      <div className="le2-options">
        {options.map((opt, i) => {
          let cls = 'le2-option'
          if (submitted) {
            if (i === question.correct) cls += ' le2-option--correct'
            else if (i === selected)    cls += ' le2-option--wrong'
            else                        cls += ' le2-option--dim'
          } else if (selected === i) {
            cls += ' le2-option--selected'
          }
          return (
            <button key={i} className={cls} onClick={() => pick(i)} disabled={submitted}>
              <span className="le2-option__key">{String.fromCharCode(65 + i)}</span>
              <span className="le2-option__text">{opt}</span>
              {submitted && i === question.correct && <i className="ri-check-line le2-option__check" />}
              {submitted && i === selected && i !== question.correct && <i className="ri-close-line le2-option__check" />}
            </button>
          )
        })}
      </div>
      {!submitted && (
        <button className="le2-submit" onClick={submit} disabled={selected === null}>
          Check answer
        </button>
      )}
    </div>
  )
}

// ── FILL ─────────────────────────────────────────────────────────────
function FillQuestion({ question, onAnswer, medium }) {
  const prompt = useField(question, 'prompt', medium)
  const answer = useField(question, 'answer', medium)
  const aliases = useField(question, 'aliases', medium) || question.aliases || []
  const [value, setValue] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [correct, setCorrect] = useState(null)
  const ref = useRef(null)

  useEffect(() => { ref.current?.focus() }, [])

  function submit() {
    if (!value.trim() || submitted) return
    const ans = value.trim().toLowerCase()
    const ok = ans === answer.toLowerCase()
      || aliases.map(a => a.toLowerCase()).includes(ans)
    setCorrect(ok)
    setSubmitted(true)
    onAnswer(ok, value.trim())
  }

  return (
    <div className="le2-q-body">
      <div className={`le2-fill-wrap ${submitted ? (correct ? 'le2-fill-wrap--correct' : 'le2-fill-wrap--wrong') : ''}`}>
        <input
          ref={ref}
          className="le2-fill-input"
          value={value}
          onChange={e => setValue(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && submit()}
          placeholder="Your answer…"
          disabled={submitted}
          autoComplete="off"
        />
        {submitted && (
          <span className="le2-fill-icon">
            {correct ? <i className="ri-check-line" /> : <i className="ri-close-line" />}
          </span>
        )}
      </div>
      {submitted && !correct && (
        <p className="le2-fill-hint">Correct: <strong>{answer}</strong></p>
      )}
      {!submitted && (
        <button className="le2-submit" onClick={submit} disabled={!value.trim()}>
          Check answer
        </button>
      )}
    </div>
  )
}

// ── TAP-CORRECT ───────────────────────────────────────────────────────
function TapCorrectQuestion({ question, onAnswer, medium }) {
  const options = useField(question, 'options', medium)
  const [selected, setSelected] = useState(new Set())
  const [submitted, setSubmitted] = useState(false)
  const correctSet = new Set(Array.isArray(question.correct) ? question.correct : [question.correct])
  // Use resolved options
  function toggle(idx) {
    if (submitted) return
    setSelected(prev => { const n = new Set(prev); n.has(idx) ? n.delete(idx) : n.add(idx); return n })
  }

  function submit() {
    if (submitted || selected.size === 0) return
    setSubmitted(true)
    const ok = JSON.stringify([...correctSet].sort()) === JSON.stringify([...selected].sort())
    onAnswer(ok, [...selected])
  }

  return (
    <div className="le2-q-body">
      <p className="le2-tap-hint">Select all that apply</p>
      <div className="le2-tap-options">
        {options.map((opt, i) => {
          let cls = 'le2-tap-option'
          if (submitted) {
            if (correctSet.has(i))   cls += ' le2-tap-option--correct'
            else if (selected.has(i)) cls += ' le2-tap-option--wrong'
          } else if (selected.has(i)) {
            cls += ' le2-tap-option--selected'
          }
          return (
            <button key={i} className={cls} onClick={() => toggle(i)} disabled={submitted}>{opt}</button>
          )
        })}
      </div>
      {!submitted && (
        <button className="le2-submit" onClick={submit} disabled={selected.size === 0}>Check</button>
      )}
    </div>
  )
}

// ── MATCH ─────────────────────────────────────────────────────────────
function MatchQuestion({ question, onAnswer, medium }) {
  const pairs = useField(question, 'pairs', medium) || question.pairs
  const [leftSel, setLeftSel]   = useState(null)
  const [matched, setMatched]   = useState({})
  const [flash, setFlash]       = useState(null)  // { left, right } wrong flash
  const [done, setDone]         = useState(false)

  // Shuffle right side once on mount
  const [rightOrder] = useState(() => pairs.map((_, i) => i).sort(() => Math.random() - 0.5))

  function pickLeft(i) {
    if (done || matched[i] !== undefined) return
    setLeftSel(i)
  }

  function pickRight(ri) {
    // ri is the shuffled index — map to real pair index
    const realIdx = rightOrder[ri]
    if (done || Object.values(matched).includes(realIdx)) return
    if (leftSel === null) return
    if (leftSel === realIdx) {
      const nm = { ...matched, [leftSel]: realIdx }
      setMatched(nm)
      setLeftSel(null)
      if (Object.keys(nm).length === pairs.length) {
        setDone(true)
        onAnswer(true, nm)
      }
    } else {
      setFlash({ left: leftSel, right: ri })
      setTimeout(() => { setFlash(null); setLeftSel(null) }, 500)
    }
  }

  const matchedRightReals = new Set(Object.values(matched))
  const matchedLefts = new Set(Object.keys(matched).map(Number))

  return (
    <div className="le2-q-body">
      <div className="le2-match">
        <div className="le2-match-col">
          {pairs.map(([left], i) => (
            <button
              key={i}
              className={`le2-match-item ${leftSel === i ? 'le2-match-item--sel' : ''} ${matchedLefts.has(i) ? 'le2-match-item--matched' : ''} ${flash?.left === i ? 'le2-match-item--flash' : ''}`}
              onClick={() => pickLeft(i)}
              disabled={done || matchedLefts.has(i)}
            >{left}</button>
          ))}
        </div>
        <div className="le2-match-col">
          {rightOrder.map((realIdx, ri) => (
            <button
              key={ri}
              className={`le2-match-item le2-match-item--right ${matchedRightReals.has(realIdx) ? 'le2-match-item--matched' : ''} ${flash?.right === ri ? 'le2-match-item--flash' : ''}`}
              onClick={() => pickRight(ri)}
              disabled={done || matchedRightReals.has(realIdx)}
            >{pairs[realIdx][1]}</button>
          ))}
        </div>
      </div>
      {done && <p className="le2-match-done"><i className="ri-checkbox-circle-fill" /> All matched!</p>}
    </div>
  )
}

// ── SORT ──────────────────────────────────────────────────────────────
function SortQuestion({ question, onAnswer, medium }) {
  const [assignments, setAssignments] = useState({})
  const [submitted, setSubmitted] = useState(false)
  const categories = useField(question, 'categories', medium) || question.categories
  const items      = useField(question, 'items', medium) || question.items

  function assign(item, cat) {
    if (submitted) return
    setAssignments(prev => {
      const n = { ...prev }
      n[item] === cat ? delete n[item] : (n[item] = cat)
      return n
    })
  }

  function submit() {
    if (submitted) return
    setSubmitted(true)
    const allCorrect = items.every(item => {
      const cat = Object.entries(question.correct).find(([, arr]) => arr.includes(item))?.[0]
      return assignments[item] === cat
    })
    onAnswer(allCorrect, assignments)
  }

  const unassigned = items.filter(i => !assignments[i])
  const allAssigned = unassigned.length === 0

  return (
    <div className="le2-q-body">
      <div className="le2-sort-buckets">
        {categories.map(cat => (
          <div key={cat} className="le2-sort-bucket">
            <p className="le2-sort-bucket__label">{cat}</p>
            <div className="le2-sort-bucket__items">
              {items.filter(item => assignments[item] === cat).map(item => {
                const correctCat = Object.entries(question.correct).find(([, arr]) => arr.includes(item))?.[0]
                let cls = 'le2-chip le2-chip--placed'
                if (submitted) cls += correctCat === cat ? ' le2-chip--correct' : ' le2-chip--wrong'
                return (
                  <button key={item} className={cls} onClick={() => assign(item, cat)} disabled={submitted}>{item}</button>
                )
              })}
            </div>
          </div>
        ))}
      </div>
      {unassigned.length > 0 && (
        <div className="le2-sort-pool">
          {unassigned.map(item => (
            <div key={item} className="le2-sort-row">
              <span className="le2-chip">{item}</span>
              <div className="le2-sort-btns">
                {categories.map(cat => (
                  <button key={cat} className="le2-sort-btn" onClick={() => assign(item, cat)} disabled={submitted}>
                    {cat}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
      {!submitted && (
        <button className="le2-submit" onClick={submit} disabled={!allAssigned}>Check</button>
      )}
    </div>
  )
}

// ── EXPLAIN ───────────────────────────────────────────────────────────
function ExplainQuestion({ question, onAnswer, medium }) {
  const prompt = useField(question, 'prompt', medium)
  const modelAnswer = useField(question, 'modelAnswer', medium) || question.modelAnswer
  const [value, setValue]       = useState('')
  const [submitted, setSubmitted] = useState(false)

  function submit() {
    if (submitted || value.trim().length < 10) return
    setSubmitted(true)
    onAnswer(true, value.trim())
  }

  return (
    <div className="le2-q-body">
      <textarea
        className="le2-explain-input"
        value={value}
        onChange={e => setValue(e.target.value)}
        placeholder="Write your explanation here — use your own words…"
        rows={5}
        disabled={submitted}
      />
      {submitted && (
        <div className="le2-model-answer">
          <p className="le2-model-answer__label"><i className="ri-lightbulb-flash-line" /> One way to think about it</p>
          <p className="le2-model-answer__text">{modelAnswer}</p>
        </div>
      )}
      {!submitted && (
        <button className="le2-submit" onClick={submit} disabled={value.trim().length < 10}>
          Submit
        </button>
      )}
    </div>
  )
}

// ── Inline feedback ───────────────────────────────────────────────────
function Feedback({ correct, explanation, onContinue, isLast, medium }) {
  return (
    <div className={`le2-feedback ${correct ? 'le2-feedback--correct' : 'le2-feedback--wrong'}`}>
      <div className="le2-feedback__row">
        <div className="le2-feedback__icon">
          {correct ? <i className="ri-checkbox-circle-fill" /> : <i className="ri-close-circle-fill" />}
        </div>
        <div className="le2-feedback__content">
          <p className="le2-feedback__verdict">{correct ? 'Correct' : 'Not quite'}</p>
          {explanation && <p className="le2-feedback__explain">{explanation}</p>}
        </div>
      </div>
      <button className="le2-continue" onClick={onContinue}>
        {isLast ? 'See results' : 'Next'} <i className="ri-arrow-right-line" />
      </button>
    </div>
  )
}

// ── Results ───────────────────────────────────────────────────────────
function Results({ xp, correct, total, title, onContinue }) {
  const pct = Math.round(correct / total * 100)
  const emoji = pct === 100 ? '🏆' : pct >= 80 ? '⭐' : pct >= 50 ? '📖' : '🔁'
  const message = pct === 100 ? 'Perfect!' : pct >= 80 ? 'Great work' : pct >= 50 ? 'Good effort' : 'Keep practising'

  return (
    <div className="le2-results">
      <div className="le2-results__card">
        <div className="le2-results__emoji">{emoji}</div>
        <h2 className="le2-results__message">{message}</h2>
        <p className="le2-results__title">{title}</p>
        <div className="le2-results__stats">
          <div className="le2-results__stat">
            <span className="le2-results__stat-val le2-results__stat-val--xp">+{xp}</span>
            <span className="le2-results__stat-key">XP</span>
          </div>
          <div className="le2-results__divider" />
          <div className="le2-results__stat">
            <span className="le2-results__stat-val">{correct}/{total}</span>
            <span className="le2-results__stat-key">correct</span>
          </div>
          <div className="le2-results__divider" />
          <div className="le2-results__stat">
            <span className="le2-results__stat-val">{pct}%</span>
            <span className="le2-results__stat-key">accuracy</span>
          </div>
        </div>
        <button className="le2-results__btn" onClick={onContinue}>
          Continue <i className="ri-arrow-right-line" />
        </button>
      </div>
    </div>
  )
}

// ── Intro ─────────────────────────────────────────────────────────────
function Intro({ lesson, savedProgress, onStart, onResume, onExit }) {
  const total = lesson.questions.length
  const resumeAt = savedProgress ? savedProgress.qIdx : null
  const resumePct = resumeAt !== null ? Math.round((resumeAt / total) * 100) : 0

  return (
    <div className="le2-intro">
      <button className="le2-topbar-close" onClick={onExit}><i className="ri-close-line" /></button>
      <div className="le2-intro__card">
        <div className="le2-intro__icon"><i className="ri-book-open-line" /></div>
        <h2 className="le2-intro__title">{lesson.title}</h2>
        <p className="le2-intro__body">{lesson.intro}</p>
        <p className="le2-intro__meta">
          <i className="ri-question-line" /> {total} questions
        </p>

        {resumeAt !== null && resumeAt > 0 ? (
          <>
            {/* Resume banner */}
            <div style={{
              background: 'var(--accent-glow)', border: '1px solid var(--accent-2)',
              borderRadius: 'var(--radius-md)', padding: '14px 16px',
              marginBottom: 14, width: '100%', textAlign: 'left',
            }}>
              <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.62rem', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--accent)', marginBottom: 6, display: 'flex', alignItems: 'center', gap: 6 }}>
                <i className="ri-bookmark-line" /> Saved progress
              </p>
              {/* Mini progress bar */}
              <div style={{ height: 6, background: 'var(--border)', borderRadius: 3, overflow: 'hidden', marginBottom: 6 }}>
                <div style={{ height: '100%', width: `${resumePct}%`, background: 'var(--accent)', borderRadius: 3 }} />
              </div>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-2)' }}>
                Question {resumeAt + 1} of {total} · {resumePct}% complete
              </p>
            </div>
            <button className="le2-intro__start" onClick={onResume} style={{ marginBottom: 10 }}>
              <i className="ri-play-fill" /> Resume from Q{resumeAt + 1}
            </button>
            <button
              onClick={onStart}
              style={{
                background: 'none', border: '1px solid var(--border-2)',
                borderRadius: 'var(--radius)', color: 'var(--text-2)',
                fontFamily: 'var(--font-mono)', fontSize: '0.7rem',
                letterSpacing: '0.08em', textTransform: 'uppercase',
                padding: '9px 18px', cursor: 'pointer', width: '100%',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
              }}
            >
              <i className="ri-refresh-line" /> Start over
            </button>
          </>
        ) : (
          <button className="le2-intro__start" onClick={onStart}>
            Start <i className="ri-arrow-right-line" />
          </button>
        )}
      </div>
    </div>
  )
}

// ── Main LessonEngine ─────────────────────────────────────────────────
export default function LessonEngine({
  lesson, programId, subjectId, topicId, skillId, lessonIdx,
  onComplete, onExit,
}) {
  // Load saved progress once on mount
  const savedProgress = getLessonProgress(programId, subjectId, topicId, skillId, lessonIdx)
  const medium = 'en'

  const [phase, setPhase]       = useState('intro')
  const [qIdx, setQIdx]         = useState(0)
  const [answers, setAnswers]   = useState([])       // true/false per question
  const [showFeedback, setShowFeedback] = useState(false)
  const [hearts, setHearts]     = useState(HEARTS_MAX)
  const [streak, setStreak]     = useState(0)
  const [totalXp, setTotalXp]   = useState(0)
  const bodyRef                 = useRef(null)

  const questions = lesson.questions
  const q         = questions[qIdx]
  const isLast    = qIdx === questions.length - 1

  // Scroll the interaction panel back to top on every new question
  useEffect(() => {
    if (phase === 'question') {
      bodyRef.current?.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }, [qIdx, phase])

  function startFresh() {
    setQIdx(0)
    setAnswers([])
    setHearts(HEARTS_MAX)
    setStreak(0)
    setTotalXp(0)
    setPhase('question')
  }

  function resumeSaved() {
    if (!savedProgress) return startFresh()
    setQIdx(savedProgress.qIdx)
    setAnswers(savedProgress.answers || [])
    // Reconstruct hearts/xp from saved answers
    const savedAnswers = savedProgress.answers || []
    const wrongCount = savedAnswers.filter(a => !a).length
    setHearts(Math.max(0, HEARTS_MAX - wrongCount))
    setTotalXp(savedAnswers.filter(Boolean).length * XP_CORRECT)
    setPhase('question')
  }

  function handleAnswer(correct, value) {
    let xp = 0
    if (correct) {
      const newStreak = streak + 1
      setStreak(newStreak)
      xp = XP_CORRECT + (newStreak % 3 === 0 ? XP_STREAK : 0)
      setTotalXp(prev => prev + xp)
    } else {
      setStreak(0)
      setHearts(h => Math.max(0, h - 1))
    }

    const newAnswers = [...answers, correct]
    setAnswers(newAnswers)
    recordAttempt(programId, subjectId, topicId, skillId, lessonIdx, q.id, correct, xp)

    // Save mid-lesson progress after every answer (cloud + local)
    saveLessonProgress(programId, subjectId, topicId, skillId, lessonIdx, qIdx, newAnswers)

    setShowFeedback(true)
  }

  function handleContinue() {
    setShowFeedback(false)
    if (isLast || hearts === 0) {
      // Lesson done — clear the saved position
      clearLessonProgress(programId, subjectId, topicId, skillId, lessonIdx)
      setPhase('results')
    } else {
      setQIdx(i => i + 1)
    }
  }

  function handleComplete() {
    const correct = answers.filter(Boolean).length
    onComplete(totalXp, correct, questions.length)
  }

  if (phase === 'intro') {
    return (
      <Intro
        lesson={lesson}
        savedProgress={savedProgress}
        onStart={startFresh}
        onResume={resumeSaved}
        onExit={onExit}
      />
    )
  }

  if (phase === 'results') {
    const correct = answers.filter(Boolean).length
    return (
      <Results
        xp={totalXp} correct={correct}
        total={questions.length} title={lesson.title}
        onContinue={handleComplete}
      />
    )
  }

  // ── Question phase ──
  const progress = qIdx / questions.length

  return (
    <div className="le2-shell">

      {/* ── Top bar ── */}
      <div className="le2-topbar">
        <button className="le2-topbar-close" onClick={onExit} aria-label="Exit lesson">
          <i className="ri-close-line" />
        </button>
        <div className="le2-topbar-progress">
          <div className="le2-topbar-bar">
            <div className="le2-topbar-fill" style={{ width: `${progress * 100}%` }} />
          </div>
          <ProgressDots total={questions.length} current={qIdx} answers={answers} />
        </div>
        <div className="le2-topbar-hearts">
          {Array.from({ length: HEARTS_MAX }).map((_, i) => (
            <Heart key={i} filled={i < hearts} />
          ))}
        </div>
      </div>

      {/* ── Two-column body ── */}
      <div className="le2-body">

        {/* LEFT: concept panel */}
        <div className="le2-concept">
          <div className="le2-concept__inner">
            <p className="le2-concept__lesson-name">{lesson.title}</p>
            <p className="le2-concept__num">Question {qIdx + 1} of {questions.length}</p>

            {streak >= 3 && (
              <div className="le2-streak">
                <i className="ri-fire-fill" /> {streak} in a row
                {streak % 3 === 0 && <span className="le2-streak__bonus"> · +{XP_STREAK} XP</span>}
              </div>
            )}

            {/* Show previous question's explanation as context once feedback is visible */}
            {showFeedback && q.explanation && (
              <div className="le2-concept__explanation">
                <p className="le2-concept__explanation-label">
                  <i className="ri-lightbulb-line" /> Why
                </p>
                <p className="le2-concept__explanation-text">{q.explanation}</p>
              </div>
            )}

            {/* Lesson intro as permanent context on desktop */}
            {!showFeedback && (
              <div className="le2-concept__intro-excerpt">
                <p>{lesson.intro}</p>
              </div>
            )}
          </div>
        </div>

        {/* RIGHT: question + answer + feedback */}
        <div className="le2-interaction" ref={bodyRef}>
          <div className="le2-interaction__inner">

            <div className="le2-question-card">
              {/* Question type tag */}
              <span className="le2-qtype-tag">
                {q.type === 'mcq' && 'Multiple choice'}
                {q.type === 'fill' && 'Fill in the blank'}
                {q.type === 'tap-correct' && 'Select all correct'}
                {q.type === 'match' && 'Match pairs'}
                {q.type === 'sort' && 'Sort into categories'}
                {q.type === 'explain' && 'Explain in your own words'}
              </span>

              <p className="le2-prompt">{medium === 'bn' && q.bn?.prompt ? q.bn.prompt : q.prompt}</p>

              {/* BUG FIX: key={q.id} forces full remount on question change */}
              {q.type === 'mcq' && (
                <McqQuestion key={q.id} question={q} onAnswer={handleAnswer} medium={medium} />
              )}
              {q.type === 'fill' && (
                <FillQuestion key={q.id} question={q} onAnswer={handleAnswer} medium={medium} />
              )}
              {q.type === 'tap-correct' && (
                <TapCorrectQuestion key={q.id} question={q} onAnswer={handleAnswer} medium={medium} />
              )}
              {q.type === 'match' && (
                <MatchQuestion key={q.id} question={q} onAnswer={handleAnswer} medium={medium} />
              )}
              {q.type === 'sort' && (
                <SortQuestion key={q.id} question={q} onAnswer={handleAnswer} medium={medium} />
              )}
              {q.type === 'explain' && (
                <ExplainQuestion key={q.id} question={q} onAnswer={handleAnswer} medium={medium} />
              )}
            </div>

            {/* Inline feedback — appears below the question card */}
            {showFeedback && (
              <Feedback
                correct={answers[answers.length - 1]}
                explanation={medium === 'bn' && q.bn?.explanation ? q.bn.explanation : q.explanation}
                onContinue={handleContinue}
                isLast={isLast || hearts === 0}
                medium={medium}
              />
            )}

          </div>
        </div>
      </div>
    </div>
  )
}
