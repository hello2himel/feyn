import Head from 'next/head'
import Link from 'next/link'
import { useState, useEffect, useCallback } from 'react'
import data from '../data/index.js'
import { getClasses, getInterests, getCoachesFor, getTotalLessons, getSubjectFirstVideo } from '../data/courseHelpers'
import { Nav, Footer, DonateStrip, YTThumb, ProgressBar, useAuth } from '../components/Layout'
import { getEnrolled, getSubjectProgress, getLastActivity } from '../lib/userStore'

function resolveLastActivity(activity) {
  if (!activity) return null
  const { programId, subjectId, topicId, lessonId } = activity
  const program = data.programs.find(p => p.id === programId)
  const subject = program?.subjects.find(s => s.id === subjectId)
  const topic   = subject?.topics.find(t => t.id === topicId)
  if (!program || !subject || !topic) return null
  let foundSkill = null, foundLesson = null
  for (const skill of (topic.skills || [])) {
    const lesson = skill.lessons?.find(l => l.id === lessonId)
    if (lesson) { foundSkill = skill; foundLesson = lesson; break }
  }
  if (!foundLesson) return null
  return { program, subject, topic, skill: foundSkill, lesson: foundLesson, programId, subjectId, topicId, lessonId }
}

function ContinueCard({ activity }) {
  const resolved = resolveLastActivity(activity)
  if (!resolved) return null
  const { program, subject, topic, skill, lesson, programId, subjectId, topicId, lessonId } = resolved
  const href = `/${programId}/${subjectId}/${topicId}/${skill.id}/${lessonId}`
  const pct  = getSubjectProgress(programId, subjectId, subject)
  const hasThumb = lesson.videoId && lesson.videoId !== 'YOUTUBE_ID_HERE'
  return (
    <div className="continue-card">
      <Link href={href} className="continue-card__overlay-link" aria-label={`Continue: ${lesson.title}`} />
      <div className="continue-card__thumb">
        {hasThumb ? (
          <>
            <img src={`https://i.ytimg.com/vi/${lesson.videoId}/mqdefault.jpg`} alt={lesson.title} crossOrigin="anonymous" />
            <div className="continue-card__play-overlay">
              <div className="continue-card__play-btn"><i className="ri-play-fill" /></div>
            </div>
          </>
        ) : (
          <div className="continue-card__thumb-placeholder"><i className="ri-play-circle-line" /></div>
        )}
        <div className="continue-card__thumb-bar">
          <div className="continue-card__thumb-fill" style={{ width: `${pct}%` }} />
        </div>
      </div>
      <div className="continue-card__body">
        <p className="continue-card__eyebrow"><i className="ri-history-line" /> Continue watching</p>
        <h3 className="continue-card__title">{lesson.title}</h3>
        <p className="continue-card__breadcrumb">
          <span>{program.name}</span><i className="ri-arrow-right-s-line" /><span>{subject.name}</span><i className="ri-arrow-right-s-line" /><span>{topic.name}</span>
        </p>
        <div className="continue-card__meta">
          {lesson.duration && <span><i className="ri-time-line" /> {lesson.duration}</span>}
          <span><i className="ri-bar-chart-line" /> {pct}% of {subject.name}</span>
        </div>
      </div>
      <div className="continue-card__arrow"><i className="ri-arrow-right-line" /></div>
    </div>
  )
}

function FeedCard({ program, subject, enrolled, pct, mounted }) {
  const coaches  = getCoachesFor(subject.coachIds || [])
  const firstVid = getSubjectFirstVideo(subject)
  const total    = getTotalLessons(subject)
  const isSoon   = subject.comingSoon

  return (
    <div className={`feed-card${isSoon ? ' feed-card--soon' : ''}`}>
      {!isSoon && (
        <Link href={`/${program.id}/${subject.id}`} className="feed-card__overlay-link" aria-label={subject.name} />
      )}
      <div className="feed-card__thumb">
        <YTThumb videoId={firstVid} alt={subject.name} />
        {isSoon && (
          <div className="feed-card__soon-overlay">
            <span className="feed-card__soon-tag"><i className="ri-time-line" /> Coming soon</span>
          </div>
        )}
        {!isSoon && mounted && enrolled && (
          <div className="feed-card__progress-bar">
            <div className="feed-card__progress-fill" style={{ width: `${pct}%` }} />
          </div>
        )}
      </div>
      <div className="feed-card__body">
        <p className="feed-card__program">
          <Link href={`/${program.id}`} className="feed-card__program-link" style={{ position:'relative',zIndex:2 }}>{program.name}</Link>
        </p>
        <h3 className="feed-card__title">{subject.name}</h3>
        <p className="feed-card__desc">{subject.description}</p>
        {coaches.length > 0 && !isSoon && <p className="feed-card__coach"><i className="ri-user-line" /> {coaches.map(c=>c.name).join(', ')}</p>}
        <div className="feed-card__meta">
          {isSoon ? (
            <span style={{fontStyle:'italic',color:'var(--text-3)'}}>In preparation</span>
          ) : (
            <>
              <span><i className="ri-folder-line" /> {subject.topics.length}</span>
              <span><i className="ri-play-line" /> {total}</span>
              {subject.certificate && <span><i className="ri-medal-line" /></span>}
              {mounted && enrolled && <span className="feed-card__enrolled-tag"><i className="ri-checkbox-circle-fill" /> {pct}%</span>}
            </>
          )}
        </div>
      </div>
    </div>
  )
}

