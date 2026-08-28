// ============================================================
// pages/[programId]/[subjectId].js — the course page
//
// WHAT WAS WRONG BEFORE
// This page was a header plus a flat list of topic cards. For a learner
// that meant:
//   · no way to resume. The card you left off in looked identical to
//     every other card, so you re-navigated from memory each visit.
//   · progress existed but was invisible per topic. One overall bar sat
//     next to the enroll button; the topics themselves showed nothing,
//     so "where am I" was unanswerable without opening each one.
//   · "Enroll" was the loudest button on the page even though it does
//     nothing except bookmark the course — the actual first action a
//     learner wants is "start the first lesson".
//   · nothing said how long the course was in time, only lesson counts.
//
// THIS VERSION
// A hero that leads with the one action that matters (start, or resume
// exactly where you stopped), a per-topic progress row, and a
// completion state that surfaces the certificate when there is one.
// Enrolling is demoted to a secondary "save" affordance, which is what
// it actually is.
//
// Progress is client-side only (lib/userStore), so everything
// progress-shaped renders after mount and the static HTML stays
// cacheable for anonymous visitors.
// ============================================================

import Head from 'next/head'
import Link from 'next/link'
import { useState, useEffect, useCallback } from 'react'
import {
  getProgram, getSubject, getCoachesFor, getSubjectMaterials,
  getTotalLessons, getTopicFirstVideo, getAllSubjectPaths,
} from '../../data/courseHelpers'
import {
  Nav, Footer, Breadcrumb, CoachChip, MaterialsSidebar, YTThumb, useAuth, Plate,
} from '../../components/Layout'
import {
  isEnrolled, enroll, unenroll, getSubjectProgress, getProgress, hasCert,
} from '../../lib/userStore'

/** Sums duration_seconds across the tree. Returns null when unknown. */
function totalMinutes(subject) {
  let secs = 0
  let known = false
  for (const t of subject?.topics || [])
    for (const s of t.skills || [])
      for (const l of s.lessons || []) {
        // lesson.duration is the derived "~12:30" label; parse it back
        // rather than plumbing raw seconds through the public mapper.
        if (!l.duration) continue
        const parts = String(l.duration).replace('~', '').split(':').map(Number)
        if (parts.some(Number.isNaN)) continue
        secs += parts.reduce((a, p) => a * 60 + p, 0)
        known = true
      }
  return known ? Math.round(secs / 60) : null
}

/** Flat lesson order for the whole course — the learner's actual path. */
function flatLessons(subject) {
  const out = []
  for (const t of subject?.topics || [])
    for (const s of t.skills || [])
      for (const l of s.lessons || [])
        out.push({ topic: t, skill: s, lesson: l })
  return out
}

