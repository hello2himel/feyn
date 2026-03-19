import Head from 'next/head'
import Link from 'next/link'
import { useState, useEffect, useCallback } from 'react'
import data from '../data/courses'
import { getCoachesFor, getTotalLessons, classifySubjects, getClasses, getInterests, getProgram, getSubject, getTopic, getLessonNav } from '../data/courseHelpers'
import { Nav, Footer, DonateStrip, YTThumb, ProgressBar, useAuth } from '../components/Layout'
import { getEnrolled, getSubjectProgress, getFeedOrder, saveFeedOrder, getLastActivity } from '../lib/userStore'

// ── Site-wide metrics (computed from courses.js) ──────────────────────
function getSiteMetrics() {
  let totalLessons = 0, totalTopics = 0, totalCourses = 0, totalCoaches = 0
  const coachSet = new Set()
  for (const program of data.programs) {
    for (const subject of program.subjects) {
      totalCourses++
      for (const cId of (subject.coachIds || [])) coachSet.add(cId)
      for (const topic of subject.topics) {
        totalTopics++
        totalLessons += topic.lessons.length
      }
    }
  }
  return {
    programs: data.programs.length,
    courses:  totalCourses,
    lessons:  totalLessons,
    coaches:  coachSet.size,
  }
}

// ── Continue where you left off ───────────────────────────────────────
// Shows the exact lesson the user last opened/played.
// "Next lesson" logic only kicks in if that lesson is fully watched.
function resolveCurrentLesson(activity) {
  if (!activity) return null
  const { programId, subjectId, topicId, lessonId } = activity

  const program = getProgram(programId)
  const subject = getSubject(programId, subjectId)
  const topic   = getTopic(programId, subjectId, topicId)
  if (!program || !subject || !topic) return null

  const lesson = topic.lessons.find(l => l.id === lessonId)
  if (!lesson) return null

  return { program, subject, topic, lesson, programId, subjectId, topicId, lessonId }
}

function ContinueCard({ activity }) {
  const resolved = resolveCurrentLesson(activity)
  if (!resolved) return null

  const { program, subject, topic, lesson, programId, subjectId, topicId, lessonId } = resolved
  const href = `/${programId}/${subjectId}/${topicId}/${lessonId}`
  const pct  = getSubjectProgress(programId, subjectId, subject)
  const hasThumb = lesson.videoId && lesson.videoId !== 'YOUTUBE_ID_HERE'

  return (
    <div className="continue-card">
      <Link href={href} className="continue-card__overlay-link" aria-label={`Continue: ${lesson.title}`} />
      {/* Thumbnail */}
      <div className="continue-card__thumb">
        {hasThumb ? (
          <>
            <img src={`https://i.ytimg.com/vi/${lesson.videoId}/mqdefault.jpg`} alt={lesson.title} crossOrigin="anonymous" />
            <div className="continue-card__play-overlay">
              <div className="continue-card__play-btn">
                <i className="ri-play-fill" />
              </div>
            </div>
          </>
        ) : (
          <div className="continue-card__thumb-placeholder">
            <i className="ri-play-circle-line" />
          </div>
        )}
        <div className="continue-card__thumb-bar">
          <div className="continue-card__thumb-fill" style={{ width: `${pct}%` }} />
        </div>
      </div>

      <div className="continue-card__body">
        <p className="continue-card__eyebrow">
          <i className="ri-history-line" /> Continue watching
        </p>
        <h3 className="continue-card__title">{lesson.title}</h3>
        <p className="continue-card__breadcrumb">
          <span>{program.name}</span>
          <i className="ri-arrow-right-s-line" />
          <span>{subject.name}</span>
          <i className="ri-arrow-right-s-line" />
          <span>{topic.name}</span>
        </p>
        <div className="continue-card__meta">
          {lesson.duration && <span><i className="ri-time-line" /> {lesson.duration}</span>}
          <span><i className="ri-bar-chart-line" /> {pct}% of {subject.name}</span>
        </div>
      </div>

      <div className="continue-card__arrow">
        <i className="ri-arrow-right-line" />
      </div>
    </div>
  )
}


