// ============================================================
// pages/coaches/index.js — legacy alias for the mentor directory
//
// Mentors now live under /m/{username} (spec §8.1). This page stays
// as a directory listing, since there is no /m index route, but every
// link points at the new canonical URL.
// ============================================================

import Head from 'next/head'
import Link from 'next/link'
import { Nav, Footer, TeachCallout } from '../../components/Layout'
import { getMentors, getMentorCourses, getTotalLessons } from '../../data/courseHelpers'

export default function MentorDirectory({ mentors }) {
  return (
    <>
      <Head>
        <title>Mentors · Feyn</title>
        <meta name="description" content="Meet the mentors who teach on Feyn." />
      </Head>
      <Nav />
      <main>
        <div className="container">
          <header className="page-header">
            <p className="page-header__eyebrow"><i className="ri-user-star-line" /> Mentors</p>
            <h1 className="page-header__title">The people who teach here</h1>
            <p className="page-header__desc">
              Educators and community members who believe in explaining things properly.
            </p>
          </header>

          {mentors.length === 0 && <p className="empty-state">No mentors yet.</p>}

          <div className="coaches-grid">
            {mentors.map(m => (
              <div key={m.id} className="coach-card">
                <Link href={`/m/${m.id}`} className="coach-card__overlay-link" aria-label={m.name} />
                <div className="coach-card__avatar">
                  {m.avatar ? <img src={m.avatar} alt={m.name} /> : <span>{m.name[0]}</span>}
                </div>
                <div className="coach-card__body">
                  <h2 className="coach-card__name">{m.name}</h2>
                  <p className="coach-card__title">{m.title}</p>
                  <p className="coach-card__bio">
                    {m.bio?.slice(0, 100)}{m.bio?.length > 100 ? '...' : ''}
                  </p>
                  <div className="coach-card__meta">
                    {m.courseCount > 0 && <span><i className="ri-book-open-line" /> {m.courseCount} course{m.courseCount !== 1 ? 's' : ''}</span>}
                    {m.lessonCount > 0 && <span><i className="ri-play-circle-line" /> {m.lessonCount} lesson{m.lessonCount !== 1 ? 's' : ''}</span>}
                  </div>
                </div>
                <i className="ri-arrow-right-line coach-card__arrow" />
              </div>
            ))}
          </div>

          {/* Directory is where people come to see who teaches here —
              also the most natural place to ask them to join. */}
          <TeachCallout compact />
        </div>
      </main>
      <Footer />
    </>
  )
}

export async function getStaticProps() {
  const mentors = await getMentors()
  const withCounts = await Promise.all(
    mentors.map(async m => {
      const courses = await getMentorCourses(m.mentorId)
      return {
        ...m,
        courseCount: courses.length,
        lessonCount: courses.reduce((a, c) => a + getTotalLessons(c.subject), 0),
      }
    })
  )
  return { props: { mentors: withCounts }, revalidate: 300 }
}
