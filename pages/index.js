// ============================================================
// pages/index.js — the front door, in two modes
//
// GUEST: one promise, one primary action, three steps, then the
// catalogue. Everything else (teaching, donating, legal, coaches)
// lives in the footer, because a first-time visitor needs to
// understand the idea before being offered six side quests.
//
// SIGNED IN: resume first, your courses second, discovery last and
// deliberately short. The old version rendered every enrolled course
// AND every unenrolled course as equal-weight cards, so a full
// catalogue read as one undifferentiated wall.
// ============================================================

import Head from 'next/head'
import Link from 'next/link'
import { useState, useEffect, useCallback, useMemo } from 'react'
import { getTotalLessons, getSubjectFirstVideo } from '../data/courseHelpers'
import { useCatalog } from '../lib/catalog'
import { Nav, Footer, YTThumb, useAuth } from '../components/Layout'
import { getEnrolled, getSubjectProgress, getLastActivity } from '../lib/userStore'

// How many unenrolled courses the signed-in home will show before it
// hands off to search. Discovery is a real need, but not an infinite
// scroll on the page you land on every day.
const DISCOVER_LIMIT = 6

const HOW_IT_WORKS = [
  {
    icon: 'ri-play-circle-line',
    title: 'Watch one idea',
    body: 'Each lesson builds a single idea from scratch. No prerequisites you were never told about.',
  },
  {
    icon: 'ri-question-answer-line',
    title: 'Answer questions',
    body: 'Short questions after every video, written to catch the gap between watching and understanding.',
  },
  {
    icon: 'ri-arrow-right-circle-line',
    title: 'Move on when it clicks',
    body: 'Progress is what you can explain, not what you have played. Nothing is unlocked by sitting through it.',
  },
]

function openSearch() {
  window.dispatchEvent(new CustomEvent('feyn:search'))
}

// ── Resume card ───────────────────────────────────────────────────────
// The progress key is 4 segments (no skill), so the skill slug and the
// display titles come from /api/lesson-resolve rather than a local tree.
function ResumeCard({ activity, subject }) {
  const [resolved, setResolved] = useState(null)

  useEffect(() => {
    if (!activity) return
    let alive = true
    const qs = new URLSearchParams(activity).toString()
    fetch(`/api/lesson-resolve?${qs}`)
      .then(r => r.json())
      .then(j => { if (alive) setResolved(j.resolved || null) })
      .catch(() => {})
    return () => { alive = false }
  }, [activity?.programId, activity?.subjectId, activity?.topicId, activity?.lessonId])

  if (!resolved) return null

  const { subject: resSubject, topic, skill, lesson } = resolved
  const { programId, subjectId, topicId, lessonId } = activity
  const href = `/${programId}/${subjectId}/${topicId}/${skill.id}/${lessonId}`
  const pct  = getSubjectProgress(programId, subjectId, subject)

  return (
    <div className="resume">
      <Link href={href} className="resume__overlay-link" aria-label={`Resume: ${lesson.title}`} />
      <div className="resume__thumb">
        {lesson.videoId
          ? <img src={`https://i.ytimg.com/vi/${lesson.videoId}/mqdefault.jpg`} alt="" crossOrigin="anonymous" />
          : <div className="resume__thumb-placeholder"><i className="ri-play-circle-line" aria-hidden="true" /></div>}
        <span className="resume__play"><i className="ri-play-fill" aria-hidden="true" /></span>
      </div>
      <div className="resume__body">
        <p className="resume__kicker">Pick up where you left off</p>
        <h2 className="resume__title">{lesson.title}</h2>
        <p className="resume__where">{resSubject.name} · {topic.name}</p>
        <div className="resume__progress">
          <span className="resume__bar"><span className="resume__bar-fill" style={{ width: `${pct}%` }} /></span>
          <span className="resume__pct">{pct}%</span>
        </div>
      </div>
      <i className="ri-arrow-right-line resume__arrow" aria-hidden="true" />
    </div>
  )
}

