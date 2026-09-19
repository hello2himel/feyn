// ============================================================
// pages/library/index.js — global library feed
//
// Every published library_resources row on the platform, newest
// first. Studio (pages/studio/library.js) is where a resource is
// managed; this is where anyone finds it. A resource with no credited
// mentor still shows up here and still opens — see libraryUrlSegment
// in data/libraryHelpers.js and the note in [username]/[resourceId].js.
// ============================================================

import Head from 'next/head'
import Link from 'next/link'
import { useMemo, useState } from 'react'
import { getAllLibraryResources, KIND_META, formatFileSize, libraryUrlSegment } from '../../data/libraryHelpers'
import { Nav, Footer, Plate } from '../../components/Layout'

const FILTERS = ['all', 'html', 'pdf', 'image', 'doc', 'link']

export default function LibraryFeed({ resources }) {
  const [filter, setFilter] = useState('all')

  const filtered = useMemo(
    () => (filter === 'all' ? resources : resources.filter(r => r.kind === filter)),
    [resources, filter]
  )

  return (
    <>
      <Head>
        <title>Library · Feyn</title>
        <meta name="description" content="Files and links shared by mentors and publishers on Feyn — notes, slides, interactive pages, worksheets." />
      </Head>
      <Nav />
      <main>
        <Plate>
          <header className="page-header">
            <p className="page-header__eyebrow"><i className="ri-book-shelf-line" /> Library</p>
            <h1 className="page-header__title">Everything shared outside a course</h1>
            <p className="page-header__desc">
              Notes, slides, interactive pages, worksheets — uploaded by mentors and publishers,
              browsable without enrolling in anything.
            </p>
          </header>
        </Plate>

        <div className="container page-body">
          <div className="lib-filters" role="tablist" aria-label="Filter by type">
            {FILTERS.map(f => (
              <button
                key={f}
                role="tab"
                aria-selected={filter === f}
                className={`lib-filter${filter === f ? ' is-active' : ''}`}
                onClick={() => setFilter(f)}
              >
                {f === 'all' ? 'All' : KIND_META[f]?.label || f}
              </button>
            ))}
          </div>

          {filtered.length === 0 ? (
            <p className="empty-state">
              {resources.length === 0 ? 'Nothing published yet — check back soon.' : 'Nothing of that type yet.'}
            </p>
          ) : (
            <div className="lib-grid">
              {filtered.map(r => {
                const meta = KIND_META[r.kind] || KIND_META.doc
                const seg = libraryUrlSegment(r)
                // html runs directly — no detail page, no iframe. Everything
                // else gets the small landing page with Open/Download and an
                // inline preview where one makes sense.
                const href = r.kind === 'html' ? r.fileUrl : `/library/${seg}/${r.id}`
                const Card = r.kind === 'html' ? 'a' : Link
                return (
                  <Card key={r.id} href={href} className="lib-card">
                    <span className="lib-card__icon"><i className={r.icon || meta.icon} /></span>
                    <span className="lib-card__kind">{meta.label}</span>
                    <h3 className="lib-card__title">{r.title}</h3>
                    {r.description && <p className="lib-card__desc">{r.description}</p>}
                    <p className="lib-card__footer">
                      {formatFileSize(r.fileSizeBytes) ? `${formatFileSize(r.fileSizeBytes)} · ` : ''}
                      {r.mentors?.[0]?.name || r.publisher?.name || ''}
                    </p>
                  </Card>
                )
              })}
            </div>
          )}
        </div>
      </main>
      <Footer />
    </>
  )
}

export async function getStaticProps() {
  const resources = await getAllLibraryResources({ limit: 200 })
  return { props: { resources }, revalidate: 60 }
}
