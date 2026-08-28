// ============================================================
// pages/m/[username].js — public mentor profile (spec §7, §8.1)
//
// Aggregates every course this mentor is credited on, across every
// publisher they belong to, including their own solo publisher. Each
// course is badged with the publisher that owns it, because the same
// person can teach physics under one platform and chemistry under
// another and the distinction matters to a visitor.
//
// Retired usernames 301 here via resolve_mentor_username(), so links
// shared before a rename keep working (spec §8.6).
// ============================================================

import Head from 'next/head'
import Link from 'next/link'
import {
  getMentorByUsername,
  getMentorCourses,
  getAllMentorPaths,
  getTotalLessons,
  getTopicCount,
} from '../../data/courseHelpers'
import { getPublicServerClient } from '../../lib/supabaseServer'
import { Nav, Footer, YTThumb, Plate } from '../../components/Layout'

const SOCIAL_ICONS = {
  website: 'ri-global-line',
  youtube: 'ri-youtube-line',
  github: 'ri-github-line',
  x: 'ri-twitter-x-line',
  twitter: 'ri-twitter-x-line',
  linkedin: 'ri-linkedin-box-line',
  facebook: 'ri-facebook-circle-line',
  instagram: 'ri-instagram-line',
}

export default function MentorProfile({ mentor, courses }) {
  if (!mentor) return null

  const totalLessons = courses.reduce((a, c) => a + getTotalLessons(c.subject), 0)
  const publishers = [...new Map(courses.map(c => [c.subject.publisher?.slug, c.subject.publisher])).values()].filter(Boolean)

  return (
    <>
      <Head>
        <title>{mentor.name} · Feyn</title>
        <meta name="description" content={mentor.bio || `${mentor.name} on Feyn`} />
      </Head>
      <Nav />
      <main>
        <Plate>
          <section className="coach-hero">
            <div className="coach-hero__avatar">
              {mentor.avatar ? <img src={mentor.avatar} alt={mentor.name} /> : <span>{mentor.name[0]}</span>}
            </div>
            <div className="coach-hero__info">
              <p className="page-header__eyebrow"><i className="ri-user-star-line" /> Mentor</p>
              <h1 className="page-header__title" style={{ marginBottom: 6 }}>{mentor.name}</h1>
              <p className="coach-hero__title">@{mentor.id}{mentor.title ? ` · ${mentor.title}` : ''}</p>
              {mentor.bio && <p className="coach-hero__bio">{mentor.bio}</p>}
              <div className="coach-hero__meta">
                <span className="tag"><i className="ri-book-open-line" /> {courses.length} {courses.length === 1 ? 'course' : 'courses'}</span>
                {totalLessons > 0 && <span className="tag"><i className="ri-play-circle-line" /> {totalLessons} lessons</span>}
                {publishers.length > 0 && <span className="tag"><i className="ri-building-line" /> {publishers.length} {publishers.length === 1 ? 'publisher' : 'publishers'}</span>}
              </div>
              {Object.keys(mentor.socials || {}).length > 0 && (
                <div className="coach-hero__socials">
                  {Object.entries(mentor.socials)
                    .filter(([, url]) => !!url)
                    .map(([key, url]) => (
                      <a key={key} href={url} className="coach-social-link" target="_blank" rel="noopener noreferrer">
                        <i className={SOCIAL_ICONS[key] || 'ri-link'} /> {key}
                      </a>
                    ))}
                </div>
              )}
            </div>
          </section>
        </Plate>

        <div className="container page-body">
          <section>
            <p className="section-label"><i className="ri-stack-line" style={{ marginRight: 6 }} />Courses by {mentor.name}</p>

            {courses.length === 0 && <p className="empty-state">No published courses yet.</p>}

            <div className="program-subject-grid">
              {courses.map(({ program, subject }) => (
                <div key={`${program.id}/${subject.id}`} className="program-subject-card">
                  <Link href={`/${program.id}/${subject.id}`} className="program-subject-card__overlay-link" aria-label={subject.name} />
                  <div className="program-subject-card__thumb">
                    <YTThumb videoId={subject.firstVideoId} alt={subject.name} />
                    {subject.certificate && (
                      <span className="program-subject-card__cert-badge"><i className="ri-medal-line" /> Certificate</span>
                    )}
                  </div>
                  <div className="program-subject-card__body">
                    <div className="program-subject-card__icon-row">
                      <i className={subject.icon || 'ri-book-open-line'} />
                      <span className="program-subject-card__name">{subject.name}</span>
                    </div>
                    <p className="program-subject-card__desc">{subject.description}</p>
                    <div className="program-subject-card__footer">
                      <span className="program-subject-card__meta">
                        <i className="ri-folder-line" /> {getTopicCount(subject)} topics &nbsp;·&nbsp;
                        <i className="ri-play-line" /> {getTotalLessons(subject)} lessons
                      </span>
                    </div>
                    <p style={{ marginTop: 10, display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                      <span className="tag" style={{ fontSize: '0.6rem' }}>{program.name}</span>
                      {subject.publisher && (
                        <Link href={`/p/${subject.publisher.slug}`} className="tag" style={{ fontSize: '0.6rem', color: 'var(--accent)', borderColor: 'var(--accent-2)' }}>
                          <i className="ri-building-line" /> {subject.publisher.name}
                        </Link>
                      )}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>
      </main>
      <Footer />
    </>
  )
}

export async function getStaticPaths() {
  const paths = (await getAllMentorPaths()).map(params => ({ params }))
  return { paths, fallback: 'blocking' }
}

export async function getStaticProps({ params }) {
  const mentor = await getMentorByUsername(params.username)

  if (!mentor) {
    // Might be a retired username — resolve_mentor_username returns the
    // current handle so the old link 301s instead of 404ing (spec §8.6).
    const sb = getPublicServerClient()
    if (sb) {
      const { data: current } = await sb.rpc('resolve_mentor_username', { p_handle: params.username })
      if (current && current !== params.username) {
        return {
          redirect: { destination: `/m/${current}`, permanent: true },
          revalidate: 300,
        }
      }
    }
    return { notFound: true, revalidate: 60 }
  }

  const courses = await getMentorCourses(mentor.mentorId)
  return { props: { mentor, courses }, revalidate: 60 }
}