// ── Course card ───────────────────────────────────────────────────────
// One card shape for the whole site. Thumb, where it lives, what it is,
// how long it is — and progress only once there is progress to show.
function CourseCard({ program, subject, pct = null }) {
  const isSoon = subject.comingSoon
  const total  = getTotalLessons(subject)

  return (
    <article className={`course-card${isSoon ? ' course-card--soon' : ''}`}>
      {!isSoon && (
        <Link
          href={`/${program.id}/${subject.id}`}
          className="course-card__overlay-link"
          aria-label={`${subject.name}, ${program.name}`}
        />
      )}
      <div className="course-card__thumb">
        <YTThumb videoId={getSubjectFirstVideo(subject)} alt="" />
        {isSoon && (
          <span className="course-card__soon">
            <i className="ri-time-line" aria-hidden="true" /> Coming soon
          </span>
        )}
        {pct !== null && pct > 0 && (
          <span className="course-card__bar">
            <span className="course-card__bar-fill" style={{ width: `${pct}%` }} />
          </span>
        )}
      </div>
      <div className="course-card__body">
        <p className="course-card__program">{program.name}</p>
        <h3 className="course-card__title">{subject.name}</h3>
        {subject.description && <p className="course-card__desc">{subject.description}</p>}
        <p className="course-card__meta">
          {isSoon
            ? <span>In preparation</span>
            : <>
                <span>{total} {total === 1 ? 'lesson' : 'lessons'}</span>
                {subject.certificate && (
                  <span><i className="ri-medal-line" aria-hidden="true" /> Certificate</span>
                )}
                {pct !== null && pct > 0 && <span className="course-card__pct">{pct}% done</span>}
              </>}
        </p>
      </div>
    </article>
  )
}

function SectionHead({ title, count, action }) {
  return (
    <div className="row-head">
      <h2 className="row-head__title">
        {title}
        {count !== undefined && <span className="row-head__count">{count}</span>}
      </h2>
      {action}
    </div>
  )
}

