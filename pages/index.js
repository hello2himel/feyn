import Head from 'next/head'
import Link from 'next/link'
import { useState, useEffect, useCallback } from 'react'
import data from '../data/courses'
import { getCoachesFor, getTotalLessons } from '../data/courseHelpers'
import { Nav, Footer, DonateStrip, YTThumb, ProgressBar, useAuth } from '../components/Layout'
import { getEnrolled, getSubjectProgress, getFeedOrder, saveFeedOrder } from '../lib/userStore'
import { classifySubjects } from '../data/courseHelpers'

// ── Feed card ─────────────────────────────────────────────────────────
function SubjectCard({ program, subject, enrolled, pct, mounted }) {
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
          <Link href={`/${program.id}`} onClick={e => e.stopPropagation()} className="feed-card__program-link">
            {program.name}
          </Link>
        </p>
        <h3 className="feed-card__title">{subject.name}</h3>
        <p className="feed-card__desc">{subject.description}</p>
        {coaches.length > 0 && (
          <p className="feed-card__coach">
            <i className="ri-user-line" /> {coaches.map(c => c.name).join(', ')}
          </p>
        )}
        <div className="feed-card__meta">
          <span><i className="ri-folder-line" /> {subject.topics.length}</span>
          <span><i className="ri-play-line" /> {total}</span>
          {subject.certificate && <span><i className="ri-medal-line" /></span>}
          {mounted && enrolled && (
            <span className="feed-card__enrolled-tag">
              <i className="ri-checkbox-circle-fill" /> {pct}%
            </span>
          )}
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
            <i className={`ri-arrow-${collapsed ? 'down' : 'up'}-s-line`} />
          </button>
        </div>
      </div>
      {!collapsed && (
        <div className="feed-grid">
          {items.map(({ program, subject }) => (
            <SubjectCard
              key={`${program.id}/${subject.id}`}
              program={program} subject={subject}
              enrolled={!!enrolledMap[`${program.id}/${subject.id}`]}
              pct={progressMap[`${program.id}/${subject.id}`] || 0}
              mounted={mounted}
            />
          ))}
        </div>
      )}
    </section>
  )
}

