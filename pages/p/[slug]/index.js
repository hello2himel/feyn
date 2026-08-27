// ============================================================
// pages/p/[slug]/index.js — public publisher page (spec §7)
//
// Branding, member list and every published course under this
// publisher. Solo publishers get a link back to their owner's mentor
// profile, since for them the two pages describe the same person.
//
// Retired slugs 301 here via resolve_publisher_slug() (spec §8.6).
// ============================================================

import Head from 'next/head'
import Link from 'next/link'
import {
  getPublisherBySlug,
  getPublisherCourses,
  getPublisherMembers,
  getAllPublisherPaths,
  getTotalLessons,
  getTopicCount,
} from '../../../data/courseHelpers'
import { getPublicServerClient } from '../../../lib/supabaseServer'
import { Nav, Footer, YTThumb } from '../../../components/Layout'

const ROLE_LABEL = { admin: 'Admin', editor: 'Editor', mentor: 'Mentor' }

export default function PublisherPage({ publisher, courses, members }) {
  if (!publisher) return null

  const totalLessons = courses.reduce((a, c) => a + getTotalLessons(c.subject), 0)
  const accent = publisher.brandColor || undefined

  return (
    <>
      <Head>
        <title>{publisher.name} · Feyn</title>
        <meta name="description" content={publisher.description || `${publisher.name} on Feyn`} />
      </Head>
      <Nav />
      <main>
        <div className="container">
          <header className="page-header" style={{ display: 'flex', gap: 20, alignItems: 'flex-start' }}>
            <div
              className="coach-hero__avatar"
              style={{ flex: '0 0 auto', borderColor: accent }}
            >
              {publisher.logo ? <img src={publisher.logo} alt={publisher.name} /> : <span>{publisher.name[0]}</span>}
            </div>
            <div style={{ flex: 1 }}>
              <p className="page-header__eyebrow" style={{ color: accent }}>
                <i className={publisher.type === 'solo' ? 'ri-user-star-line' : 'ri-building-line'} />{' '}
                {publisher.type === 'solo' ? 'Independent mentor' : 'Publisher'}
              </p>
              <h1 className="page-header__title" style={{ marginBottom: 6 }}>{publisher.name}</h1>
              <p className="coach-hero__title">/p/{publisher.slug}</p>
              {publisher.description && <p className="page-header__desc">{publisher.description}</p>}
              <div className="coach-hero__meta" style={{ marginTop: 12 }}>
                <span className="tag"><i className="ri-book-open-line" /> {courses.length} {courses.length === 1 ? 'course' : 'courses'}</span>
                {totalLessons > 0 && <span className="tag"><i className="ri-play-circle-line" /> {totalLessons} lessons</span>}
                {members.length > 0 && <span className="tag"><i className="ri-team-line" /> {members.length} {members.length === 1 ? 'member' : 'members'}</span>}
                {publisher.joinPolicy === 'open' && <span className="tag"><i className="ri-lock-unlock-line" /> Open to mentors</span>}
              </div>
            </div>
          </header>

          {members.length > 0 && (
            <>
              <div className="divider" />
              <section>
                <p className="section-label"><i className="ri-team-line" style={{ marginRight: 6 }} />Members</p>
                <div className="coaches-grid">
                  {members.map(({ role, mentor }) => (
                    <div key={mentor.id} className="coach-card">
                      <Link href={`/m/${mentor.id}`} className="coach-card__overlay-link" aria-label={mentor.name} />
                      <div className="coach-card__avatar">
                        {mentor.avatar ? <img src={mentor.avatar} alt={mentor.name} /> : <span>{mentor.name[0]}</span>}
                      </div>
                      <div className="coach-card__body">
                        <h2 className="coach-card__name">{mentor.name}</h2>
                        <p className="coach-card__title">{ROLE_LABEL[role] || role}</p>
                        <p className="coach-card__bio">
                          {mentor.bio?.slice(0, 90)}{mentor.bio?.length > 90 ? '...' : ''}
                        </p>
                      </div>
                      <i className="ri-arrow-right-line coach-card__arrow" />
                    </div>
                  ))}
                </div>
              </section>
            </>
          )}

          <div className="divider" />

          <section style={{ paddingBottom: 60 }}>
            <p className="section-label"><i className="ri-stack-line" style={{ marginRight: 6 }} />Courses</p>
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
                    <p style={{ marginTop: 10 }}>
                      <span className="tag" style={{ fontSize: '0.6rem' }}>{program.name}</span>
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
  const paths = (await getAllPublisherPaths()).map(params => ({ params }))
  return { paths, fallback: 'blocking' }
}

export async function getStaticProps({ params }) {
  const publisher = await getPublisherBySlug(params.slug)

  if (!publisher) {
    const sb = getPublicServerClient()
    if (sb) {
      const { data: current } = await sb.rpc('resolve_publisher_slug', { p_handle: params.slug })
      if (current && current !== params.slug) {
        return { redirect: { destination: `/p/${current}`, permanent: true }, revalidate: 300 }
      }
    }
    return { notFound: true, revalidate: 60 }
  }

  const [courses, members] = await Promise.all([
    getPublisherCourses(publisher.uuid),
    getPublisherMembers(publisher.uuid),
  ])

  return { props: { publisher, courses, members }, revalidate: 60 }
}
