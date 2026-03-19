import Head from 'next/head'
import Link from 'next/link'
import { useState, useEffect } from 'react'
import data from '../../data/courses'
import { getProgram, getSubject, getCoachesFor, getSubjectMaterials } from '../../data/courseHelpers'
import { Nav, Footer, Breadcrumb, CoachChip, ProgressBar, MaterialsSidebar, YTThumb, useAuth } from '../../components/Layout'
import { isEnrolled, enroll, unenroll, getSubjectProgress } from '../../lib/userStore'

export default function SubjectPage({ program, subject, allMaterials }) {
  const { signedIn, setShowAuth, mounted } = useAuth()
  const [enrolled, setEnrolled] = useState(false)
  const [pct, setPct]           = useState(0)

  const coaches = (subject) ? getCoachesFor(subject.coachIds || []) : []

  useEffect(() => {
    if (!signedIn || !program || !subject) return
    setEnrolled(isEnrolled(program.id, subject.id))
    setPct(getSubjectProgress(program.id, subject.id, subject))
  }, [signedIn, program?.id, subject?.id])

  if (!program || !subject) return null

  function toggleEnroll() {
    if (!signedIn) { setShowAuth(true); return }
    if (enrolled) { unenroll(program.id, subject.id); setEnrolled(false) }
    else          { enroll(program.id, subject.id);   setEnrolled(true)  }
  }

  return (
    <>
      <Head><title>{subject.name}, {program.name} · Feyn</title></Head>
      <Nav />
      <main>
        <div className="page-with-sidebar">
          <div className="main-content">
            <Breadcrumb crumbs={[
              { label: program.name, href: `/${program.id}` },
              { label: subject.name }
            ]} />
            <header className="page-header">
              <p className="page-header__eyebrow"><i className="ri-graduation-cap-line" /> {program.name}</p>
              <h1 className="page-header__title">{subject.name}</h1>
              <p className="page-header__desc">{subject.description}</p>
              {coaches.length > 0 && (
                <div className="subject-coaches">{coaches.map(c => <CoachChip key={c.id} coach={c} />)}</div>
              )}
              {mounted && (
                <div className="subject-enroll">
                  <button
                    className={`btn ${enrolled ? 'btn--ghost' : 'btn--accent'}`}
                    onClick={toggleEnroll}
                  >
                    <i className={enrolled ? 'ri-checkbox-circle-fill' : 'ri-add-circle-line'} />
                    {!signedIn ? 'Sign in to enroll' : enrolled ? 'Enrolled' : 'Enroll in this course'}
                  </button>
                  {signedIn && enrolled && <ProgressBar pct={pct} label={`${pct}% complete`} />}
                </div>
              )}
              {subject.certificate && (
                <p style={{ marginTop: 12, fontFamily: 'var(--font-mono)', fontSize: '0.65rem', color: 'var(--accent)', letterSpacing: '0.08em', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <i className="ri-medal-line" /> Certificate available on completion
                </p>
              )}
            </header>
            <section className="topics-list">
              <p className="section-label">{subject.topics.length} Topics</p>
              {subject.topics.map(topic => {
                const firstLesson = topic.lessons[0]
                return (
                  <div key={topic.id} className="topic-item">
                    <Link href={`/${program.id}/${subject.id}/${topic.id}`} className="topic-item__overlay-link" aria-label={topic.name} />
                    <div className="topic-item__thumb">
                      <YTThumb videoId={firstLesson?.videoId} alt={topic.name} />
                    </div>
                    <div className="topic-item__body">
                      <h2 className="topic-item__name">{topic.name}</h2>
                      <p className="topic-item__desc">{topic.description}</p>
                      <p className="topic-item__meta">
                        <i className="ri-play-circle-line" /> {topic.lessons.length} {topic.lessons.length === 1 ? 'lesson' : 'lessons'}
                      </p>
                    </div>
                    <span className="topic-item__arrow"><i className="ri-arrow-right-line" /></span>
                  </div>
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

export async function getStaticPaths() {
  const paths = []
  for (const program of data.programs)
    for (const subject of program.subjects)
      paths.push({ params: { programId: program.id, subjectId: subject.id } })
  return { paths, fallback: false }
}

export async function getStaticProps({ params }) {
  const program = getProgram(params.programId)
  const subject = getSubject(params.programId, params.subjectId)
  if (!program || !subject) return { notFound: true }
  return { props: { program, subject, allMaterials: getSubjectMaterials(subject) } }
}