export default function Home() {
  const { signedIn, setShowAuth, user, mounted } = useAuth()
  const { programs, loading } = useCatalog()

  const [enrolledKeys, setEnrolledKeys] = useState([])
  const [progressMap, setProgressMap]   = useState({})
  const [lastActivity, setLastActivity] = useState(null)
  const [filter, setFilter]             = useState('all')

  const readProgress = useCallback(() => {
    const keys = getEnrolled()
    const pMap = {}
    for (const program of programs)
      for (const subject of program.subjects) {
        const k = `${program.id}/${subject.id}`
        if (keys.includes(k)) pMap[k] = getSubjectProgress(program.id, subject.id, subject)
      }
    setEnrolledKeys(keys)
    setProgressMap(pMap)
    setLastActivity(getLastActivity())
  }, [programs])

  useEffect(() => { if (mounted) readProgress() }, [mounted, signedIn, readProgress])

  const allCourses = useMemo(
    () => programs.flatMap(p => p.subjects.map(s => ({ program: p, subject: s }))),
    [programs]
  )
  const hasClasses   = programs.some(p => p.type === 'class'   && p.subjects.length > 0)
  const hasInterests = programs.some(p => p.type !== 'class' && p.subjects.length > 0)

  const visibleCourses = useMemo(() => {
    if (filter === 'all') return allCourses
    const wantClass = filter === 'classes'
    return allCourses.filter(({ program }) => (program.type === 'class') === wantClass)
  }, [allCourses, filter])

  const mine = allCourses.filter(({ program, subject }) =>
    enrolledKeys.includes(`${program.id}/${subject.id}`))
  const discover = allCourses.filter(({ program, subject }) =>
    !enrolledKeys.includes(`${program.id}/${subject.id}`))

  const resumeSubject = lastActivity
    ? allCourses.find(x => x.program.id === lastActivity.programId
                        && x.subject.id === lastActivity.subjectId)?.subject
    : null

  // Server render and first paint are the guest view; swapping to the
  // signed-in view only after `mounted` keeps hydration stable.
  const showSignedIn = mounted && signedIn

  return (
    <>
      <Head>
        <title>Feyn — Learn from first principles</title>
        <meta
          name="description"
          content="Structured video lessons with questions that test understanding, not attendance. Free, no ads."
        />
      </Head>
      <Nav />

      <main>
        {showSignedIn ? (
          /* ══════════════ SIGNED IN ══════════════ */
          <div className="container home">
            <header className="home__greeting">
              <p className="home__hello">
                {user?.name ? `Welcome back, ${user.name.split(' ')[0]}` : 'Welcome back'}
              </p>
            </header>

            {lastActivity
              ? <ResumeCard activity={lastActivity} subject={resumeSubject} />
              : (
                <div className="home__start">
                  <p className="home__start-text">
                    {mine.length > 0
                      ? 'Nothing in progress yet. Open a course to begin.'
                      : 'You have no courses yet. Find one that interests you.'}
                  </p>
                  <button className="btn btn--accent" onClick={openSearch}>
                    <i className="ri-search-line" aria-hidden="true" /> Find a course
                  </button>
                </div>
              )}

            {mine.length > 0 && (
              <section className="row" aria-labelledby="your-courses">
                <SectionHead title="Your courses" count={mine.length} />
                <div className="course-grid">
                  {mine.map(({ program, subject }) => (
                    <CourseCard
                      key={`${program.id}/${subject.id}`}
                      program={program}
                      subject={subject}
                      pct={progressMap[`${program.id}/${subject.id}`] ?? 0}
                    />
                  ))}
                </div>
              </section>
            )}

            {discover.length > 0 && (
              <section className="row">
                <SectionHead
                  title="More to learn"
                  action={
                    discover.length > DISCOVER_LIMIT ? (
                      <button className="row-head__link" onClick={openSearch}>
                        Browse all {allCourses.length} <i className="ri-arrow-right-line" aria-hidden="true" />
                      </button>
                    ) : null
                  }
                />
                <div className="course-grid">
                  {discover.slice(0, DISCOVER_LIMIT).map(({ program, subject }) => (
                    <CourseCard key={`${program.id}/${subject.id}`} program={program} subject={subject} />
                  ))}
                </div>
              </section>
            )}

            {!loading && allCourses.length === 0 && (
              <p className="empty-state">No courses have been published yet.</p>
            )}
          </div>
        ) : (
          /* ══════════════ GUEST ══════════════ */
          <>
            <section className="lp-hero">
              <div className="container lp-hero__inner">
                <h1 className="lp-hero__title">
                  Learn it well enough<br />
                  <span className="lp-hero__accent">to explain it.</span>
                </h1>
                <p className="lp-hero__sub">
                  Structured video lessons, each followed by questions that check whether you
                  actually understood — not whether you sat through it. Free, no ads.
                </p>
                <div className="lp-hero__actions">
                  <button className="btn btn--accent btn--lg" onClick={() => setShowAuth(true)}>
                    Start learning
                  </button>
                  <a href="#courses" className="lp-hero__secondary">
                    See the courses <i className="ri-arrow-down-line" aria-hidden="true" />
                  </a>
                </div>
                <p className="lp-hero__quote">
                  “If you can't explain it simply, you don't understand it well enough.”
                  <span className="lp-hero__attr">Richard Feynman</span>
                </p>
              </div>
            </section>

            <section className="lp-steps">
              <div className="container lp-steps__grid">
                {HOW_IT_WORKS.map((s, i) => (
                  <div className="lp-step" key={s.title}>
                    <span className="lp-step__num">{i + 1}</span>
                    <h2 className="lp-step__title">{s.title}</h2>
                    <p className="lp-step__body">{s.body}</p>
                  </div>
                ))}
              </div>
            </section>

            <section className="container lp-courses" id="courses">
              <SectionHead
                title="Courses"
                count={allCourses.length || undefined}
                action={
                  hasClasses && hasInterests ? (
                    <div className="seg" role="tablist" aria-label="Filter courses">
                      {[
                        { id: 'all',       label: 'All' },
                        { id: 'classes',   label: 'Classes' },
                        { id: 'interests', label: 'Interests' },
                      ].map(t => (
                        <button
                          key={t.id}
                          role="tab"
                          aria-selected={filter === t.id}
                          className={`seg__btn${filter === t.id ? ' seg__btn--on' : ''}`}
                          onClick={() => setFilter(t.id)}
                        >
                          {t.label}
                        </button>
                      ))}
                    </div>
                  ) : null
                }
              />

              {loading ? (
                <p className="empty-state">Loading courses…</p>
              ) : visibleCourses.length === 0 ? (
                <p className="empty-state">No courses here yet.</p>
              ) : (
                <div className="course-grid">
                  {visibleCourses.map(({ program, subject }) => (
                    <CourseCard key={`${program.id}/${subject.id}`} program={program} subject={subject} />
                  ))}
                </div>
              )}
            </section>

            <section className="lp-close">
              <div className="container lp-close__inner">
                <div>
                  <h2 className="lp-close__title">Free, and staying that way.</h2>
                  <p className="lp-close__body">
                    No ads, no tracking, no paywall. Create an account to save your progress
                    and earn certificates.
                  </p>
                </div>
                <button className="btn btn--accent btn--lg" onClick={() => setShowAuth(true)}>
                  Create a free account
                </button>
              </div>
            </section>
          </>
        )}
      </main>

      <Footer />
    </>
  )
}
