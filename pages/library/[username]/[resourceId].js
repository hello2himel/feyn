// ============================================================
// pages/library/[username]/[resourceId].js — resource viewer
//
// pdf/image/doc/link resources get a small landing page here: title,
// description, credits, Open/Download buttons, and an inline preview
// for pdf/image. html resources skip this page entirely — see the
// redirect in getStaticProps below — because an HTML page is meant to
// just run, not sit inside another page's chrome.
//
// pdf/image render inline via an <iframe>/<img> pointed at
// pages/api/library/file/[resourceId].js — that route 302s to a
// signed Storage URL, no separate fetch-into-srcDoc step needed.
// (html is the exception: the route serves it directly, see there.) doc/link kinds just offer to open it.
//
// Not statically enumerated (fallback: 'blocking', paths: []) — the
// long tail of individual resources isn't worth pre-building, and ISR
// still caches the page after the first hit. The username segment is
// cosmetic (see libraryUrlSegment in data/libraryHelpers.js) — access
// is gated by resourceId alone, so every published resource resolves
// regardless of who, if anyone, is credited on it.
// ============================================================

import Head from 'next/head'
import Link from 'next/link'
import { getLibraryResource } from '../../../data/libraryHelpers'
import { KIND_META, formatFileSize, isInlineKind } from '../../../data/libraryHelpers'
import { Nav, Footer, Plate } from '../../../components/Layout'

export default function ResourceViewer({ resource, username }) {
  if (!resource) return null
  const meta = KIND_META[resource.kind] || KIND_META.doc

  return (
    <>
      <Head>
        <title>{resource.title} · {resource.publisher?.name || 'Feyn'}</title>
        {resource.description && <meta name="description" content={resource.description} />}
      </Head>
      <Nav />
      <main>
        <Plate>
          <section className="lib-viewer-head">
            <p className="page-header__eyebrow"><i className={meta.icon} /> {meta.label}</p>
            <h1 className="page-header__title" style={{ marginBottom: 6 }}>{resource.title}</h1>
            {resource.description && <p className="coach-hero__bio">{resource.description}</p>}
            <div className="coach-hero__meta">
              {resource.publisher && (
                <Link href={`/p/${resource.publisher.slug}`} className="tag">
                  <i className="ri-building-line" /> {resource.publisher.name}
                </Link>
              )}
              {resource.mentors.map(m => (
                <Link key={m.id} href={`/library/${m.id}`} className="tag">
                  <i className="ri-user-star-line" /> {m.name}
                </Link>
              ))}
              {formatFileSize(resource.fileSizeBytes) && (
                <span className="tag">{formatFileSize(resource.fileSizeBytes)}</span>
              )}
            </div>
            <div className="lib-viewer-head__actions">
              {resource.kind === 'link' ? (
                <a className="btn btn--accent btn--sm" href={resource.externalUrl} target="_blank" rel="noopener noreferrer">
                  <i className="ri-external-link-line" /> Open link
                </a>
              ) : (
                <>
                  <a className="btn btn--accent btn--sm" href={resource.fileUrl} target="_blank" rel="noopener noreferrer">
                    <i className="ri-external-link-line" /> Open in new tab
                  </a>
                  <a className="btn btn--ghost btn--sm" href={`${resource.fileUrl}?download=1`}>
                    <i className="ri-download-2-line" /> Download
                  </a>
                </>
              )}
            </div>
          </section>
        </Plate>

        <div className="container page-body">
          {isInlineKind(resource.kind) ? (
            resource.kind === 'image' ? (
              <div className="lib-frame lib-frame--image">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={resource.fileUrl} alt={resource.title} />
              </div>
            ) : (
              <div className="lib-frame">
                <iframe src={resource.fileUrl} title={resource.title} loading="lazy" />
              </div>
            )
          ) : resource.kind !== 'link' ? (
            <p className="empty-state">
              This file type doesn&rsquo;t preview in the browser — use Open or Download above.
            </p>
          ) : null}
        </div>
      </main>
      <Footer />
    </>
  )
}

export async function getStaticPaths() {
  return { paths: [], fallback: 'blocking' }
}

export async function getStaticProps({ params }) {
  const resource = await getLibraryResource(params.resourceId)
  if (!resource || resource.status !== 'published') return { notFound: true, revalidate: 60 }

  // HTML resources never render this page — they run directly. The API
  // route serves the file itself as text/html (Supabase Storage would
  // show it as plain-text source), sandboxed via CSP, so the browser
  // loads it as the top-level document with no wrapper chrome.
  if (resource.kind === 'html') {
    return { redirect: { destination: resource.fileUrl, permanent: false }, revalidate: 60 }
  }

  // The username segment is cosmetic only (see libraryUrlSegment in
  // data/libraryHelpers.js) — the resourceId is what actually gates
  // access, so a published resource resolves under any URL that
  // points at it, including one with no credited mentor at all.
  return { props: { resource, username: params.username }, revalidate: 60 }
}
