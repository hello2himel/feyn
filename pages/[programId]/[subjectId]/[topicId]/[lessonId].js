import Head from 'next/head'
import Link from 'next/link'
import dynamic from 'next/dynamic'
import { useState, useEffect, useCallback, useMemo } from 'react'
import { getAllPaths, getProgram, getSubject, getTopic, getLessonNav, getCoachesFor, getSubjectMaterials, getTotalLessons } from '../../../../data/courseHelpers'
import { Nav, Footer, Breadcrumb, DonateStrip, CoachChip, MaterialsSidebar, LessonMaterials } from '../../../../components/Layout'
import { useAuth } from '../../../../components/Layout'
import {
  isWatched, markWatched, unmarkWatched,
  getSubjectProgress, issueCert, hasCert, getProfile,
  getWatchProgress,
} from '../../../../lib/userStore'
import { downloadCertificate } from '../../../../lib/certificate'

const SmartPlayer = dynamic(() => import('../../../../components/SmartPlayer'), { ssr: false })

export default function LessonPage({ program, subject, topic, lesson, prev, next, lessonIndex, totalLessons, subjectTotalLessons, allMaterials }) {
  const { signedIn, setShowAuth, mounted } = useAuth()
  const [watched, setWatched]         = useState(false)
  const [certReady, setCertReady]     = useState(false)
  const [certLoading, setCertLoading] = useState(false)
  const [certStatus, setCertStatus]   = useState('')   // 'fetching'|'pushing'|'verifying'|'verified'|''
  const [savedProgress, setSavedProgress] = useState(null)
  const [subjectPct, setSubjectPct]   = useState(0)
  // Live video watch % — updated every second by SmartPlayer via onProgress
  const [videoPct, setVideoPct]       = useState(0)

  // Memoised to avoid new array ref on every render
  const coaches = useMemo(
    () => getCoachesFor(topic.coachIds || subject.coachIds || []),
    [topic.coachIds, subject.coachIds]
  )

  const lessonKey = `${program.id}/${subject.id}/${topic.id}/${lesson.id}`

  // Helper: re-read subject progress from store and sync all cert-related state
  const syncProgress = useCallback(() => {
    const pct = getSubjectProgress(program.id, subject.id, subject)
    setSubjectPct(pct)
    if (subject.certificate && pct === 100) {
      setCertReady(true)
    } else {
      setCertReady(false)
    }
  }, [program.id, subject])

  useEffect(() => {
    if (!signedIn) return
    const w = isWatched(program.id, subject.id, topic.id, lesson.id)
    setWatched(w)
    syncProgress()
    // Load saved watch position for resume
    const progress = getWatchProgress(lessonKey)
    if (progress && !w) {
      setSavedProgress(progress.pct)
      // Pre-fill the video bar with where they left off
      setVideoPct(progress.pct)
    }
  }, [signedIn, lessonKey, syncProgress, program.id, subject.id, topic.id, lesson.id])

  function handleAutoWatched() {
    if (!signedIn) return
    markWatched(program.id, subject.id, topic.id, lesson.id)
    setWatched(true)
    syncProgress()
  }

  function handleUnmark() {
    unmarkWatched(program.id, subject.id, topic.id, lesson.id)
    setWatched(false)
    // Re-read cert eligibility after unmark (don't blindly set false)
    syncProgress()
  }

  async function handleCert() {
    const profile    = getProfile()
    const userName   = profile?.name || 'Student'
    const coachName  = coaches[0]?.name      || 'Instructor'
    const coachTitle = coaches[0]?.title     || 'Instructor'
    const coachSig   = coaches[0]?.signature || null

    setCertLoading(true)
    setCertStatus('fetching')

    const { cert, dbOk, dbError } = await issueCert(
      program.id, subject.id, subject.name, program.name, userName
    )

    if (!cert) {
      setCertLoading(false)
      setCertStatus('')
      return
    }

    if (!dbOk) {
      console.error('[Feyn] cert not in DB after push:', dbError)
      setCertStatus('failed')
      await new Promise(r => setTimeout(r, 1500))
    } else {
      setCertStatus('verified')
      await new Promise(r => setTimeout(r, 800))
    }

    await downloadCertificate({
      cert,
      coachName,
      coachTitle,
      totalLessons:      subjectTotalLessons,
      subjectDesc:       subject.description || '',
      coachSignatureUrl: coachSig,
      isGlobal:          true,
    })

    setCertLoading(false)
    setCertStatus('')
  }

  return (
    <>
      <Head>
        <title>{lesson.title} - {topic.name} - Feyn</title>
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
                  <span className="watched-badge" aria-label="Marked as watched">
                    <i className="ri-checkbox-circle-fill" aria-hidden="true" /> Watched
                  </span>
                )}
              </div>

              <h1 className="lesson-title">{lesson.title}</h1>
              {lesson.description && <p className="lesson-description">{lesson.description}</p>}

              {coaches.length > 0 && (
                <div className="lesson-coaches">
                  {coaches.map(c => <CoachChip key={c.id} coach={c} />)}
                </div>
              )}

              {/* Video */}
              {mounted ? (
                <SmartPlayer
                  videoId={lesson.videoId}
                  lessonKey={signedIn ? lessonKey : null}
                  savedProgress={signedIn ? savedProgress : null}
                  onAutoWatched={signedIn ? handleAutoWatched : undefined}
                  onProgress={signedIn ? setVideoPct : undefined}
                  alreadyWatched={watched}
                />
              ) : (
                <div className="video-wrap">
                  <div className="video-placeholder">
                    <i className="ri-play-circle-line" aria-hidden="true" />
                    <span>Loading player</span>
                  </div>
                </div>
              )}

              {/* Below-video bar: video progress + course progress */}
              <div className="video-meta-bar">
                <div className="video-meta-bar__left">
                  {mounted && signedIn ? (
                    <>
                      {/* Live video watch bar (genuine watched %) */}
                      <div
                        className="video-meta-bar__progress-track"
                        role="progressbar"
                        aria-valuenow={videoPct}
                        aria-valuemin={0}
                        aria-valuemax={100}
                        aria-label={`Video watched: ${videoPct}%`}
                      >
                        <div
                          className="video-meta-bar__progress-fill"
                          style={{ width: `${videoPct}%` }}
                        />
                      </div>
                      <span className="video-meta-bar__pct">
                        {videoPct}% watched
                      </span>
                      {/* Course-level progress, clearly labelled */}
                      <span className="video-meta-bar__course-pct" title={`${subject.name} overall progress`}>
                        <i className="ri-book-open-line" aria-hidden="true" /> {subjectPct}% of course
                      </span>
                    </>
                  ) : (
                    <span className="video-meta-bar__guest">
                      <Link href={`/${program.id}/${subject.id}`} className="video-meta-bar__course-link">
                        <i className="ri-book-open-line" aria-hidden="true" /> {subject.name}
                      </Link>
                    </span>
                  )}
                </div>
              </div>

              {/* Lesson materials */}
              <LessonMaterials materials={lesson.materials || []} />

              {/* Auth/progress area */}
              {mounted && (
                <div className="lesson-actions">
                  {signedIn ? (
                    <>
                      {watched && (
                        <>
                          <span className="lesson-watched-status">
                            <i className="ri-checkbox-circle-fill" aria-hidden="true" /> Marked as watched
                          </span>
                          <button className="btn btn--ghost btn--sm" onClick={handleUnmark}>
                            <i className="ri-close-circle-line" aria-hidden="true" /> Mark as unwatched
                          </button>
                        </>
                      )}
                      {certReady && (
                        <button className="btn btn--cert" onClick={handleCert} disabled={certLoading}>
                          <i className={
                            certStatus === 'verified' ? 'ri-shield-check-fill'
                            : certStatus === 'failed' ? 'ri-error-warning-line'
                            : certStatus ? 'ri-loader-4-line ri-spin'
                            : 'ri-medal-line'
                          } aria-hidden="true" />
                          {certStatus === 'fetching'  ? 'Fetching…'
                            : certStatus === 'failed' ? 'DB error — downloading anyway'
                            : certStatus === 'verified' ? 'Verified ✓'
                            : hasCert(program.id, subject.id) ? 'Re-download Certificate'
                            : 'Download Certificate'}
                        </button>
                      )}
                    </>
                  ) : (
                    <div className="lesson-auth-nudge">
                      <i className="ri-lock-line" aria-hidden="true" />
                      <span>
                        <button className="lesson-auth-nudge__link" onClick={() => setShowAuth(true)}>Sign in</button>
                        {' '}to track progress and earn certificates
                      </span>
                    </div>
                  )}
                </div>
              )}

              {/* Donate strip — guard lessonIndex > 0 to avoid edge case at findIndex -1 */}
              {lessonIndex > 0 && lessonIndex % 3 === 0 && <DonateStrip />}

              <nav className="lesson-nav" aria-label="Lesson navigation">
                {prev ? (
                  <Link href={`/${program.id}/${subject.id}/${topic.id}/${prev.id}`} className="lesson-nav__btn lesson-nav__btn--prev">
                    <span className="lesson-nav__label"><i className="ri-arrow-left-line" aria-hidden="true" /> Previous</span>
                    <span className="lesson-nav__title">{prev.title}</span>
                  </Link>
                ) : <div className="lesson-nav__placeholder" />}
                {next ? (
                  <Link href={`/${program.id}/${subject.id}/${topic.id}/${next.id}`} className="lesson-nav__btn lesson-nav__btn--next">
                    <span className="lesson-nav__label">Next <i className="ri-arrow-right-line" aria-hidden="true" /></span>
                    <span className="lesson-nav__title">{next.title}</span>
                  </Link>
                ) : (
                  <Link href={`/${program.id}/${subject.id}/${topic.id}`} className="lesson-nav__btn lesson-nav__btn--next">
                    <span className="lesson-nav__label">Topic complete <i className="ri-check-line" aria-hidden="true" /></span>
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
  const lessonIndex = topic.lessons.findIndex(l => l.id === lessonId) + 1
  return {
    props: {
      program, subject, topic, lesson,
      prev: prev || null, next: next || null,
      lessonIndex,
      totalLessons:        topic.lessons.length,
      subjectTotalLessons: getTotalLessons(subject),
      allMaterials: getSubjectMaterials(subject),
    }
  }
}
