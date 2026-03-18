import Head from 'next/head'
import Link from 'next/link'
import data, { coaches } from '../../data/courses'
import { getCoach } from '../../data/courseHelpers'
import { Nav, Footer, YTThumb } from '../../components/Layout'

export default function CoachPage({ coach, subjects }) {
  const totalLessons = subjects.reduce((acc, { subject }) =>
    acc + subject.topics.reduce((a, t) => a + t.lessons.length, 0), 0)

  return (
    <>
      <Head>
        <title>{coach.name} · Feyn</title>
        <meta name="description" content={coach.bio} />
      </Head>
      <Nav />
      <main>
        <div className="container">
          <section className="coach-hero">
            <div className="coach-hero__avatar">
              {coach.avatar ? <img src={coach.avatar} alt={coach.name} /> : <span>{coach.name[0]}</span>}
            </div>
            <div className="coach-hero__info">
              <p className="page-header__eyebrow"><i className="ri-user-star-line" /> Instructor</p>
              <h1 className="page-header__title" style={{ marginBottom: 6 }}>{coach.name}</h1>
              <p className="coach-hero__title">{coach.title}</p>
              <p className="coach-hero__bio">{coach.bio}</p>
              <div className="coach-hero__meta">
                <span className="tag"><i className="ri-book-open-line" /> {subjects.length} {subjects.length === 1 ? 'subject' : 'subjects'}</span>
                <span className="tag"><i className="ri-play-circle-line" /> {totalLessons} lessons</span>
              </div>
              <div className="coach-hero__socials">
                {coach.socials?.website && (
                  <a href={coach.socials.website} className="coach-social-link" target="_blank" rel="noopener noreferrer">
                    <i className="ri-global-line" /> Website
                  </a>
                )}
                {coach.socials?.youtube && (
                  <a href={coach.socials.youtube} className="coach-social-link" target="_blank" rel="noopener noreferrer">
                    <i className="ri-youtube-line" /> YouTube
                  </a>
                )}
              </div>
            </div>
          </section>

          <div className="divider" />

          <section style={{ paddingBottom: 60 }}>
            <p className="section-label"><i className="ri-stack-line" style={{ marginRight: 6 }} />Courses by {coach.name}</p>

            {subjects.map(({ program, subject }) => (
              <div className="coach-subject-block" key={`${program.id}/${subject.id}`}>
                <div className="coach-subject-block__header">
                  <i className={subject.icon || 'ri-book-open-line'} style={{ fontSize: '1.4rem', color: 'var(--accent)' }} />
                  <div>
                    <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.63rem', color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 2 }}>{program.name}</p>
                    <Link href={`/${program.id}/${subject.id}`} className="coach-subject-block__name">{subject.name}</Link>
                  </div>
                </div>
                {subject.topics.map(topic => (
                  <div className="coach-topic" key={topic.id}>
                    <Link href={`/${program.id}/${subject.id}/${topic.id}`} className="coach-topic__name">
                      <i className="ri-folder-line" /> {topic.name}
                    </Link>
                    <div className="coach-lessons">
                      {topic.lessons.map((lesson, i) => (
                        <Link key={lesson.id} href={`/${program.id}/${subject.id}/${topic.id}/${lesson.id}`} className="coach-lesson-row">
                          <span className="coach-lesson-row__num">{String(i + 1).padStart(2, '0')}</span>
                          <div className="coach-lesson-row__thumb">
                            <YTThumb videoId={lesson.videoId} alt={lesson.title} />
                          </div>
                          <span className="coach-lesson-row__title">{lesson.title}</span>
                          <span className="coach-lesson-row__dur"><i className="ri-time-line" /> {lesson.duration}</span>
                        </Link>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            ))}
          </section>
        </div>
      </main>
      <Footer />
    </>
  )
}

export async function getStaticPaths() {
  return { paths: coaches.map(c => ({ params: { coachId: c.id } })), fallback: false }
}

export async function getStaticProps({ params }) {
  const coach = getCoach(params.coachId)
  if (!coach) return { notFound: true }
  const subjects = []
  for (const program of data.programs)
    for (const subject of program.subjects)
      if (subject.coachIds?.includes(coach.id))
        subjects.push({ program, subject })
  return { props: { coach, subjects } }
}
