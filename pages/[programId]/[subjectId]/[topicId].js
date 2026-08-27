import Head from 'next/head'
import Link from 'next/link'
import { useState, useEffect } from 'react'
import { getProgram, getSubject, getCoachesFor, getSubjectMaterials, getTopicLessonCount, getAllTopicPaths } from '../../../data/courseHelpers'
import { Nav, Footer, Breadcrumb, CoachChip, SourceBadge, ProgressBar, MaterialsSidebar, YTThumb, useAuth } from '../../../components/Layout'
import { isWatched, getSubjectProgress } from '../../../lib/userStore'

export default function TopicPage({ program, subject, topic, allMaterials }) {
  const { signedIn, mounted } = useAuth()
  const [watchedMap, setWatchedMap] = useState({})
  const [topicPct, setTopicPct]     = useState(0)

  const coaches = getCoachesFor(subject)

  useEffect(() => {
    if (!topic || !subject || !program) return
    if (!signedIn) return
    const map = {}
    for (const skill of (topic.skills || []))
      for (const lesson of (skill.lessons || []))
        map[`${skill.id}/${lesson.id}`] = isWatched(program.id, subject.id, topic.id, lesson.id)
    setWatchedMap(map)
    // progress = watched lessons / total lessons in subject
    setTopicPct(getSubjectProgress(program.id, subject.id, subject))
  }, [topic?.id, subject?.id, program?.id, signedIn])

  if (!program || !subject || !topic) return null

  const allLessons = (topic.skills || []).flatMap(s => (s.lessons || []).map(l => ({ skill: s, lesson: l })))
  const watchedCount = Object.values(watchedMap).filter(Boolean).length

  return (
    <>
      <Head><title>{topic.name} · {subject.name} · Feyn</title></Head>
      <Nav />
      <main>
        <div className="page-with-sidebar">
          <div className="main-content">
            <Breadcrumb crumbs={[
              { label: program.name, href: `/${program.id}` },
              { label: subject.name, href: `/${program.id}/${subject.id}` },
              { label: topic.name },
            ]} />

            <header className="page-header">
              <p className="page-header__eyebrow"><i className="ri-book-open-line" /> {subject.name}</p>
              <h1 className="page-header__title">{topic.name}</h1>
              <p className="page-header__desc">{topic.description}</p>
              {coaches.length > 0 && (
                <div className="subject-coaches" style={{ marginTop:14 }}>
                  {coaches.map(c => <CoachChip key={c.id} coach={c} />)}
                </div>
              )}
              {topic.primarySource && (
                <div style={{ marginTop: 10 }}>
                  <SourceBadge source={topic.primarySource} />
                </div>
              )}
              {mounted && signedIn && allLessons.length > 0 && (
                <div style={{ marginTop:14, maxWidth:300 }}>
                  <ProgressBar pct={topicPct} label={`${watchedCount} / ${allLessons.length} watched`} />
                </div>
              )}
            </header>

            {/* Skills with lessons */}
            {(topic.skills || []).map((skill, si) => (
              <section key={skill.id} className="skill-section">
                <div className="skill-section__header">
                  <div className="skill-section__icon">
                    <i className={skill.icon || 'ri-book-open-line'} />
                  </div>
                  <div>
                    <h2 className="skill-section__name">{skill.name}</h2>
                    {skill.description && <p className="skill-section__desc">{skill.description}</p>}
                  </div>
                  <span className="skill-section__count">
                    {(skill.lessons || []).length} lesson{(skill.lessons || []).length !== 1 ? 's' : ''}
                  </span>
                </div>

                <div className="lessons-list">
                  {(skill.lessons || []).map((lesson, li) => {
                    const watched = mounted && signedIn ? !!watchedMap[`${skill.id}/${lesson.id}`] : false
                    const href = `/${program.id}/${subject.id}/${topic.id}/${skill.id}/${lesson.id}`
                    return (
                      <div className="lesson-item" key={lesson.id}>
                        <span className="lesson-item__num">
                          {watched
                            ? <i className="ri-checkbox-circle-fill" style={{ color:'var(--success)' }} />
                            : String(li + 1).padStart(2, '0')}
                        </span>
                        <div className="lesson-item__thumb">
                          <YTThumb videoId={lesson.videoId} alt={lesson.title} />
                        </div>
                        <div className="lesson-item__body">
                          <Link href={href} className="lesson-item__link">
                            <h3 className="lesson-item__title" style={watched ? { color:'var(--text-3)' } : {}}>
                              {lesson.title}
                            </h3>
                            <p className="lesson-item__desc">{lesson.intro}</p>
                            <div className="lesson-item__meta-row">
                              {lesson.questions?.length > 0 && (
                                <p style={{ fontFamily:'var(--font-mono)', fontSize:'0.6rem', color:'var(--text-3)', display:'flex', alignItems:'center', gap:4 }}>
                                  <i className="ri-question-line" /> {lesson.questions.length} questions
                                </p>
                              )}
                              {lesson.source && (
                                <span className="lesson-item__source-tag">
                                  <i className="ri-youtube-line" />
                                  {lesson.source.name}
                                  {lesson.source.instructor && <> · {lesson.source.instructor}</>}
                                </span>
                              )}
                            </div>
                          </Link>
                        </div>
                        {lesson.duration && (
                          <span className="lesson-item__duration">
                            <i className="ri-time-line" style={{ marginRight:3 }} />{lesson.duration}
                          </span>
                        )}
                      </div>
                    )
                  })}
                </div>
              </section>
            ))}

            {(topic.skills || []).length === 0 && (
              <p className="empty-state">Lessons for this topic are coming soon.</p>
            )}
          </div>
          <MaterialsSidebar materials={allMaterials} subjectName={subject.name} />
        </div>
      </main>
      <Footer />
    </>
  )
}

export async function getStaticPaths() {
  const paths = (await getAllTopicPaths()).map(params => ({ params }))
  return { paths, fallback: 'blocking' }
}

export async function getStaticProps({ params }) {
  // One getSubject call, then the topic is picked out of the tree it
  // already returned — avoids a second identical round-trip.
  const [program, subject] = await Promise.all([
    getProgram(params.programId),
    getSubject(params.programId, params.subjectId),
  ])
  const topic = subject?.topics.find(t => t.id === params.topicId) || null
  if (!program || !subject || !topic) return { notFound: true, revalidate: 60 }
  return {
    props: { program, subject, topic, allMaterials: getSubjectMaterials(subject) },
    revalidate: 60,
  }
}