export default function Home() {
  const { signedIn, setShowAuth, user, mounted } = useAuth()
  const [enrolledMap, setEnrolledMap] = useState({})
  const [progressMap, setProgressMap] = useState({})
  const [lastActivity, setLastActivity] = useState(null)

  const buildMaps = useCallback(() => {
    const eMap = {}, pMap = {}
    for (const program of data.programs)
      for (const subject of program.subjects) {
        const k = `${program.id}/${subject.id}`
        eMap[k] = getEnrolled().includes(k)
        pMap[k] = getSubjectProgress(program.id, subject.id, subject)
      }
    setEnrolledMap(eMap)
    setProgressMap(pMap)
    setLastActivity(getLastActivity())
  }, [])

  useEffect(() => { if (mounted) buildMaps() }, [mounted, signedIn, buildMaps])

  const classes   = getClasses()
  const interests = getInterests()

  // Split every subject into enrolled vs unenrolled
  const allSubjects = [...classes, ...interests].flatMap(p =>
    p.subjects.map(s => ({ program: p, subject: s }))
  )
  const mySubjects      = allSubjects.filter(({ program: p, subject: s }) => !!enrolledMap[`${p.id}/${s.id}`])
  const exploreSubjects = allSubjects.filter(({ program: p, subject: s }) => !enrolledMap[`${p.id}/${s.id}`])

  return (
    <>
      <Head>
        <title>Feyn — Learn from first principles</title>
        <meta name="description" content="Feyn is a structured video learning platform. Watch, understand, then prove it with questions." />
      </Head>
      <Nav />
      <main>

        {/* ══ LANDING (guests only) ══ */}
        {(!mounted || !signedIn) && (
          <div className="landing-hero">
            <div className="landing-hero__inner container">
              <div className="landing-hero__content">
                <div className="landing-hero__eyebrow">
                  <span className="landing-hero__badge"><i className="ri-sparkling-2-line" /> Understanding, rebuilt.</span>
                </div>
                <h1 className="landing-hero__title">
                  Learn the way<br /><span className="landing-hero__accent">Feynman would.</span>
                </h1>
                <p className="landing-hero__sub">
                  Watch a lesson. Answer questions that test whether you actually understood it.
                  Move on only when you can explain it. No memorisation. No skipped steps. No fluff.
                </p>
                <p className="landing-hero__quote">
                  <i className="ri-double-quotes-l" />{' '}If you can't explain it simply, you don't understand it well enough.{' '}<i className="ri-double-quotes-r" />
                  <span className="landing-hero__quote-attr">Richard Feynman</span>
                </p>
                <div className="landing-hero__actions">
                  {mounted && !signedIn && (
                    <button className="btn btn--accent landing-btn" onClick={() => setShowAuth(true)}>
                      <i className="ri-user-add-line" /> Join free
                    </button>
                  )}
                  <a href="#courses" className="btn btn--ghost landing-btn">
                    <i className="ri-play-circle-line" /> Browse courses
                  </a>
                </div>
              </div>
              <div className="landing-pills">
                {[
                  { icon:'ri-play-circle-line',   text:'Watch, then prove you got it' },
                  { icon:'ri-brain-line',          text:'Intuition before formulas' },
                  { icon:'ri-question-answer-line',text:'Questions after every video' },
                  { icon:'ri-lock-unlock-line',    text:'Completely free. No catch.' },
                  { icon:'ri-medal-line',          text:'Earn real certificates' },
                  { icon:'ri-heart-line',          text:'Built with love by STΛRGZR' },
                ].map(p => (
                  <div key={p.text} className="landing-pill"><i className={p.icon} /><span>{p.text}</span></div>
                ))}
              </div>
            </div>

            <div className="landing-body container" id="courses">
              <aside className="landing-sidebar landing-sidebar--accented">
                <p className="landing-sidebar__label">What is Feyn?</p>
                <p className="landing-sidebar__text">
                  Feyn is a learning platform where every lesson follows the same structure: watch a video
                  that builds the idea from scratch, then answer questions that test genuine understanding — not just whether you watched.
                </p>
                <p className="landing-sidebar__text">
                  We cover HSC, SSC and JSC in full, plus interest courses in astronomy, programming, philosophy and more.
                </p>
                {mounted && !signedIn && (
                  <button className="btn btn--accent btn--sm" onClick={() => setShowAuth(true)} style={{ marginTop:20 }}>
                    <i className="ri-user-add-line" /> Join the community
                  </button>
                )}
              </aside>
              <div className="landing-courses">
                <p className="section-label" style={{ marginBottom:18 }}><i className="ri-stack-line" style={{ marginRight:6 }} />Courses</p>
                {classes.length > 0 && (
                  <div style={{ marginBottom:36 }}>
                    <p className="landing-courses__group-label"><i className="ri-graduation-cap-line" /> Academic classes</p>
                    <div className="feed-grid">
                      {classes.flatMap(p => p.subjects.map(s => ({ program:p, subject:s }))).map(({ program, subject }) => (
                        <FeedCard key={`${program.id}/${subject.id}`} program={program} subject={subject} enrolled={false} pct={0} mounted={false} />
                      ))}
                    </div>
                  </div>
                )}
                {interests.length > 0 && (
                  <div>
                    <p className="landing-courses__group-label"><i className="ri-compass-discover-line" /> Interests</p>
                    <div className="feed-grid">
                      {interests.flatMap(p => p.subjects.map(s => ({ program:p, subject:s }))).map(({ program, subject }) => (
                        <FeedCard key={`${program.id}/${subject.id}`} program={program} subject={subject} enrolled={false} pct={0} mounted={false} />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ══ SIGNED-IN HERO ══ */}
        {mounted && signedIn && (
          <div className="container">
            <section className="home-hero home-hero--signedin">
              <div className="home-hero__left">
                <p className="home-hero__eyebrow"><i className="ri-sparkling-line" /> Welcome back</p>
                <h1 className="home-hero__title">Hi, {user?.name} <span className="home-hero__wave">👋</span></h1>
                <p className="home-hero__sub">Pick up where you left off.</p>
                <div className="home-hero__actions">
                  <Link href="/settings" className="btn btn--ghost btn--sm"><i className="ri-settings-3-line" /> Settings</Link>
                </div>
              </div>
              <div className="home-hero__continue">
                {lastActivity ? <ContinueCard activity={lastActivity} /> : (
                  <div className="continue-card-empty">
                    <i className="ri-play-circle-line" />
                    <p>Start your first lesson to track progress here.</p>
                    <a href="#my-courses" className="btn btn--accent btn--sm"><i className="ri-compass-discover-line" /> Browse your courses</a>
                  </div>
                )}
              </div>
            </section>
          </div>
        )}

        {/* ══ SIGNED-IN FEED ══ */}
        {mounted && signedIn && (
          <div className="container" style={{ paddingBottom: 80 }}>

            {/* MY COURSES — enrolled only */}
            <section className="feed-section" id="my-courses">
              <div className="feed-section__header">
                <div className="feed-section__header-left">
                  <i className="ri-bookmark-fill" />
                  <h2 className="feed-section__title">My Courses</h2>
                  <span className="feed-section__count">{mySubjects.length}</span>
                </div>
                <Link href="/settings" className="feed-section__header-link">
                  <i className="ri-settings-3-line" /> Manage
                </Link>
              </div>

              {mySubjects.length === 0 ? (
                <div className="feed-empty">
                  <i className="ri-inbox-line" />
                  <p>You haven't enrolled in any courses yet.</p>
                  <p className="feed-empty__sub">Scroll down to explore all courses and enrol.</p>
                </div>
              ) : (
                <div className="feed-grid">
                  {mySubjects.map(({ program, subject }) => (
                    <FeedCard
                      key={`${program.id}/${subject.id}`}
                      program={program} subject={subject}
                      enrolled={true}
                      pct={progressMap[`${program.id}/${subject.id}`] || 0}
                      mounted={mounted}
                    />
                  ))}
                </div>
              )}
            </section>

            {/* EXPLORE ALL — unenrolled */}
            {exploreSubjects.length > 0 && (
              <section className="feed-section feed-section--explore" id="explore">
                <div className="feed-section__header">
                  <div className="feed-section__header-left">
                    <i className="ri-compass-discover-line" />
                    <h2 className="feed-section__title">Explore All Courses</h2>
                    <span className="feed-section__count">{exploreSubjects.length}</span>
                  </div>
                </div>
                <div className="feed-grid">
                  {exploreSubjects.map(({ program, subject }) => (
                    <FeedCard
                      key={`${program.id}/${subject.id}`}
                      program={program} subject={subject}
                      enrolled={false}
                      pct={0}
                      mounted={mounted}
                    />
                  ))}
                </div>
              </section>
            )}

            <DonateStrip />
          </div>
        )}

      </main>
      <Footer />
    </>
  )
}
