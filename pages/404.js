import Head from 'next/head'
import Link from 'next/link'
import { Nav, Footer, Plate } from '../components/Layout'

// A dead end is still a page on the site, so it gets the same plate and
// the same buttons as everywhere else — and two real ways out instead of
// one underlined mono link.
export default function NotFound() {
  return (
    <>
      <Head><title>Not found · Feyn</title></Head>
      <Nav />
      <main>
        <Plate variant="quiet">
          <div className="dead-end">
            <p className="dead-end__code">404</p>
            <h1 className="dead-end__title">This page does not exist</h1>
            <p className="dead-end__desc">
              The lesson or topic you were looking for has moved, or was never
              published. Nothing is broken on your end.
            </p>
            <div className="dead-end__actions">
              <Link href="/" className="btn btn--accent">
                <i className="ri-home-4-line" aria-hidden="true" /> Back to home
              </Link>
              <Link href="/coaches" className="btn btn--ghost">
                Browse mentors
              </Link>
            </div>
          </div>
        </Plate>
      </main>
      <Footer />
    </>
  )
}
