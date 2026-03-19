import Head from 'next/head'
import Link from 'next/link'
import { useState, useEffect } from 'react'
import data from '../data/courses'
import { getProgram, getCoachesFor, getTotalLessons } from '../data/courseHelpers'
import { Nav, Footer, YTThumb, CoachChip, ProgressBar } from '../components/Layout'
import { isEnrolled, getSubjectProgress } from '../lib/userStore'

export default function ProgramPage({ program }) {
  const [progressMap, setProgressMap] = useState({})
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    const map = {}
    for (const subject of program.subjects) {
      map[subject.id] = {
        enrolled: isEnrolled(program.id, subject.id),
        pct: getSubjectProgress(program.id, subject.id, subject),
      }
    }
    setProgressMap(map)
  }, [])

  const totalSubjects = program.subjects.length
  const totalLessons  = program.subjects.reduce((a, s) => a + getTotalLessons(s), 0)
  const totalTopics   = program.subjects.reduce((a, s) => a + s.topics.length, 0)

  return (
    <>
      <Head>
        <title>{program.name} · Feyn</title>
        <meta name="description" content={program.description} />
      </Head>
      <Nav />
      <main>
        <div className="container">

          {/* Header */}
          <header className="program-page-header">
            <div className="program-page-header__meta">
              <Link href="/" className="program-page-header__back">
                <i className="ri-arrow-left-line" /> All Programs
              </Link>
              <span className="program-page-header__badge">Program</span>
            </div>
            <h1 className="program-page-header__title">{program.name}</h1>
            <p className="program-page-header__desc">{program.description}</p>
            <div className="program-page-header__stats">
              <span><i className="ri-book-2-line" /> {totalSubjects} subjects</span>
              <span><i className="ri-folder-line" /> {totalTopics} topics</span>
              <span><i className="ri-play-circle-line" /> {totalLessons} lessons</span>
            </div>
          </header>

          {/* Subjects */}
          <section className="program-subjects">
            <p className="section-label">
              <i className="ri-stack-line" style={{ marginRight: 6 }} />Subjects
            </p>

            <div className="program-subject-grid">
              {program.subjects.map(subject => {
                const coaches     = getCoachesFor(subject.coachIds || [])
                const firstVid    = subject.topics[0]?.lessons[0]?.videoId
                const total       = getTotalLessons(subject)
                const info        = progressMap[subject.id] || {}

                return (
                  <div
                    key={subject.id}
                    className="program-subject-card"
                  >
                    <Link href={`/${program.id}/${subject.id}`} className="program-subject-card__overlay-link" aria-label={subject.name} />
                    {/* Thumbnail */}
                    <div className="program-subject-card__thumb">
                      <YTThumb videoId={firstVid} alt={subject.name} />
                      {subject.certificate && (
                        <span className="program-subject-card__cert-badge">
                          <i className="ri-medal-line" /> Certificate
                        </span>
                      )}
                    </div>

                    {/* Body */}
                    <div className="program-subject-card__body">
                      <div className="program-subject-card__icon-row">
                        <i className={subject.icon || 'ri-book-open-line'} />
                        <span className="program-subject-card__name">{subject.name}</span>
                      </div>
                      <p className="program-subject-card__desc">{subject.description}</p>

                      {coaches.length > 0 && (
                        <div className="program-subject-card__coaches">
                          {coaches.map(c => <CoachChip key={c.id} coach={c} />)}
                        </div>
                      )}

                      <div className="program-subject-card__footer">
                        <span className="program-subject-card__meta">
                          <i className="ri-folder-line" /> {subject.topics.length} topics
                          &nbsp;·&nbsp;
                          <i className="ri-play-line" /> {total} lessons
                        </span>
                        {mounted && info.enrolled && (
                          <span className="program-subject-card__enrolled">
                            <i className="ri-checkbox-circle-fill" /> Enrolled
                          </span>
                        )}
                      </div>

                      {mounted && info.enrolled && (
                        <ProgressBar pct={info.pct} label={`${info.pct}%`} />
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </section>

        </div>
      </main>
      <Footer />
    </>
  )
}

export async function getStaticPaths() {
  return {
    paths: data.programs.map(p => ({ params: { programId: p.id } })),
    fallback: false,
  }
}

export async function getStaticProps({ params }) {
  const program = getProgram(params.programId)
  if (!program) return { notFound: true }
  return { props: { program } }
}
