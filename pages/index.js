import Head from 'next/head'
import Link from 'next/link'
import { useState, useEffect } from 'react'
import data, { getProgramsByType } from '../data/index.js'
import { Nav, Footer, useAuth } from '../components/Layout'
import { getStats, getAllSkillProgress, getAllLessonProgress } from '../lib/userStore'

function UnitCard({ unit, skillProgress, mounted }) {
  // Flatten all skills across all subjects and topics in this program
  const allSkills = unit.subjects.flatMap(subj =>
    subj.topics.flatMap(topic =>
      topic.skills.map(skill => ({ subj, topic, skill }))
    )
  )
  const totalSkills = allSkills.length
  const doneSkills  = mounted
    ? allSkills.filter(({ subj, topic, skill }) => {
        const sp = skillProgress[`${unit.id}/${subj.id}/${topic.id}/${skill.id}`]
        return sp?.status === 'complete' || sp?.status === 'mastered'
      }).length
    : 0
  const pct = totalSkills ? Math.round(doneSkills / totalSkills * 100) : 0

  return (
    <Link href={`/${unit.id}`} className="unit-card">
      <div className="unit-card__icon"><i className={unit.icon} /></div>
      <div className="unit-card__body">
        <p className="unit-card__name">{unit.name}</p>
        <p className="unit-card__tagline">{unit.tagline}</p>
        {mounted && (
          <div className="unit-card__progress">
            <div className="unit-card__bar"><div className="unit-card__bar-fill" style={{ width: `${pct}%` }} /></div>
            <span className="unit-card__pct">{doneSkills}/{totalSkills} skills</span>
          </div>
        )}
      </div>
      <i className="ri-arrow-right-s-line unit-card__arrow" />
    </Link>
  )
}

export default function Home() {
  const { signedIn, user, setShowAuth, mounted } = useAuth()
  const [stats, setStats]         = useState({ totalXp: 0, streak: 0 })
  const [skillProgress, setSP]    = useState({})
  const [lessonProgress, setLP]   = useState({})

  useEffect(() => {
    if (mounted) {
      setStats(getStats())
      setSP(getAllSkillProgress())
      setLP(getAllLessonProgress())
    }
  }, [mounted, signedIn])

  return (
    <>
      <Head>
        <title>Feyn — Learn from first principles</title>
        <meta name="description" content="Feyn is a gamified learning platform inspired by Feynman's technique: build every idea from scratch, earn understanding before moving on." />
      </Head>
      <Nav />
      <main>

        {/* ── HERO ── */}
        {(!mounted || !signedIn) && (
          <div className="home-hero-guest">
            <div className="container">
              <div className="home-hero-guest__inner">
                <div className="home-hero-guest__content">
                  <p className="home-hero-guest__eyebrow">
                    <i className="ri-sparkling-2-line" /> Built different.
                  </p>
                  <h1 className="home-hero-guest__title">
                    Learn the way<br />
                    <em>Feynman would.</em>
                  </h1>
                  <p className="home-hero-guest__sub">
                    Not videos. Not notes. Interactive lessons that make you
                    think, answer, get it wrong, and understand why —
                    one question at a time.
                  </p>
                  <blockquote className="home-hero-guest__quote">
                    <i className="ri-double-quotes-l" />
                    If you can't explain it simply, you don't understand it well enough.
                    <i className="ri-double-quotes-r" />
                    <cite>Richard Feynman</cite>
                  </blockquote>
                  <div className="home-hero-guest__actions">
                    {mounted && !signedIn && (
                      <button className="btn btn--accent btn--lg" onClick={() => setShowAuth(true)}>
                        <i className="ri-user-add-line" /> Start learning free
                      </button>
                    )}
                    <Link href={`/${data.programs[0]?.id}`} className="btn btn--ghost btn--lg">
                      <i className="ri-eye-line" /> Browse first
                    </Link>
                  </div>
                </div>
                <div className="home-hero-guest__pills">
                  {[
                    { icon: 'ri-question-answer-line', text: 'Questions, not videos' },
                    { icon: 'ri-brain-line',           text: 'Intuition before formulas' },
                    { icon: 'ri-heart-line',           text: 'Explain before you answer' },
                    { icon: 'ri-shield-check-line',    text: 'Earn real certificates' },
                    { icon: 'ri-fire-line',            text: 'Streak-based motivation' },
                    { icon: 'ri-lock-unlock-line',     text: 'Free forever. No ads.' },
                  ].map(p => (
                    <div key={p.text} className="home-pill">
                      <i className={p.icon} />
                      <span>{p.text}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── SIGNED IN HERO ── */}
        {mounted && signedIn && (
          <div className="home-hero-user container">
            <div className="home-hero-user__left">
              <p className="home-hero-user__eyebrow"><i className="ri-sparkling-line" /> Welcome back</p>
              <h1 className="home-hero-user__name">Hi, {user?.name} <span>👋</span></h1>
              <div className="home-hero-user__stats">
                <div className="home-hero-user__stat">
                  <i className="ri-fire-line" style={{ color: '#e6631c' }} />
                  <span className="home-hero-user__stat-val">{stats.streak}</span>
                  <span className="home-hero-user__stat-label">day streak</span>
                </div>
                <div className="home-hero-user__stat">
                  <i className="ri-sparkling-2-line" style={{ color: 'var(--accent)' }} />
                  <span className="home-hero-user__stat-val">{stats.totalXp}</span>
                  <span className="home-hero-user__stat-label">total XP</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── UNITS LIST ── */}
        <div className="container" style={{ paddingTop: 40, paddingBottom: 80 }}>
          <p className="section-label">
            <i className="ri-stack-line" style={{ marginRight: 6 }} />
            Courses
          </p>
          <div className="units-list">
            {data.programs.map(unit => (
              <UnitCard key={unit.id} unit={unit} skillProgress={skillProgress} mounted={mounted} />
            ))}
          </div>

          {/* Philosophy blurb */}
          <div className="home-philosophy">
            <div className="home-philosophy__inner">
              <i className="ri-lightbulb-line home-philosophy__icon" />
              <div>
                <p className="home-philosophy__title">Why Feyn works differently</p>
                <p className="home-philosophy__body">
                  Most platforms give you information and hope it sticks. Feyn makes you
                  produce answers — you cannot passively watch your way to understanding.
                  Every question is designed so getting it wrong teaches you something.
                  Every explanation unpacks the <em>why</em>, not just the answer.
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </>
  )
}