export default function SubjectPage({ program, subject, allMaterials }) {
  const { signedIn, setShowAuth, mounted } = useAuth()
  const [enrolled, setEnrolled] = useState(false)
  const [pct, setPct] = useState(0)
  const [watched, setWatched] = useState({})
  const [certified, setCertified] = useState(false)

  const coaches = getCoachesFor(subject)

  const sync = useCallback(() => {
    if (!program || !subject) return
    setEnrolled(isEnrolled(program.id, subject.id))
    setPct(getSubjectProgress(program.id, subject.id, subject))
    setWatched(getProgress())
    setCertified(hasCert(program.id, subject.id))
  }, [program, subject])

  useEffect(() => { if (mounted) sync() }, [mounted, signedIn, sync])

  if (!program || !subject) return null

  // Coming-soon courses have no content yet.
  if (subject.comingSoon) {
    return (
      <>
        <Head><title>{subject.name} · Coming soon · Feyn</title></Head>
        <Nav />
        <main>
          <Plate variant="quiet">
            <div className="dead-end">
              <p className="dead-end__code">In preparation</p>
              <h1 className="dead-end__title">{subject.name}</h1>
              <p className="dead-end__desc">
                This course has been announced but has no published lessons yet.
                Nothing to watch here today.
              </p>
              <div className="dead-end__actions">
                <Link href={`/${program.id}`} className="btn btn--accent">
                  <i className="ri-arrow-left-line" /> Back to {program.name}
                </Link>
                <Link href="/#courses" className="btn btn--ghost">Browse all courses</Link>
              </div>
            </div>
          </Plate>
        </main>
        <Footer />
      </>
    )
  }

  function toggleEnroll() {
    if (!signedIn) return setShowAuth(true)
    if (enrolled) { unenroll(program.id, subject.id); setEnrolled(false) }
    else { enroll(program.id, subject.id); setEnrolled(true) }
  }

  const lessons = flatLessons(subject)
  const total = getTotalLessons(subject)
  const mins = totalMinutes(subject)

  const isWatchedKey = (topicId, lessonId) => !!watched[`${program.id}/${subject.id}/${topicId}/${lessonId}`]
  const doneCount = lessons.filter(x => isWatchedKey(x.topic.id, x.lesson.id)).length

  // The next unwatched lesson in course order — this is "resume".
  // Falls back to the first lesson, which is also the right answer for
  // a signed-out visitor and for a finished course being revisited.
  const nextUp = lessons.find(x => !isWatchedKey(x.topic.id, x.lesson.id)) || lessons[0] || null
  const nextHref = nextUp
    ? `/${program.id}/${subject.id}/${nextUp.topic.id}/${nextUp.skill.id}/${nextUp.lesson.id}`
    : null
  const started = mounted && signedIn && doneCount > 0
  const complete = mounted && signedIn && total > 0 && doneCount === total

  return (
    <>
      <Head>
        <title>{subject.name} · {program.name} · Feyn</title>
        <meta name="description" content={subject.description} />
      </Head>
      <Nav />
      <main>
        <div className="page-with-sidebar">
          <div className="main-content">
            <Breadcrumb crumbs={[
              { label: program.name, href: `/${program.id}` },
              { label: subject.name },
            ]} />

            {/* ── Hero: one obvious action ─────────────────── */}
            <Plate variant="inset">
            <header className="crs-hero">
              <div className="crs-hero__main">
                <p className="crs-hero__eyebrow">
                  <i className="ri-graduation-cap-line" /> {program.name}
                  {subject.publisher?.name && (
                    <>
                      <span className="crs-hero__dot">·</span>
                      <Link href={`/p/${subject.publisher.slug}`}>{subject.publisher.name}</Link>
                    </>
                  )}
                </p>
                <h1 className="crs-hero__title">{subject.name}</h1>
                <p className="crs-hero__desc">{subject.description}</p>

                <ul className="crs-facts">
                  <li><i className="ri-folder-line" /> {subject.topics.length} topics</li>
                  <li><i className="ri-play-circle-line" /> {total} lessons</li>
                  {mins != null && <li><i className="ri-time-line" /> ~{mins < 60 ? `${mins} min` : `${Math.round(mins / 60)} hr`} of video</li>}
                  {subject.certificate && <li className="is-accent"><i className="ri-medal-line" /> Certificate</li>}
                </ul>

                {coaches.length > 0 && (
                  <div className="crs-hero__coaches">
                    <span className="crs-hero__coaches-label">Taught by</span>
                    {coaches.map(c => <CoachChip key={c.id} coach={c} />)}
                  </div>
                )}
              </div>

              {/* Action card. Rendered after mount so the resume state
                  never disagrees with localStorage. */}
              <aside className="crs-action">
                {mounted && signedIn && total > 0 && (
                  <>
                    <div className="crs-action__ring">
                      <span className="crs-action__pct">{pct}%</span>
                      <span className="crs-action__frac">{doneCount} of {total}</span>
                    </div>
                    <div className="crs-action__bar">
                      <div className="crs-action__fill" style={{ width: `${pct}%` }} />
                    </div>
                  </>
                )}

                {complete ? (
                  <>
                    <p className="crs-action__done">
                      <i className="ri-checkbox-circle-fill" /> Course complete
                    </p>
                    {subject.certificate && (
                      <Link href={nextHref || '#'} className="btn btn--accent crs-action__btn">
                        <i className="ri-medal-line" /> {certified ? 'View certificate' : 'Claim certificate'}
                      </Link>
                    )}
                    {nextHref && (
                      <Link href={nextHref} className="btn btn--ghost btn--sm crs-action__btn">
                        <i className="ri-restart-line" /> Watch again
                      </Link>
                    )}
                  </>
                ) : nextHref ? (
                  <>
                    <Link href={nextHref} className="btn btn--accent crs-action__btn">
                      <i className={started ? 'ri-play-fill' : 'ri-play-circle-line'} />
                      {started ? 'Resume' : 'Start the first lesson'}
                    </Link>
                    <p className="crs-action__next">
                      <span className="crs-action__next-label">{started ? 'Up next' : 'Begins with'}</span>
                      {nextUp.lesson.title}
                      {nextUp.lesson.duration && <span className="crs-action__next-dur">{nextUp.lesson.duration.replace('~', '')}</span>}
                    </p>
                  </>
                ) : (
                  <p className="crs-action__empty">No lessons published yet.</p>
                )}

                {/* Enrolling only bookmarks — say so instead of making it
                    look like a paywall or a prerequisite. */}
                {mounted && (
                  <button className="crs-action__save" onClick={toggleEnroll}>
                    <i className={enrolled ? 'ri-bookmark-fill' : 'ri-bookmark-line'} />
                    {!signedIn ? 'Sign in to save' : enrolled ? 'Saved to My Courses' : 'Save to My Courses'}
                  </button>
                )}
              </aside>
            </header>
            </Plate>

            {/* ── Topic list with real progress ───────────── */}
            <section className="crs-topics">
              <p className="section-label">
                <i className="ri-list-ordered-2" style={{ marginRight: 6 }} />
                Course outline
              </p>

              {subject.topics.length === 0 && <p className="empty-state">Topics coming soon.</p>}

              {subject.topics.map((topic, ti) => {
                const tLessons = (topic.skills || []).flatMap(s => (s.lessons || []).map(l => ({ skill: s, lesson: l })))
                const tDone = tLessons.filter(x => isWatchedKey(topic.id, x.lesson.id)).length
                const tPct = tLessons.length ? Math.round((tDone / tLessons.length) * 100) : 0
                const showProgress = mounted && signedIn && tLessons.length > 0
                const isDone = showProgress && tDone === tLessons.length
                const firstVid = getTopicFirstVideo(topic)

                return (
                  <article key={topic.id} className={`crs-topic${isDone ? ' is-done' : ''}`}>
                    <Link
                      href={`/${program.id}/${subject.id}/${topic.id}`}
                      className="crs-topic__link"
                      aria-label={topic.name}
                    />
                    <span className="crs-topic__n">
                      {isDone
                        ? <i className="ri-checkbox-circle-fill" />
                        : String(ti + 1).padStart(2, '0')}
                    </span>

                    <div className="crs-topic__thumb">
                      <YTThumb videoId={firstVid} alt={topic.name} />
                      {showProgress && tPct > 0 && (
                        <span className="crs-topic__thumb-bar">
                          <span className="crs-topic__thumb-fill" style={{ width: `${tPct}%` }} />
                        </span>
                      )}
                    </div>

                    <div className="crs-topic__body">
                      <h2 className="crs-topic__name">{topic.name}</h2>
                      {topic.description && <p className="crs-topic__desc">{topic.description}</p>}
                      <p className="crs-topic__meta">
                        <span><i className="ri-shapes-line" /> {(topic.skills || []).length} skills</span>
                        <span><i className="ri-play-circle-line" /> {tLessons.length} lessons</span>
                        {showProgress && (
                          <span className={tDone ? 'is-accent' : undefined}>
                            <i className="ri-bar-chart-line" /> {tDone}/{tLessons.length} watched
                          </span>
                        )}
                      </p>
                    </div>

                    <span className="crs-topic__go"><i className="ri-arrow-right-line" /></span>
                  </article>
                )
              })}
            </section>
          </div>
          <MaterialsSidebar materials={allMaterials} subjectName={subject.name} />
        </div>
      </main>
      <Footer />
    </>
  )
}

// ISR — see ARCHITECTURE.md. Draft courses are invisible to the anon
// client used by getStaticProps, so they can never be baked into a
// cached page.
export async function getStaticPaths() {
  const paths = (await getAllSubjectPaths()).map(params => ({ params }))
  return { paths, fallback: 'blocking' }
}

export async function getStaticProps({ params }) {
  const [program, subject] = await Promise.all([
    getProgram(params.programId),
    getSubject(params.programId, params.subjectId),
  ])
  if (!program || !subject) return { notFound: true, revalidate: 60 }
  return {
    props: { program, subject, allMaterials: getSubjectMaterials(subject) },
    revalidate: 60,
  }
}
