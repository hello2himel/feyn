import Head from 'next/head'
import Link from 'next/link'
import { useState, useEffect } from 'react'
import data from '../../../data/courses'
import { getProgram, getSubject, getTopic, getCoachesFor, getSubjectMaterials } from '../../../data/courseHelpers'
import { Nav, Footer, Breadcrumb, DonateStrip, CoachChip, ProgressBar, MaterialsSidebar, YTThumb } from '../../../components/Layout'
import { isWatched, getTopicProgress } from '../../../lib/userStore'

export default function TopicPage({ program, subject, topic, allMaterials }) {
  const [watchedMap, setWatchedMap] = useState({})
  const [topicPct, setTopicPct]     = useState(0)
  const [mounted, setMounted]       = useState(false)
  const coaches = getCoachesFor(topic.coachIds || subject.coachIds || [])

  useEffect(() => {
    setMounted(true)
    const map = {}
    topic.lessons.forEach(l => { map[l.id] = isWatched(program.id, subject.id, topic.id, l.id) })
    setWatchedMap(map)
    setTopicPct(getTopicProgress(program.id, subject.id, topic))
  }, [])

  const watchedCount = Object.values(watchedMap).filter(Boolean).length

  return (
    <>
      <Head><title>{topic.name} — {subject.name} · Feyn</title></Head>
      <Nav />
      <main>
        <div className="page-with-sidebar">
          <div className="main-content">
            <Breadcrumb crumbs={[
              { label: program.name, href: '/' },
              { label: subject.name, href: `/${program.id}/${subject.id}` },
              { label: topic.name }
            ]} />

            <header className="page-header">
              <p className="page-header__eyebrow">
                <i className="ri-book-open-line" /> {subject.name}
              </p>
              <h1 className="page-header__title">{topic.name}</h1>
              <p className="page-header__desc">{topic.description}</p>

              {coaches.length > 0 && (
                <div className="subject-coaches" style={{ marginTop: 14 }}>
                  {coaches.map(c => <CoachChip key={c.id} coach={c} />)}
                </div>
              )}

              {mounted && topic.lessons.length > 0 && (
                <div style={{ marginTop: 14, maxWidth: 300 }}>
                  <ProgressBar pct={topicPct} label={`${watchedCount} / ${topic.lessons.length} watched`} />
                </div>
              )}
            </header>

            <section className="lessons-list">
              <p className="section-label">
                {topic.lessons.length} {topic.lessons.length === 1 ? 'Lesson' : 'Lessons'}
              </p>
              {topic.lessons.length === 0 && <p className="empty-state">Lessons coming soon.</p>}

              {topic.lessons.map((lesson, i) => (
                <div className="lesson-item" key={lesson.id}>
                  <span className="lesson-item__num">
                    {mounted && watchedMap[lesson.id]
                      ? <i className="ri-checkbox-circle-fill" style={{ color: 'var(--success)' }} />
                      : String(i + 1).padStart(2, '0')}
                  </span>
                  <div className="lesson-item__thumb">
                    <YTThumb videoId={lesson.videoId} alt={lesson.title} />
                  </div>
                  <div className="lesson-item__body">
                    <Link
                      href={`/${program.id}/${subject.id}/${topic.id}/${lesson.id}`}
                      className="lesson-item__link"
                    >
                      <h2 className="lesson-item__title" style={mounted && watchedMap[lesson.id] ? { color: 'var(--text-3)' } : {}}>
                        {lesson.title}
                      </h2>
                      <p className="lesson-item__desc">{lesson.description}</p>
                      {lesson.materials?.length > 0 && (
                        <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.6rem', color: 'var(--text-3)', marginTop: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
                          <i className="ri-attachment-line" /> {lesson.materials.length} material{lesson.materials.length > 1 ? 's' : ''}
                        </p>
                      )}
                    </Link>
                  </div>
                  <span className="lesson-item__duration">
                    <i className="ri-time-line" style={{ marginRight: 3 }} />{lesson.duration}
                  </span>
                </div>
              ))}
            </section>

            <DonateStrip />
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
      for (const topic of subject.topics)
        paths.push({ params: { programId: program.id, subjectId: subject.id, topicId: topic.id } })
  return { paths, fallback: false }
}

export async function getStaticProps({ params }) {
  const program = getProgram(params.programId)
  const subject = getSubject(params.programId, params.subjectId)
  const topic   = getTopic(params.programId, params.subjectId, params.topicId)
  if (!program || !subject || !topic) return { notFound: true }
  const allMaterials = getSubjectMaterials(subject)
  return { props: { program, subject, topic, allMaterials } }
}