function FeedCard({ program, subject, enrolled, pct, mounted }) {
  const coaches  = getCoachesFor(subject.coachIds || [])
  const firstVid = subject.topics[0]?.lessons[0]?.videoId
  const total    = getTotalLessons(subject)
  return (
    <div className="feed-card">
      <Link href={`/${program.id}/${subject.id}`} className="feed-card__overlay-link" aria-label={subject.name} />
      <div className="feed-card__thumb">
        <YTThumb videoId={firstVid} alt={subject.name} />
        {mounted && enrolled && (
          <div className="feed-card__progress-bar">
            <div className="feed-card__progress-fill" style={{ width: `${pct}%` }} />
          </div>
        )}
      </div>
      <div className="feed-card__body">
        <p className="feed-card__program">
          <Link href={`/${program.id}`} className="feed-card__program-link" style={{ position: 'relative', zIndex: 2 }}>{program.name}</Link>
        </p>
        <h3 className="feed-card__title">{subject.name}</h3>
        <p className="feed-card__desc">{subject.description}</p>
        {coaches.length > 0 && <p className="feed-card__coach"><i className="ri-user-line" /> {coaches.map(c => c.name).join(', ')}</p>}
        <div className="feed-card__meta">
          <span><i className="ri-folder-line" /> {subject.topics.length}</span>
          <span><i className="ri-play-line" /> {total}</span>
          {subject.certificate && <span><i className="ri-medal-line" /></span>}
          {mounted && enrolled && <span className="feed-card__enrolled-tag"><i className="ri-checkbox-circle-fill" /> {pct}%</span>}
        </div>
      </div>
    </div>
  )
}

function FeedSection({ title, icon, items, enrolledMap, progressMap, mounted }) {
  const [collapsed, setCollapsed] = useState(false)
  return (
    <section className="feed-section">
      <div className="feed-section__header">
        <div className="feed-section__header-left">
          <i className={icon} />
          <h2 className="feed-section__title">{title}</h2>
          <span className="feed-section__count">{items.length}</span>
        </div>
        <div className="feed-section__header-right">
          <button className="feed-reorder-btn" onClick={() => setCollapsed(c => !c)}>
            <i className={`ri-arrow-${collapsed ? 'down' : 'up'}-s-line`} />
          </button>
        </div>
      </div>
      {!collapsed && (
        <div className="feed-grid">
          {items.map(({ program, subject }) => (
            <FeedCard key={`${program.id}/${subject.id}`} program={program} subject={subject}
              enrolled={!!enrolledMap[`${program.id}/${subject.id}`]}
              pct={progressMap[`${program.id}/${subject.id}`] || 0}
              mounted={mounted} />
          ))}
        </div>
      )}
    </section>
  )
}

