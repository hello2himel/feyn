// pages/[programId]/[subjectId]/[topicId].js
// Topic page — the skill map (main gamified learning UI)
import Head from 'next/head'
import Link from 'next/link'
import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/router'
import dynamic from 'next/dynamic'
import { getProgram, getSubject, getTopic, skillKey, lessonKey } from '../../../data/index.js'
import { Nav, Footer, useAuth } from '../../../components/Layout'
import {
  getSkillProgress, getAllSkillProgress, completeSkill,
  getStats, addXp, getAllLessonProgress,
} from '../../../lib/userStore'

const LessonEngine = dynamic(() => import('../../../components/LessonEngine'), { ssr: false })

// ── Skill Node ────────────────────────────────────────────────────────
function SkillNode({ skill, sKey, progress, lessonProgress, programId, subjectId, topicId, isLocked, onClick }) {
  const sp = progress || { status: 'available', xp: 0, stars: 0 }
  const isComplete = sp.status === 'complete' || sp.status === 'mastered'
  const isMastered = sp.status === 'mastered'

  // Check if any lesson has saved mid-progress
  const hasResume = !isComplete && skill.lessons?.some((_, idx) => {
    const lKey = `${programId}/${subjectId}/${topicId}/${skill.id}/${idx}`
    const lp = lessonProgress?.[lKey]
    return lp && lp.qIdx > 0
  })

  let cls = 'skill-node'
  if (isLocked)   cls += ' skill-node--locked'
  if (isComplete) cls += ' skill-node--complete'
  if (isMastered) cls += ' skill-node--mastered'

  return (
    <div className={cls} onClick={() => !isLocked && onClick(skill)}>
      <div className="skill-node__hex">
        <i className={skill.icon} />
        {isComplete && !isMastered && (
          <span className="skill-node__crown"><i className="ri-vip-crown-fill" /></span>
        )}
        {isMastered && (
          <span className="skill-node__crown skill-node__crown--mastered">
            {Array.from({ length: sp.stars }).map((_, i) => <i key={i} className="ri-star-fill" />)}
          </span>
        )}
        {isLocked && <span className="skill-node__lock"><i className="ri-lock-line" /></span>}
        {/* Bookmark badge — shows when a lesson is partially done */}
        {hasResume && (
          <span className="skill-node__lock" style={{ background: 'var(--accent)', color: '#0d0d0d' }}>
            <i className="ri-bookmark-fill" style={{ fontSize: '0.6rem' }} />
          </span>
        )}
      </div>
      <p className="skill-node__name">{skill.name}</p>
      {sp.xp > 0 && <p className="skill-node__xp">{sp.xp} XP</p>}
    </div>
  )
}