// ── Page ──────────────────────────────────────────────────────────────
export default function Home() {
  const { signedIn, setShowAuth, user, mounted } = useAuth()
  const [feedSections, setFeedSections] = useState([])
  const [enrolledMap, setEnrolledMap]   = useState({})
  const [progressMap, setProgressMap]   = useState({})
  const [settingsOpen, setSettingsOpen] = useState(false)

  // Listen for auth changes
  useEffect(() => {
    if (typeof window === 'undefined') return
    const handler = () => buildFeed()
    window.addEventListener('feyn:auth', handler)
    return () => window.removeEventListener('feyn:auth', handler)
  }, [signedIn])

  const buildFeed = useCallback(() => {
    const enrolledKeys = getEnrolled()
    const eMap = {}, pMap = {}
    for (const program of data.programs)
      for (const subject of program.subjects) {
        const k = `${program.id}/${subject.id}`
        eMap[k] = enrolledKeys.includes(k)
        pMap[k] = getSubjectProgress(program.id, subject.id, subject)
      }
    setEnrolledMap(eMap)
    setProgressMap(pMap)

    const { classes, genres } = classifySubjects(data.programs)
    const order = getFeedOrder()

    if (signedIn && order.length > 0) {
      const enrolledClasses  = classes.filter(x => eMap[`${x.program.id}/${x.subject.id}`])
      const enrolledGenres   = genres.filter(x  => eMap[`${x.program.id}/${x.subject.id}`])
      const unexploredClasses = classes.filter(x => !eMap[`${x.program.id}/${x.subject.id}`])
      const unexploredGenres  = genres.filter(x  => !eMap[`${x.program.id}/${x.subject.id}`])

      const sections = []
      const seen = new Set()
      for (const item of order) {
        if (seen.has(item.type)) continue
        seen.add(item.type)
        if (item.type === 'class' && enrolledClasses.length)
          sections.push({ id: 'classes', title: 'My Classes', icon: 'ri-graduation-cap-line', type: 'class', items: enrolledClasses })
        if (item.type === 'genre' && enrolledGenres.length)
          sections.push({ id: 'genres', title: 'My Interests', icon: 'ri-heart-line', type: 'genre', items: enrolledGenres })
      }
      if (unexploredClasses.length)
        sections.push({ id: 'xclasses', title: 'Explore Classes', icon: 'ri-book-open-line', type: 'explore', items: unexploredClasses })
      if (unexploredGenres.length)
        sections.push({ id: 'xgenres', title: 'Explore More', icon: 'ri-compass-discover-line', type: 'explore', items: unexploredGenres })
      setFeedSections(sections.filter(s => s.items.length > 0))
    } else {
      // Guest or no feed order: show all by program
      const sections = data.programs.map(program => ({
        id: program.id,
        title: program.name,
        icon: 'ri-stack-line',
        type: 'program',
        items: program.subjects.map(subject => ({ program, subject })),
      })).filter(s => s.items.length > 0)
      if (genres.length > 0)
        sections.push({ id: 'more', title: 'More Content', icon: 'ri-compass-discover-line', type: 'explore', items: genres })
      setFeedSections(sections)
    }
  }, [signedIn])

  useEffect(() => { if (mounted) buildFeed() }, [mounted, buildFeed])

  function moveSection(idx, dir) {
    const next = [...feedSections]
    const swap = idx + dir
    ;[next[idx], next[swap]] = [next[swap], next[idx]]
    setFeedSections(next)
    saveFeedOrder(next.filter(s => !['explore','program'].includes(s.type)).flatMap(s =>
      s.items.map(({ program, subject }) => ({ type: s.type, programId: program.id, subjectId: subject.id }))
    ))
  }

  return (
    <>
      <Head>
        <title>Feyn</title>
        <meta name="description" content="Feyn — structured video lessons inspired by Feynman Files and the Feynman technique." />
      </Head>
      <Nav />
      <main>
        <div className="container">

          {/* Hero */}
          <section className="home-hero">
            <div className="home-hero__left">
              {mounted && signedIn && user?.name ? (
                <>
                  <p className="home-hero__eyebrow"><i className="ri-sparkling-line" /> Welcome back</p>
                  <h1 className="home-hero__title">Hi, {user.name} <span className="home-hero__wave">👋</span></h1>
                  <p className="home-hero__sub">Your personalised learning feed.</p>
                </>
              ) : (
                <>
                  <p className="home-hero__eyebrow"><i className="ri-play-circle-line" /> Video-first learning</p>
                  <h1 className="home-hero__title">Feyn</h1>
                  <p className="home-hero__sub">
                    Inspired by <strong>Feynman Files</strong> — every concept built from first principles.
                  </p>
                  <p className="home-hero__quote">"If you can't explain it simply, you don't understand it well enough."</p>
                </>
              )}
              <div className="home-hero__actions">
                {mounted && !signedIn && (
                  <button className="btn btn--accent" onClick={() => setShowAuth(true)}>
                    <i className="ri-user-line" /> Sign in for personalised feed
                  </button>
                )}
                {mounted && signedIn && feedSections.length > 0 && (
                  <button className="btn btn--ghost btn--sm" onClick={() => setSettingsOpen(o => !o)}>
                    <i className="ri-settings-3-line" /> Feed settings
                  </button>
                )}
              </div>
            </div>

            {/* Program quick-links */}
            <div className="home-hero__programs">
              {data.programs.map(program => (
                <Link key={program.id} href={`/${program.id}`} className="home-program-pill">
                  <i className="ri-stack-line" />
                  <span>{program.name}</span>
                  <i className="ri-arrow-right-s-line" />
                </Link>
              ))}
            </div>
          </section>

          {/* Feed settings */}
          {mounted && settingsOpen && (
            <div className="feed-settings-panel">
              <div className="feed-settings-panel__header">
                <span><i className="ri-settings-3-line" /> Feed Order</span>
                <button onClick={() => setSettingsOpen(false)} className="nav__icon-btn">
                  <i className="ri-close-line" />
                </button>
              </div>
              <p className="feed-settings-panel__hint">
                Drag or use arrows to reorder sections. Changes save automatically.
              </p>
              <div className="feed-settings-order">
                {feedSections.map((s, i) => (
                  <div key={s.id} className="feed-settings-row">
                    <i className={s.icon} />
                    <span>{s.title}</span>
                    <span className="feed-settings-row__count">{s.items.length}</span>
                    <div style={{ display: 'flex', gap: 4 }}>
                      <button className="feed-reorder-btn" disabled={i === 0} onClick={() => moveSection(i, -1)}><i className="ri-arrow-up-s-line" /></button>
                      <button className="feed-reorder-btn" disabled={i === feedSections.length-1} onClick={() => moveSection(i, 1)}><i className="ri-arrow-down-s-line" /></button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Feed */}
          {!mounted ? (
            <div style={{ padding: '60px 0', textAlign: 'center', color: 'var(--text-3)', fontFamily: 'var(--font-mono)', fontSize: '0.7rem', letterSpacing: '0.1em' }}>
              Loading…
            </div>
          ) : (
            feedSections.map((section, idx) => (
              <FeedSection
                key={section.id}
                title={section.title}
                icon={section.icon}
                items={section.items}
                enrolledMap={enrolledMap}
                progressMap={progressMap}
                mounted={mounted}
                onMoveUp={() => moveSection(idx, -1)}
                onMoveDown={() => moveSection(idx, 1)}
                isFirst={idx === 0}
                isLast={idx === feedSections.length - 1}
              />
            ))
          )}

          <DonateStrip />
        </div>
      </main>
      <Footer />
    </>
  )
}
