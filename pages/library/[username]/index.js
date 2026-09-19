// ============================================================
// pages/library/[username]/index.js — public mentor library
//
// Mirrors pages/m/[username].js: aggregates every published resource
// this mentor is credited on, across every publisher they belong to.
// A resource is badged with its owning publisher when the mentor
// publishes under more than one, same reasoning as the course list.
// ============================================================

import Head from 'next/head'
import Link from 'next/link'
import { getMentorByUsername, getAllMentorPaths } from '../../../data/courseHelpers'
import { getMentorLibraryResources, KIND_META, formatFileSize } from '../../../data/libraryHelpers'
import { getPublicServerClient } from '../../../lib/supabaseServer'
import { Nav, Footer, Plate } from '../../../components/Layout'

export default function MentorLibrary({ mentor, resources }) {
  if (!mentor) return null

  const publishers = [...new Map(resources.map(r => [r.publisher?.slug, r.publisher])).values()].filter(Boolean)

  return (
    <>
      <Head>
        <title>{mentor.name}&rsquo;s library · Feyn</title>
        <meta name="description" content={`Files and links shared by ${mentor.name} on Feyn`} />
      </Head>
      <Nav />
      <main>
        <Plate>
          <section className="coach-hero">
            <div className="coach-hero__avatar">
              {mentor.avatar ? <img src={mentor.avatar} alt={mentor.name} /> : <span>{mentor.name[0]}</span>}
            </div>
            <div className="coach-hero__info">
              <p className="page-header__eyebrow"><i className="ri-book-shelf-line" /> Library</p>
              <h1 className="page-header__title" style={{ marginBottom: 6 }}>{mentor.name}</h1>
              <p className="coach-hero__title">
                <Link href={`/m/${mentor.id}`}>@{mentor.id}</Link>
              </p>
              <div className="coach-hero__meta">
                <span className="tag"><i className="ri-book-shelf-line" /> {resources.length} {resources.length === 1 ? 'resource' : 'resources'}</span>
                {publishers.length > 0 && (
                  <span className="tag"><i className="ri-building-line" /> {publishers.length} {publishers.length === 1 ? 'publisher' : 'publishers'}</span>
                )}
              </div>
            </div>
          </section>
        </Plate>

        <div className="container page-body">
          <section>
            <p className="section-label"><i className="ri-book-shelf-line" style={{ marginRight: 6 }} />Shared by {mentor.name}</p>

            {resources.length === 0 && <p className="empty-state">Nothing shared yet.</p>}

            <div className="lib-grid">
              {resources.map(r => {
                const meta = KIND_META[r.kind] || KIND_META.doc
                // html runs directly — no detail page, no iframe.
                const href = r.kind === 'html' ? r.fileUrl : `/library/${mentor.id}/${r.id}`
                const Card = r.kind === 'html' ? 'a' : Link
                return (
                  <Card key={r.id} href={href} className="lib-card">
                    <span className="lib-card__icon"><i className={r.icon || meta.icon} /></span>
                    <span className="lib-card__kind">{meta.label}</span>
                    <h3 className="lib-card__title">{r.title}</h3>
                    {r.description && <p className="lib-card__desc">{r.description}</p>}
                    <p className="lib-card__footer">
                      {formatFileSize(r.fileSizeBytes) ? `${formatFileSize(r.fileSizeBytes)} · ` : ''}
                      {r.publisher?.name || ''}
                    </p>
                  </Card>
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
  const paths = (await getAllMentorPaths()).map(params => ({ params }))
  return { paths, fallback: 'blocking' }
}

export async function getStaticProps({ params }) {
  const mentor = await getMentorByUsername(params.username)

  if (!mentor) {
    const sb = getPublicServerClient()
    if (sb) {
      const { data: current } = await sb.rpc('resolve_mentor_username', { p_handle: params.username })
      if (current && current !== params.username) {
        return {
          redirect: { destination: `/library/${current}`, permanent: true },
          revalidate: 300,
        }
      }
    }
    return { notFound: true, revalidate: 60 }
  }

  const resources = await getMentorLibraryResources(mentor.mentorId)
  return { props: { mentor, resources }, revalidate: 60 }
}
