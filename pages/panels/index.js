// ============================================================
// pages/panels/index.js — retired, kept as a redirect
//
// The "panels hub" was a menu of three links (studio, credits,
// editor) plus an admin console link. That is one navigation layer for
// no reason: everything it pointed at is either in /studio now or
// reachable from the publisher dashboard, and the nav already has a
// Create/Studio affordance.
//
// Kept as a redirect because the URL was linked from the old nav and
// from documentation.
// ============================================================

import Head from 'next/head'
import Link from 'next/link'
import { useRouter } from 'next/router'
import { useEffect } from 'react'
import { Nav, Footer } from '../../components/Layout'

export default function PanelsMoved() {
  const router = useRouter()
  useEffect(() => { router.replace('/studio') }, []) // eslint-disable-line react-hooks/exhaustive-deps

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
            <p className="studio-gate__text">Panels are now just your studio.</p>
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
