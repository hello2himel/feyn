// ============================================================
// pages/panels/editor.js — retired, kept as a redirect
//
// The editor moved to /studio/course/[id] (edit) and /studio/new
// (create). This file stays because the old URLs were handed out in
// publisher dashboards and browser history, and a 404 would look like
// data loss to a mentor mid-course.
//
// It translates the old query-string entry points:
//   /panels/editor?subject=<uuid>    → /studio/course/<uuid>
//   /panels/editor?publisher=<uuid>  → /studio/new
//   /panels/editor                   → /studio
//
// Redirecting client-side rather than via next.config rewrites keeps
// the mapping next to the explanation, and these URLs are only ever
// reached by an authenticated human, never by a crawler.
// ============================================================

import Head from 'next/head'
import Link from 'next/link'
import { useRouter } from 'next/router'
import { useEffect } from 'react'
import { Nav, Footer } from '../../components/Layout'

export default function EditorMoved() {
  const router = useRouter()

  useEffect(() => {
    if (!router.isReady) return
    const { subject } = router.query
    router.replace(subject ? `/studio/course/${subject}` : '/studio')
  }, [router.isReady, router.query]) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <>
      <Head>
        <title>Moved · Feyn</title>
        <meta name="robots" content="noindex" />
      </Head>
      <Nav />
      <main>
        <div className="container studio">
          <div className="studio-gate">
            <i className="ri-arrow-right-circle-line studio-gate__icon" />
            <p className="studio-gate__text">The course editor moved.</p>
            <p className="studio-gate__sub">
              Everything you had is still there — it now lives in your studio, with an outline you
              can see and a publish checklist.
            </p>
            <Link href="/studio" className="btn btn--accent btn--sm">
              <i className="ri-dashboard-line" /> Open studio
            </Link>
          </div>
        </div>
      </main>
      <Footer />
    </>
  )
}