// ── Skill Panel ───────────────────────────────────────────────────────
function SkillPanel({ skill, topic, programId, subjectId, topicId, progress, lessonProgress, isLocked, onStartLesson, onClose }) {
  const sp = progress || { status: 'available', xp: 0, stars: 0 }
  const isComplete = sp.status === 'complete' || sp.status === 'mastered'

  return (
    <div className="skill-panel-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="skill-panel">
        <button className="skill-panel__close" onClick={onClose}><i className="ri-close-line" /></button>
        <div className="skill-panel__icon"><i className={skill.icon} /></div>
        <h2 className="skill-panel__name">{skill.name}</h2>
        <p className="skill-panel__desc">{skill.description}</p>

        {isLocked ? (
          <div className="skill-panel__locked">
            <i className="ri-lock-line" />
            <p>Complete prerequisites first:</p>
            <ul>
              {(skill.prerequisiteIds || []).map(pid => {
                const prereq = topic.skills.find(s => s.id === pid)
                return prereq ? <li key={pid}>{prereq.name}</li> : null
              })}
            </ul>
          </div>
        ) : (
          <>
            <div className="skill-panel__lessons">
              {skill.lessons.map((lesson, idx) => {
                const lKey = `${programId}/${subjectId}/${topicId}/${skill.id}/${idx}`
                const lp   = lessonProgress[lKey]           // saved mid-lesson state
                const hasSave = lp && lp.qIdx > 0
                const resumePct = hasSave
                  ? Math.round((lp.qIdx / lesson.questions.length) * 100)
                  : 0

                return (
                  <button key={lesson.id} className="skill-panel__lesson-btn" onClick={() => onStartLesson(skill, idx)}>
                    <div className="skill-panel__lesson-icon">
                      <i className={hasSave ? 'ri-bookmark-fill' : 'ri-play-circle-line'}
                         style={hasSave ? { color: 'var(--accent)' } : {}} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p className="skill-panel__lesson-title">{lesson.title}</p>
                      {hasSave ? (
                        <>
                          {/* Mini resume progress bar */}
                          <div style={{ height: 4, background: 'var(--border)', borderRadius: 2, overflow: 'hidden', margin: '4px 0 3px' }}>
                            <div style={{ height: '100%', width: `${resumePct}%`, background: 'var(--accent)', borderRadius: 2 }} />
                          </div>
                          <p className="skill-panel__lesson-meta" style={{ color: 'var(--accent)' }}>
                            Resume · Q{lp.qIdx + 1}/{lesson.questions.length} · {resumePct}%
                          </p>
                        </>
                      ) : (
                        <p className="skill-panel__lesson-meta">{lesson.questions.length} questions</p>
                      )}
                    </div>
                    <i className="ri-arrow-right-s-line" />
                  </button>
                )
              })}
            </div>
            {isComplete && (
              <div className="skill-panel__complete-badge">
                <i className="ri-checkbox-circle-fill" /> Complete · {sp.xp} XP earned
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}

// ── XP Toast ──────────────────────────────────────────────────────────
function XpToast({ xp, onDone }) {
  useEffect(() => { const t = setTimeout(onDone, 2200); return () => clearTimeout(t) }, [onDone])
  return (
    <div className="xp-toast">
      <i className="ri-sparkling-2-line" /> +{xp} XP
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────
export default function TopicPage() {
  const router = useRouter()
  const { programId, subjectId, topicId } = router.query
  const { signedIn, setShowAuth, mounted } = useAuth()

  const program = getProgram(programId)
  const subject = getSubject(programId, subjectId)
  const topic   = getTopic(programId, subjectId, topicId)

  const [allProgress, setAllProgress]     = useState({})
  const [lessonProgress, setLessonProgress] = useState({})
  const [stats, setStats]                 = useState({ totalXp: 0, streak: 0 })
  const [activeSkill, setActiveSkill]     = useState(null)
  const [activeLesson, setActiveLesson]   = useState(null)   // { skill, lessonIdx }
  const [xpToast, setXpToast]             = useState(null)

  const refreshProgress = useCallback(() => {
    setAllProgress(getAllSkillProgress())
    setLessonProgress(getAllLessonProgress())
    setStats(getStats())
  }, [])

  useEffect(() => { if (mounted) refreshProgress() }, [mounted, signedIn, refreshProgress])

  if (!program || !subject || !topic) return null

  function sKey(skillId) {
    return skillKey(programId, subjectId, topicId, skillId)
  }

  function isSkillLocked(skill) {
    if (!skill.prerequisiteIds?.length) return false
    return skill.prerequisiteIds.some(pid => {
      const sp = allProgress[sKey(pid)]
      return !sp || (sp.status !== 'complete' && sp.status !== 'mastered')
    })
  }

  function handleSkillClick(skill) {
    if (!mounted) return
    if (!signedIn) { setShowAuth(true); return }
    setActiveSkill(skill)
  }

  function handleStartLesson(skill, lessonIdx) {
    setActiveSkill(null)
    setActiveLesson({ skill, lessonIdx })
  }

  async function handleLessonComplete(xpEarned, correct, total) {
    const skill = activeLesson.skill
    setActiveLesson(null)
    if (correct / total >= 0.6) {
      await completeSkill(programId, subjectId, topicId, skill.id, xpEarned)
    } else {
      await addXp(Math.floor(xpEarned / 2))
    }
    refreshProgress()
    setXpToast(xpEarned)
  }

  // Group by tier
  const tiers = {}
  for (const skill of topic.skills) {
    const t = skill.tier || 1
    if (!tiers[t]) tiers[t] = []
    tiers[t].push(skill)
  }
  const tierNums = Object.keys(tiers).map(Number).sort()
  const tierLabels = { 1: 'Foundations', 2: 'Core concepts', 3: 'Building blocks', 4: 'Applications', 5: 'Advanced' }

  return (
    <>
      <Head>
        <title>{topic.name} · {subject.name} · Feyn</title>
        <meta name="description" content={topic.description} />
      </Head>
      <Nav />

      {/* Lesson engine overlay */}
      {activeLesson && (
        <div className="lesson-overlay">
          <LessonEngine
            lesson={activeLesson.skill.lessons[activeLesson.lessonIdx]}
            programId={programId}
            subjectId={subjectId}
            topicId={topicId}
            skillId={activeLesson.skill.id}
            lessonIdx={activeLesson.lessonIdx}
            onComplete={handleLessonComplete}
            onExit={() => setActiveLesson(null)}
          />
        </div>
      )}

      {activeSkill && (
        <SkillPanel
          skill={activeSkill}
          topic={topic}
          programId={programId}
          subjectId={subjectId}
          topicId={topicId}
          progress={allProgress[sKey(activeSkill.id)]}
          lessonProgress={lessonProgress}
          isLocked={isSkillLocked(activeSkill)}
          onStartLesson={handleStartLesson}
          onClose={() => setActiveSkill(null)}
        />
      )}

      {xpToast !== null && <XpToast xp={xpToast} onDone={() => setXpToast(null)} />}

      <main>
        {/* Breadcrumb header */}
        <div className="unit-header">
          <div className="container">
            <div className="unit-header__inner">
              <div className="unit-header__left">
                <div className="unit-header__icon"><i className={topic.icon} /></div>
                <div>
                  <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.65rem', color: 'var(--text-3)', marginBottom: 4 }}>
                    <Link href={`/${programId}`}>{program.name}</Link>
                    <span style={{ margin: '0 5px' }}>›</span>
                    <Link href={`/${programId}/${subjectId}`}>{subject.name}</Link>
                  </p>
                  <h1 className="unit-header__name">{topic.name}</h1>
                  <p className="unit-header__tagline">{topic.description}</p>
                  {/* Topic-level progress bar */}
                  {mounted && signedIn && topic.skills.length > 0 && (() => {
                    const totalSkills = topic.skills.length
                    const doneSkills  = topic.skills.filter(s => {
                      const sp = allProgress[sKey(s.id)]
                      return sp?.status === 'complete' || sp?.status === 'mastered'
                    }).length
                    const pct = Math.round(doneSkills / totalSkills * 100)
                    return (
                      <div style={{ marginTop: 10, display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{ flex: 1, maxWidth: 220, height: 5, background: 'var(--border)', borderRadius: 3, overflow: 'hidden' }}>
                          <div style={{ height: '100%', width: `${pct}%`, background: 'var(--accent)', borderRadius: 3, transition: 'width 500ms ease' }} />
                        </div>
                        <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.62rem', color: 'var(--text-3)', letterSpacing: '0.06em', whiteSpace: 'nowrap' }}>
                          {doneSkills}/{totalSkills} skills · {pct}%
                        </span>
                      </div>
                    )
                  })()}
                </div>
              </div>
              {mounted && signedIn && (
                <div className="unit-header__stats">
                  <div className="unit-header__stat">
                    <i className="ri-fire-line" style={{ color: '#e6631c' }} />
                    <span>{stats.streak}d</span>
                  </div>
                  <div className="unit-header__stat">
                    <i className="ri-sparkling-2-line" style={{ color: 'var(--accent)' }} />
                    <span>{stats.totalXp} XP</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="container">
          {topic.skills.length === 0 ? (
            <div className="coming-soon-block" style={{ margin: '60px 0' }}>
              <i className="ri-time-line" />
              <p>Skills for {topic.name} are being prepared. Check back soon.</p>
            </div>
          ) : (
            <div className="skill-map">
              {tierNums.map((tier, i) => (
                <div key={tier} className="skill-tier">
                  <p className="skill-tier__label">{tierLabels[tier] || `Tier ${tier}`}</p>
                  <div className="skill-tier__nodes">
                    {tiers[tier].map(skill => (
                      <SkillNode
                        key={skill.id}
                        skill={skill}
                        sKey={sKey(skill.id)}
                        progress={mounted ? allProgress[sKey(skill.id)] : null}
                        lessonProgress={mounted ? lessonProgress : {}}
                        programId={programId}
                        subjectId={subjectId}
                        topicId={topicId}
                        isLocked={mounted ? isSkillLocked(skill) : false}
                        onClick={handleSkillClick}
                      />
                    ))}
                  </div>
                  {i < tierNums.length - 1 && (
                    <div className="skill-tier__connector"><i className="ri-arrow-down-line" /></div>
                  )}
                </div>
              ))}
            </div>
          )}

          {mounted && !signedIn && topic.skills.length > 0 && (
            <div className="unit-guest-prompt">
              <i className="ri-user-line unit-guest-prompt__icon" />
              <p>Sign in to track progress and earn XP.</p>
              <button className="btn btn--accent" onClick={() => setShowAuth(true)}>
                <i className="ri-user-add-line" /> Join free
              </button>
            </div>
          )}
        </div>
      </main>
      <Footer />
    </>
  )
}
