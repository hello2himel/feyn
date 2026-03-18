import Head from 'next/head'
import Link from 'next/link'
import { useState, useEffect, useCallback } from 'react'
import data from '../data/courses'
import { getCoachesFor, getTotalLessons, classifySubjects, getClasses, getInterests } from '../data/courseHelpers'
import { Nav, Footer, DonateStrip, YTThumb, ProgressBar, useAuth } from '../components/Layout'
import { getEnrolled, getSubjectProgress, getFeedOrder, saveFeedOrder } from '../lib/userStore'

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

// ── Feed card ─────────────────────────────────────────────────────────
function FeedCard({ program, subject, enrolled, pct, mounted }) {
  const coaches  = getCoachesFor(subject.coachIds || [])
  const firstVid = subject.topics[0]?.lessons[0]?.videoId
  const total    = getTotalLessons(subject)
  return (
    <Link href={`/${program.id}/${subject.id}`} className="feed-card">
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
          <Link href={`/${program.id}`} onClick={e => e.stopPropagation()} className="feed-card__program-link">{program.name}</Link>
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
    </Link>
  )
}

function FeedSection({ title, icon, items, enrolledMap, progressMap, mounted, onMoveUp, onMoveDown, isFirst, isLast }) {
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
          {!isFirst  && <button className="feed-reorder-btn" onClick={onMoveUp}><i className="ri-arrow-up-s-line" /></button>}
          {!isLast   && <button className="feed-reorder-btn" onClick={onMoveDown}><i className="ri-arrow-down-s-line" /></button>}
          <button className="feed-reorder-btn" onClick={() => setCollapsed(c => !c)}>
            <i className={`ri-arrow-${collapsed?'down':'up'}-s-line`} />
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

  useEffect(() => { if (mounted) buildFeed() }, [mounted, buildFeed])
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
    saveFeedOrder(next.filter(s => !['explore','program'].includes(s.type)).flatMap(s =>
      s.items.map(({ program, subject }) => ({ type: s.type, programId: program.id, subjectId: subject.id }))
    ))
  }

  const classes   = getClasses()
  const interests = getInterests()

  return (
    <>
      <Head>
        <title>Feyn — Learn from first principles</title>
        <meta name="description" content="Feyn is a structured video learning platform inspired by Feynman Files. Every concept built from the ground up — one idea, one lesson." />
      </Head>
      <Nav />
      <main>

        {/* ══════════════════════════════════════════
            LANDING HERO — shown to all visitors
            ══════════════════════════════════════════ */}
        {(!mounted || !signedIn) && (
          <div className="landing-hero">
            <div className="landing-hero__inner container">
              <div className="landing-hero__content">
                <div className="landing-hero__eyebrow">
                  <span className="landing-hero__badge">
                    <i className="ri-sparkling-2-line" /> Free · Open · No signup required
                  </span>
                </div>
                <h1 className="landing-hero__title">
                  Learn anything<br />
                  <span className="landing-hero__accent">from first principles.</span>
                </h1>
                <p className="landing-hero__sub">
                  Feyn is a video-first learning platform inspired by <strong>Feynman Files</strong> and
                  Richard Feynman's teaching philosophy — start from intuition, build up carefully,
                  never skip a step.
                </p>
                <p className="landing-hero__quote">
                  <i className="ri-double-quotes-l" />
                  {' '}If you can't explain it simply, you don't understand it well enough.{' '}
                  <i className="ri-double-quotes-r" />
                  <span className="landing-hero__quote-attr">— Richard Feynman</span>
                </p>
                <div className="landing-hero__actions">
                  {mounted && !signedIn && (
                    <button className="btn btn--accent landing-btn" onClick={() => setShowAuth(true)}>
                      <i className="ri-user-add-line" /> Create free account
                    </button>
                  )}
                  <a href="#courses" className="btn btn--ghost landing-btn">
                    <i className="ri-play-circle-line" /> Browse courses
                  </a>
                </div>
              </div>

              {/* Metrics */}
              <div className="landing-metrics">
                <div className="metric-card">
                  <span className="metric-card__num">{metrics.programs}</span>
                  <span className="metric-card__label"><i className="ri-stack-line" /> Programs</span>
                </div>
                <div className="metric-card">
                  <span className="metric-card__num">{metrics.courses}</span>
                  <span className="metric-card__label"><i className="ri-book-open-line" /> Courses</span>
                </div>
                <div className="metric-card">
                  <span className="metric-card__num">{metrics.lessons}</span>
                  <span className="metric-card__label"><i className="ri-play-circle-line" /> Lessons</span>
                </div>
                <div className="metric-card">
                  <span className="metric-card__num">{metrics.coaches}</span>
                  <span className="metric-card__label"><i className="ri-user-star-line" /> Instructors</span>
                </div>
              </div>
            </div>

            {/* Feature strip */}
            <div className="landing-features">
              <div className="container">
                <div className="landing-features__grid">
                  {[
                    { icon: 'ri-flashlight-line',        title: 'First principles', desc: 'Every concept built from intuition up. No unexplained jumps.' },
                    { icon: 'ri-play-circle-line',        title: 'Video-first',      desc: 'Short, focused lessons. One concept per video, 5–15 minutes.' },
                    { icon: 'ri-graduation-cap-line',     title: 'HSC / SSC / JSC',  desc: 'Full curriculum coverage for Bangladeshi academic classes.' },
                    { icon: 'ri-compass-discover-line',   title: 'Beyond the classroom', desc: 'Music, programming, art, languages — explore freely.' },
                    { icon: 'ri-medal-line',              title: 'Certificates',     desc: 'Complete a course, earn a downloadable certificate.' },
                    { icon: 'ri-lock-unlock-line',        title: '100% free',        desc: 'All content is free. No paywalls, no ads, no tracking.' },
                  ].map(f => (
                    <div key={f.title} className="feature-pill">
                      <i className={f.icon} />
                      <div>
                        <p className="feature-pill__title">{f.title}</p>
                        <p className="feature-pill__desc">{f.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════
            SIGNED-IN HERO
            ══════════════════════════════════════════ */}
        {mounted && signedIn && (
          <div className="container">
            <section className="home-hero">
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
              {/* Metrics for signed-in too */}
              <div className="home-metrics-mini">
                {[
                  { icon: 'ri-book-open-line',    val: metrics.courses,  label: 'Courses' },
                  { icon: 'ri-play-circle-line',  val: metrics.lessons,  label: 'Lessons' },
                  { icon: 'ri-user-star-line',    val: metrics.coaches,  label: 'Instructors' },
                ].map(m => (
                  <div key={m.label} className="metrics-mini-item">
                    <i className={m.icon} />
                    <span className="metrics-mini-val">{m.val}</span>
                    <span className="metrics-mini-label">{m.label}</span>
                  </div>
                ))}
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
                enrolledMap={enrolledMap} progressMap={progressMap} mounted={mounted}
                onMoveUp={() => moveSection(idx,-1)} onMoveDown={() => moveSection(idx,1)}
                isFirst={idx===0} isLast={idx===feedSections.length-1} />
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
