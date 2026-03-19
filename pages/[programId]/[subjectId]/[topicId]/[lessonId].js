import Head from 'next/head'
import Link from 'next/link'
import dynamic from 'next/dynamic'
import { useState, useEffect } from 'react'
import { getAllPaths, getProgram, getSubject, getTopic, getLessonNav, getCoachesFor, getSubjectMaterials } from '../../../../data/courseHelpers'
import { Nav, Footer, Breadcrumb, DonateStrip, CoachChip, MaterialsSidebar, LessonMaterials } from '../../../../components/Layout'
import { useAuth } from '../../../../components/Layout'
import {
  isWatched, markWatched, unmarkWatched,
  getSubjectProgress, issueCert, hasCert, getProfile,
  getWatchProgress,
} from '../../../../lib/userStore'
import { downloadCertificate } from '../../../../lib/certificate'

const SmartPlayer = dynamic(() => import('../../../../components/SmartPlayer'), { ssr: false })

export default function LessonPage({ program, subject, topic, lesson, prev, next, lessonIndex, totalLessons, allMaterials }) {
  const { signedIn, setShowAuth, mounted } = useAuth()
  const [watched, setWatched]         = useState(false)
  const [certReady, setCertReady]     = useState(false)
  const [certLoading, setCertLoading] = useState(false)
  const [savedProgress, setSavedProgress] = useState(null)
  const [subjectPct, setSubjectPct]   = useState(0)
  const [materialsOpen, setMaterialsOpen] = useState(false)
  const coaches = getCoachesFor(topic.coachIds || subject.coachIds || [])

  const lessonKey = `${program.id}/${subject.id}/${topic.id}/${lesson.id}`

  useEffect(() => {
    if (!signedIn) return
    const w = isWatched(program.id, subject.id, topic.id, lesson.id)
    setWatched(w)
    const pct = getSubjectProgress(program.id, subject.id, subject)
    setSubjectPct(pct)
    if (subject.certificate && pct === 100) setCertReady(true)
    // Load saved watch position for resume
    const progress = getWatchProgress(lessonKey)
    if (progress && !w) setSavedProgress(progress.pct)
  }, [signedIn])

  function handleAutoWatched() {
    if (!signedIn) return
    markWatched(program.id, subject.id, topic.id, lesson.id)
    setWatched(true)
    const pct = getSubjectProgress(program.id, subject.id, subject)
    setSubjectPct(pct)
    if (subject.certificate && pct === 100) setCertReady(true)
  }

  function handleUnmark() {
    unmarkWatched(program.id, subject.id, topic.id, lesson.id)
    setWatched(false)
    setCertReady(false)
  }

  async function handleCert() {
    const profile   = getProfile()
    const userName  = profile?.name || 'Student'
    const cert      = issueCert(program.id, subject.id, subject.name, program.name, userName)
    const coachName = coaches[0]?.name || 'Instructor'
    setCertLoading(true)
    await downloadCertificate({ cert, coachName })
    setCertLoading(false)
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
                  <span className="watched-badge">
                    <i className="ri-checkbox-circle-fill" /> Watched
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
                  alreadyWatched={watched}
                />
              ) : (
                <div className="video-wrap">
                  <div className="video-placeholder">
                    <i className="ri-play-circle-line" />
                    <span>Loading player</span>
                  </div>
                </div>
              )}

              {/* Below-video bar: course progress + materials toggle */}
              <div className="video-meta-bar">
                <div className="video-meta-bar__left">
                  {mounted && signedIn ? (
                    <>
                      <div className="video-meta-bar__progress-track">
                        <div
                          className="video-meta-bar__progress-fill"
                          style={{ width: `${subjectPct}%` }}
                        />
                      </div>
                      <span className="video-meta-bar__pct">
                        {subjectPct}% completed
                      </span>
                    </>
                  ) : (
                    <span className="video-meta-bar__guest">
                      <Link href={`/${program.id}/${subject.id}`} className="video-meta-bar__course-link">
                        <i className="ri-book-open-line" /> {subject.name}
                      </Link>
                    </span>
                  )}
                </div>

                {/* Materials toggle — always visible, opens inline panel on mobile */}
                {allMaterials.length > 0 && (
                  <button
                    className={`video-meta-bar__mats-btn ${materialsOpen ? 'active' : ''}`}
                    onClick={() => setMaterialsOpen(o => !o)}
                    aria-expanded={materialsOpen}
                  >
                    <i className="ri-folder-open-line" />
                    Course materials
                    <i className={`ri-arrow-${materialsOpen ? 'up' : 'down'}-s-line`} />
                  </button>
                )}
              </div>

              {/* Inline materials panel (slides open) */}
              {materialsOpen && allMaterials.length > 0 && (
                <div className="video-materials-panel">
                  {allMaterials.map(m => (
                    <a
                      key={m.id}
                      href={m.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="video-materials-item"
                    >
                      <span className="video-materials-item__icon">
                        <i className={
                          m.type === 'pdf'   ? 'ri-file-pdf-2-line' :
                          m.type === 'doc'   ? 'ri-file-word-line'  :
                          m.type === 'video' ? 'ri-video-line'      :
                          m.type === 'link'  ? 'ri-link'            : 'ri-attachment-line'
                        } />
                      </span>
                      <span className="video-materials-item__label">{m.label}</span>
                      <span className="video-materials-item__type">{m.type}</span>
                      <i className="ri-external-link-line video-materials-item__ext" />
                    </a>
                  ))}
                </div>
              )}

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
                            <i className="ri-checkbox-circle-fill" /> Marked as watched
                          </span>
                          <button className="btn btn--ghost btn--sm" onClick={handleUnmark}>
                            <i className="ri-close-circle-line" /> Undo
                          </button>
                        </>
                      )}
                      {certReady && (
                        <button className="btn btn--cert" onClick={handleCert} disabled={certLoading}>
                          <i className="ri-medal-line" />
                          {certLoading ? 'Generating' : hasCert(program.id, subject.id) ? 'Re-download Certificate' : 'Download Certificate'}
                        </button>
                      )}
                    </>
                  ) : (
                    <div className="lesson-auth-nudge">
                      <i className="ri-lock-line" />
                      <span>
                        <button className="lesson-auth-nudge__link" onClick={() => setShowAuth(true)}>Sign in</button>
                        {' '}to track progress and earn certificates
                      </span>
                    </div>
                  )}
                </div>
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
