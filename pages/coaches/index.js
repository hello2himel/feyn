import Head from 'next/head'
import Link from 'next/link'
import { Nav, Footer } from '../../components/Layout'
import { coaches } from '../../data/courseHelpers'
import data from '../../data/index.js'

function coachSubjectCount(coachId) {
  let count = 0
  for (const program of data.programs)
    for (const subject of program.subjects)
      if (subject.coachIds?.includes(coachId)) count++
  return count
}

function coachLessonCount(coachId) {
  let count = 0
  for (const program of data.programs)
    for (const subject of program.subjects)
      if (subject.coachIds?.includes(coachId))
        for (const topic of subject.topics)
          count += (topic.skills||[]).reduce((a,s)=>a+(s.lessons||[]).length,0)
  return count
}

export default function CoachesPage() {
  return (
    <>
      <Head>
        <title>Instructors - Feyn</title>
        <meta name="description" content="Meet the instructors behind Feyn." />
      </Head>
      <Nav />
      <main>
        <div className="container">
          <header className="page-header">
            <p className="page-header__eyebrow"><i className="ri-user-star-line" /> Instructors</p>
            <h1 className="page-header__title">The people who teach here</h1>
            <p className="page-header__desc">
              Educators, peers, and community members who believe in explaining things properly.
            </p>
          </header>

          <div className="coaches-grid">
            {coaches.map(coach => {
              const subjectCount = coachSubjectCount(coach.id)
              const lessonCount  = coachLessonCount(coach.id)
              return (
                <div key={coach.id} className="coach-card">
                  <Link href={`/coaches/${coach.id}`} className="coach-card__overlay-link" aria-label={coach.name} />
                  <div className="coach-card__avatar">
                    {coach.avatar
                      ? <img src={coach.avatar} alt={coach.name} />
                      : <span>{coach.name[0]}</span>}
                  </div>
                  <div className="coach-card__body">
                    <h2 className="coach-card__name">{coach.name}</h2>
                    <p className="coach-card__title">{coach.title}</p>
                    <p className="coach-card__bio">{coach.bio?.slice(0, 100)}{coach.bio?.length > 100 ? '...' : ''}</p>
                    <div className="coach-card__meta">
                      {subjectCount > 0 && <span><i className="ri-book-open-line" /> {subjectCount} course{subjectCount !== 1 ? 's' : ''}</span>}
                      {lessonCount  > 0 && <span><i className="ri-play-circle-line" /> {lessonCount} lesson{lessonCount !== 1 ? 's' : ''}</span>}
                    </div>
                  </div>
                  <i className="ri-arrow-right-line coach-card__arrow" />
                </div>
              )
            })}
          </div>
        </div>
      </main>
      <Footer />
    </>
  )
}