// ── Page ──────────────────────────────────────────────────────────────
export default function Home() {
  const { signedIn, setShowAuth, user, mounted } = useAuth()
  const [feedSections, setFeedSections]   = useState([])
  const [enrolledMap, setEnrolledMap]     = useState({})
  const [progressMap, setProgressMap]     = useState({})
  const [settingsOpen, setSettingsOpen]   = useState(false)
  const [lastActivity, setLastActivity]   = useState(null)
  const metrics = getSiteMetrics()

  const buildFeed = useCallback(() => {
    const enrolledKeys = getEnrolled()
    const eMap = {}, pMap = {}
    for (const program of data.programs)
      for (const subject of program.subjects) {
        const k = `${program.id}/${subject.id}`
        eMap[k] = enrolledKeys.includes(k)
        pMap[k] = getSubjectProgress(program.id, subject.id, subject)
      }
    setEnrolledMap(eMap); setProgressMap(pMap)

    const { classes, genres } = classifySubjects(data.programs)
    const order = getFeedOrder()

    if (signedIn && order.length > 0) {
      const eCls = classes.filter(x => eMap[`${x.program.id}/${x.subject.id}`])
      const eGnr = genres.filter(x  => eMap[`${x.program.id}/${x.subject.id}`])
      const uCls = classes.filter(x => !eMap[`${x.program.id}/${x.subject.id}`])
      const uGnr = genres.filter(x  => !eMap[`${x.program.id}/${x.subject.id}`])
      const sections = []
      const seen = new Set()
      for (const item of order) {
        if (seen.has(item.type)) continue; seen.add(item.type)
        if (item.type==='class' && eCls.length) sections.push({ id:'classes', title:'My Classes', icon:'ri-graduation-cap-line', type:'class', items:eCls })
        if (item.type==='genre' && eGnr.length) sections.push({ id:'genres',  title:'My Interests', icon:'ri-heart-line', type:'genre', items:eGnr })
      }
      if (uCls.length) sections.push({ id:'xclasses', title:'Explore Classes',   icon:'ri-book-open-line',        type:'explore', items:uCls })
      if (uGnr.length) sections.push({ id:'xgenres',  title:'Explore Interests', icon:'ri-compass-discover-line', type:'explore', items:uGnr })
      setFeedSections(sections.filter(s => s.items.length))
    } else {
      const sections = data.programs.map(p => ({
        id: p.id, title: p.name,
        icon: p.type === 'class' ? 'ri-graduation-cap-line' : 'ri-compass-discover-line',
        type: 'program',
        items: p.subjects.map(s => ({ program: p, subject: s })),
      })).filter(s => s.items.length)
      setFeedSections(sections)
    }
  }, [signedIn])

  useEffect(() => { if (mounted) { buildFeed(); setLastActivity(getLastActivity()) } }, [mounted, buildFeed])
  useEffect(() => {
    if (typeof window === 'undefined') return
    const handler = () => buildFeed()
    window.addEventListener('feyn:auth', handler)
    return () => window.removeEventListener('feyn:auth', handler)
  }, [buildFeed])

  function moveSection(idx, dir) {
    const next = [...feedSections]
    ;[next[idx], next[idx+dir]] = [next[idx+dir], next[idx]]
    setFeedSections(next)
    // Save all sections (not just enrolled) so order persists before enrollments exist.
    saveFeedOrder(next.flatMap(s =>
      s.items.map(({ program, subject }) => ({
        type: (s.type === 'explore' || s.type === 'program') ? 'genre' : s.type,
        programId: program.id, subjectId: subject.id,
      }))
    ))
  }
  const classes   = getClasses()
  const interests = getInterests()

  return (
    <>
      <Head>
        <title>Feyn, Learn from first principles</title>
        <meta name="description" content="Feyn is a structured video learning platform inspired by Feynman Files. Every concept built from the ground up, one idea, one lesson." />
      </Head>
      <Nav />
      <main>

        {/* ══════════════════════════════════════════
            LANDING, shown to guests only
            ══════════════════════════════════════════ */}
        {(!mounted || !signedIn) && (
          <div className="landing-hero">

            {/* ── HERO ── */}
            <div className="landing-hero__inner container">
              <div className="landing-hero__content">
                <div className="landing-hero__eyebrow">
                  <span className="landing-hero__badge">
                    <i className="ri-sparkling-2-line" /> Understanding, rebuilt.
                  </span>
                </div>
                <h1 className="landing-hero__title">
                  Learn the way<br />
                  <span className="landing-hero__accent">Feynman would.</span>
                </h1>
                <p className="landing-hero__sub">
                  Feyn is where STΛRGZR teaches. Every lesson starts from scratch,
                  builds slowly, and earns your understanding before moving on.
                  No skipped steps. No assumed knowledge. No fluff.
                </p>
                <p className="landing-hero__quote">
                  <i className="ri-double-quotes-l" />
                  {' '}If you can't explain it simply, you don't understand it well enough.{' '}
                  <i className="ri-double-quotes-r" />
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

              {/* Pills, values, not metrics */}
              <div className="landing-pills">
                {[
                  { icon: 'ri-seedling-line',      text: 'Start from zero. Always.' },
                  { icon: 'ri-brain-line',          text: 'Intuition before formulas' },
                  { icon: 'ri-group-line',          text: 'Taught by people who get it' },
                  { icon: 'ri-lock-unlock-line',    text: 'Completely free. No catch.' },
                  { icon: 'ri-medal-line',          text: 'Earn real certificates' },
                  { icon: 'ri-heart-line',          text: 'Built with love by STΛRGZR' },
                ].map(p => (
                  <div key={p.text} className="landing-pill">
                    <i className={p.icon} />
                    <span>{p.text}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* ── WHAT IS FEYN + COURSES ── */}
            <div className="landing-body container" id="courses">
              {/* Sticky sidebar: what is Feyn — accented background */}
              <aside className="landing-sidebar landing-sidebar--accented">
                <p className="landing-sidebar__label">What is Feyn?</p>
                <p className="landing-sidebar__text">
                  Feyn is the learning platform of <strong>STΛRGZR</strong>, a community
                  for students who refuse to learn by memorisation alone.
                </p>
                <p className="landing-sidebar__text">
                  It grew out of <strong>Feynman Files</strong>, a peer teaching series
                  where students explained things the way they wished someone had explained
                  it to them. That spirit is now a full platform.
                </p>
                <p className="landing-sidebar__text">
                  We cover HSC, SSC and JSC in full. We also go beyond the syllabus
                  because curiosity does not stop at the exam.
                </p>
                {mounted && !signedIn && (
                  <button className="btn btn--accent btn--sm" onClick={() => setShowAuth(true)} style={{ marginTop: 20 }}>
                    <i className="ri-user-add-line" /> Join the community
                  </button>
                )}
              </aside>

              {/* Course grid */}
              <div className="landing-courses">
                <p className="section-label" style={{ marginBottom: 18 }}>
                  <i className="ri-stack-line" style={{ marginRight: 6 }} />Flagship courses
                </p>
                {classes.length > 0 && (
                  <div style={{ marginBottom: 36 }}>
                    <p className="landing-courses__group-label">
                      <i className="ri-graduation-cap-line" /> Academic classes
                    </p>
                    <div className="feed-grid">
                      {classes.flatMap(p => p.subjects.map(s => ({ program: p, subject: s }))).map(({ program, subject }) => (
                        <FeedCard key={`${program.id}/${subject.id}`} program={program} subject={subject} enrolled={false} pct={0} mounted={false} />
                      ))}
                    </div>
                  </div>
                )}
                {interests.length > 0 && (
                  <div>
                    <p className="landing-courses__group-label">
                      <i className="ri-compass-discover-line" /> Interests
                    </p>
                    <div className="feed-grid">
                      {interests.flatMap(p => p.subjects.map(s => ({ program: p, subject: s }))).map(({ program, subject }) => (
                        <FeedCard key={`${program.id}/${subject.id}`} program={program} subject={subject} enrolled={false} pct={0} mounted={false} />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

          </div>
        )}

        {/* ══════════════════════════════════════════
            SIGNED-IN HERO
            ══════════════════════════════════════════ */}
        {mounted && signedIn && (
          <div className="container">
            <section className="home-hero home-hero--signedin">
              <div className="home-hero__left">
                <p className="home-hero__eyebrow"><i className="ri-sparkling-line" /> Welcome back</p>
                <h1 className="home-hero__title">Hi, {user?.name} <span className="home-hero__wave">👋</span></h1>
                <p className="home-hero__sub">Your personalised learning feed.</p>
                <div className="home-hero__actions">
                  {feedSections.length > 0 && (
                    <button className="btn btn--ghost btn--sm" onClick={() => setSettingsOpen(o => !o)}>
                      <i className="ri-settings-3-line" /> Feed settings
                    </button>
                  )}
                  <Link href="/settings" className="btn btn--ghost btn--sm">
                    <i className="ri-edit-line" /> Edit classes
                  </Link>
                </div>
              </div>

              {/* Continue card, or start prompt */}
              <div className="home-hero__continue">
                {lastActivity
                  ? <ContinueCard activity={lastActivity} />
                  : (
                    <div className="continue-card-empty">
                      <i className="ri-play-circle-line" />
                      <p>Start your first lesson to track progress here.</p>
                      <a href="#courses" className="btn btn--accent btn--sm">
                        <i className="ri-compass-discover-line" /> Browse courses
                      </a>
                    </div>
                  )
                }
              </div>
            </section>
          </div>
        )}

        <div className="container" id="courses">

          {/* Feed settings panel */}
          {mounted && signedIn && settingsOpen && (
            <div className="feed-settings-panel">
              <div className="feed-settings-panel__header">
                <span><i className="ri-settings-3-line" /> Feed Order</span>
                <button onClick={() => setSettingsOpen(false)} className="nav__icon-btn"><i className="ri-close-line" /></button>
              </div>
              <p className="feed-settings-panel__hint">Use arrows to reorder sections. Changes save automatically.</p>
              <div className="feed-settings-order">
                {feedSections.map((s, i) => (
                  <div key={s.id} className="feed-settings-row">
                    <i className={s.icon} /><span>{s.title}</span>
                    <span className="feed-settings-row__count">{s.items.length}</span>
                    <div style={{ display:'flex', gap:4, marginLeft:'auto' }}>
                      <button className="feed-reorder-btn" disabled={i===0} onClick={() => moveSection(i,-1)}><i className="ri-arrow-up-s-line" /></button>
                      <button className="feed-reorder-btn" disabled={i===feedSections.length-1} onClick={() => moveSection(i,1)}><i className="ri-arrow-down-s-line" /></button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Feed */}
          {!mounted ? (
            <div style={{ padding:'80px 0', textAlign:'center', color:'var(--text-3)', fontFamily:'var(--font-mono)', fontSize:'0.7rem', letterSpacing:'0.1em' }}>
              LOADING…
            </div>
          ) : feedSections.length > 0 ? (
            feedSections.map((section, idx) => (
              <FeedSection key={section.id} title={section.title} icon={section.icon} items={section.items}
                enrolledMap={enrolledMap} progressMap={progressMap} mounted={mounted} />
            ))
          ) : (
            // Guest default: classes block + interests block
            <>
              {classes.length > 0 && (
                <section className="feed-section">
                  <div className="feed-section__header">
                    <div className="feed-section__header-left">
                      <i className="ri-graduation-cap-line" />
                      <h2 className="feed-section__title">Academic Classes</h2>
                      <span className="feed-section__count">{classes.reduce((a,p)=>a+p.subjects.length,0)}</span>
                    </div>
                  </div>
                  <div className="feed-grid">
                    {classes.flatMap(p => p.subjects.map(s => ({ program:p, subject:s }))).map(({ program, subject }) => (
                      <FeedCard key={`${program.id}/${subject.id}`} program={program} subject={subject} enrolled={false} pct={0} mounted={mounted} />
                    ))}
                  </div>
                </section>
              )}
              {interests.length > 0 && (
                <section className="feed-section">
                  <div className="feed-section__header">
                    <div className="feed-section__header-left">
                      <i className="ri-compass-discover-line" />
                      <h2 className="feed-section__title">Explore Interests</h2>
                      <span className="feed-section__count">{interests.reduce((a,p)=>a+p.subjects.length,0)}</span>
                    </div>
                  </div>
                  <div className="feed-grid">
                    {interests.flatMap(p => p.subjects.map(s => ({ program:p, subject:s }))).map(({ program, subject }) => (
                      <FeedCard key={`${program.id}/${subject.id}`} program={program} subject={subject} enrolled={false} pct={0} mounted={mounted} />
                    ))}
                  </div>
                </section>
              )}
            </>
          )}

          <DonateStrip />
        </div>
      </main>
      <Footer />
    </>
  )
}
