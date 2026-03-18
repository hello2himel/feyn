import Head from 'next/head'
import Link from 'next/link'
import { Nav, Footer } from '../components/Layout'

export default function NotFound() {
  return (
    <>
      <Head><title>Not Found · Feyn</title></Head>
      <Nav />
      <main>
        <div className="container">
          <div style={{ padding: '100px 0', textAlign: 'center' }}>
            <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.7rem', letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--accent)', marginBottom: '16px' }}>404</p>
            <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: '2rem', marginBottom: '16px', color: 'var(--text)' }}>Page not found</h1>
            <p style={{ color: 'var(--text-3)', marginBottom: '32px' }}>This lesson or topic doesn't exist yet.</p>
            <Link href="/" style={{ fontFamily: 'var(--font-mono)', fontSize: '0.7rem', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--accent)', borderBottom: '1px solid var(--accent-2)', paddingBottom: '2px' }}>
              ← Back to home
            </Link>
          </div>
        </div>
      </main>
      <Footer />
    </>
  )
}
