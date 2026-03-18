import Head from 'next/head'
import Link from 'next/link'
import dynamic from 'next/dynamic'
import { useState, useEffect } from 'react'
import { getAllPaths, getProgram, getSubject, getTopic, getLessonNav, getCoachesFor, getSubjectMaterials } from '../../../../data/courseHelpers'
import { Nav, Footer, Breadcrumb, DonateStrip, CoachChip, MaterialsSidebar, LessonMaterials, AuthGate } from '../../../../components/Layout'
import { useAuth } from '../../../../components/Layout'
import { isWatched, markWatched, unmarkWatched, getSubjectProgress, issueCert, hasCert, getProfile } from '../../../../lib/userStore'
import { downloadCertificate } from '../../../../lib/certificate'

const SmartPlayer = dynamic(() => import('../../../../components/SmartPlayer'), { ssr: false })

export default function LessonPage({ program, subject, topic, lesson, prev, next, lessonIndex, totalLessons, allMaterials }) {
  const { signedIn, setShowAuth, mounted } = useAuth()
  const [watched, setWatched]       = useState(false)
  const [eligible, setEligible]     = useState(false)
  const [certReady, setCertReady]   = useState(false)
  const [certLoading, setCertLoading] = useState(false)
  const coaches = getCoachesFor(topic.coachIds || subject.coachIds || [])

  useEffect(() => {
    if (!signedIn) return
    const w = isWatched(program.id, subject.id, topic.id, lesson.id)
    setWatched(w)
    if (w) setEligible(true)
    if (subject.certificate) {
      if (getSubjectProgress(program.id, subject.id, subject) === 100) setCertReady(true)
    }
  }, [signedIn])

  function handleEligible() { setEligible(true) }

  function handleMarkWatched() {
    if (!eligible || !signedIn) return
    markWatched(program.id, subject.id, topic.id, lesson.id)
    setWatched(true)
    if (subject.certificate && getSubjectProgress(program.id, subject.id, subject) === 100) setCertReady(true)
  }

  function handleUnmark() {
    unmarkWatched(program.id, subject.id, topic.id, lesson.id)
    setWatched(false)
    setCertReady(false)
  }

  async function handleCert() {
    const profile = getProfile()
    const userName = profile?.name || 'Student'
    const cert = issueCert(program.id, subject.id, subject.name, program.name, userName)
    const coachName = coaches[0]?.name || 'Instructor'
    setCertLoading(true)
    await downloadCertificate({ cert, coachName })
    setCertLoading(false)
  }

  return (
    <>
      <Head>
        <title>{lesson.title} — {topic.name} · Feyn</title>
        <meta name="description" content={lesson.description} />
      </Head>
      <Nav />
      <main>
        <div className="page-with-sidebar">
          <div className="main-content">
            <Breadcrumb crumbs={[
              { label: program.name, href: `/${program.id}` },
              { label: subject.name, href: `/${program.id}/${subject.id}` },
              { label: topic.name,   href: `/${program.id}/${subject.id}/${topic.id}` },
              { label: lesson.title }
            ]} />

            <section className="lesson-page">
              <div className="lesson-meta">
                <span>{topic.name}</span>
                <span>·</span>
                <span>Lesson {lessonIndex} of {totalLessons}</span>
                {lesson.duration && <><span>·</span><span><i className="ri-time-line" /> {lesson.duration}</span></>}
                {mounted && signedIn && watched && (
                  <span className="watched-badge"><i className="ri-checkbox-circle-fill" /> Watched</span>
                )}
              </div>

              <h1 className="lesson-title">{lesson.title}</h1>
              {lesson.description && <p className="lesson-description">{lesson.description}</p>}

              {coaches.length > 0 && (
                <div className="lesson-coaches">
                  {coaches.map(c => <CoachChip key={c.id} coach={c} />)}
                </div>
              )}

              {/* Video — always visible */}
              {mounted && (
                <SmartPlayer
                  videoId={lesson.videoId}
                  title={lesson.title}
                  onEligible={handleEligible}
                  alreadyWatched={watched}
                />
              )}
              {!mounted && (
                <div className="video-wrap">
                  <div className="video-placeholder">
                    <i className="ri-play-circle-line" />
                    <span>Loading player…</span>
                  </div>
                </div>
              )}

              {/* Lesson materials */}
              <LessonMaterials materials={lesson.materials || []} />

              {/* Gated: progress tracking */}
              {mounted && (
                signedIn ? (
                  <div className="lesson-actions">
                    {!watched ? (
                      <button
                        className={`btn ${eligible ? 'btn--accent' : 'btn--ghost'}`}
                        onClick={handleMarkWatched}
                        disabled={!eligible}
                        title={!eligible ? 'Watch at least 80% of the video first' : ''}
                      >
                        <i className={eligible ? 'ri-checkbox-circle-line' : 'ri-time-line'} />
                        {eligible ? 'Mark as watched' : 'Watch 80% to unlock'}
                      </button>
                    ) : (
                      <button className="btn btn--success" onClick={handleUnmark}>
                        <i className="ri-checkbox-circle-fill" /> Watched ✓
                      </button>
                    )}
                    {certReady && (
                      <button className="btn btn--cert" onClick={handleCert} disabled={certLoading}>
                        <i className="ri-medal-line" />
                        {certLoading ? 'Generating…' : hasCert(program.id, subject.id) ? 'Re-download Certificate' : 'Download Certificate'}
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="lesson-auth-nudge">
                    <i className="ri-lock-line" />
                    <span>
                      <button className="lesson-auth-nudge__link" onClick={() => setShowAuth(true)}>Sign in</button>
                      {' '}to track progress and earn certificates
                    </span>
                  </div>
                )
              )}

              {lessonIndex % 3 === 0 && <DonateStrip />}

              <nav className="lesson-nav" aria-label="Lesson navigation">
                {prev ? (
                  <Link href={`/${program.id}/${subject.id}/${topic.id}/${prev.id}`} className="lesson-nav__btn lesson-nav__btn--prev">
                    <span className="lesson-nav__label"><i className="ri-arrow-left-line" /> Previous</span>
                    <span className="lesson-nav__title">{prev.title}</span>
                  </Link>
                ) : <div className="lesson-nav__placeholder" />}
                {next ? (
                  <Link href={`/${program.id}/${subject.id}/${topic.id}/${next.id}`} className="lesson-nav__btn lesson-nav__btn--next">
                    <span className="lesson-nav__label">Next <i className="ri-arrow-right-line" /></span>
                    <span className="lesson-nav__title">{next.title}</span>
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
  return { paths: getAllPaths().map(p => ({ params: p })), fallback: false }
}

export async function getStaticProps({ params }) {
  const { programId, subjectId, topicId, lessonId } = params
  const program = getProgram(programId)
  const subject = getSubject(programId, subjectId)
  const topic   = getTopic(programId, subjectId, topicId)
  const lesson  = topic?.lessons.find(l => l.id === lessonId)
  if (!program || !subject || !topic || !lesson) return { notFound: true }
  const { prev, next } = getLessonNav(programId, subjectId, topicId, lessonId)
  return {
    props: {
      program, subject, topic, lesson,
      prev: prev || null, next: next || null,
      lessonIndex: topic.lessons.findIndex(l => l.id === lessonId) + 1,
      totalLessons: topic.lessons.length,
      allMaterials: getSubjectMaterials(subject),
    }
  }
}
