import Head from 'next/head'
import Link from 'next/link'
import { useRouter } from 'next/router'
import { useEffect, useState } from 'react'
import { Nav, Footer } from '../../components/Layout'
import { getSupabase } from '../../lib/supabase'
import { getCerts } from '../../lib/userStore'

// ── States ────────────────────────────────────────────────────────────
// loading | valid | invalid | local | error

export default function VerifyPage() {
  const { query, isReady } = useRouter()

  // /verify/FEYN-xxx   → Netlify rewrites to /verify/?id=FEYN-xxx
  // /verify?id=FEYN-xxx (direct)
  const certId = query.id || query.certId

  const [state, setState] = useState('loading')
  const [cert,  setCert]  = useState(null)

  useEffect(() => {
    if (!isReady) return
    if (!certId)  { setState('invalid'); return }

    async function verify() {

      // ── 1. Supabase DB lookup (global accounts — authoritative) ───
      // Always try this first. If Supabase is configured, the DB is
      // the single source of truth. A cert in the DB is definitely real.
      try {
        const sb = getSupabase()
        if (sb) {
          const { data, error } = await sb
            .from('certificates')
            .select('id, program_name, subject_name, user_name, issued_at')
            .eq('id', certId)
            .maybeSingle()

          if (!error && data) {
            setCert(data)
            setState('valid')
            return
          }
        }
      } catch (_) {}

      // ── 2. Embedded base64 payload (local accounts) ───────────────
      // QR for local accounts encodes cert data in ?d= so it can be
      // verified on any device without a DB. Only reached if Supabase
      // doesn't have the cert (i.e. it was issued to a local account).
      if (query.d) {
        try {
          const decoded = JSON.parse(atob(query.d))
          if (decoded && decoded.id === certId) {
            setCert(decoded)
            setState('local')
            return
          }
        } catch (_) {}
      }

      // ── 3. localStorage (same device, local account, no ?d=) ──────
      try {
        const stored = getCerts().find(c => c.id === certId)
        if (stored) {
          setCert(stored)
          setState('local')
          return
        }
      } catch (_) {}

      setState('invalid')
    }

    verify()
  }, [isReady, certId, query.d])

  const rawDate = cert?.issued_at || cert?.issuedAt
  const dateStr = rawDate
    ? new Date(rawDate).toLocaleDateString('en-US', {
        year: 'numeric', month: 'long', day: 'numeric',
      })
    : null

  const subjectName = cert?.subject_name || cert?.subjectName
  const programName = cert?.program_name || cert?.programName
  const userName    = cert?.user_name    || cert?.userName
  const isVerified  = state === 'valid' || state === 'local'

  return (
    <>
      <Head>
        <title>
          {isVerified
            ? `Certificate · ${subjectName} — Feyn`
            : 'Verify Certificate — Feyn'}
        </title>
        <meta name="robots" content="noindex" />
      </Head>
      <Nav />
      <main>
        <div className="container">
          <div className="verify-page">

            {state === 'loading' && (
              <div className="verify-card verify-card--loading">
                <div className="verify-card__spinner">
                  <i className="ri-loader-4-line" />
                </div>
                <p className="verify-card__sub">Checking certificate…</p>
              </div>
            )}

            {isVerified && cert && (
              <div className="verify-card verify-card--valid">
                <div className="verify-badge verify-badge--valid">
                  <i className="ri-shield-check-fill" />
                  {state === 'valid' ? 'Verified' : 'Verified (local account)'}
                </div>

                {state === 'local' && (
                  <p className="verify-local-note">
                    <i className="ri-information-line" />
                    This certificate belongs to a local account. It cannot be
                    confirmed against Feyn's server records.
                  </p>
                )}

                <div className="verify-details">
                  <div className="verify-details__row">
                    <span className="verify-details__label">Recipient</span>
                    <span className="verify-details__value verify-details__value--name">
                      {userName}
                    </span>
                  </div>
                  <div className="verify-details__row">
                    <span className="verify-details__label">Course</span>
                    <span className="verify-details__value">{subjectName}</span>
                  </div>
                  {programName && (
                    <div className="verify-details__row">
                      <span className="verify-details__label">Program</span>
                      <span className="verify-details__value">{programName}</span>
                    </div>
                  )}
                  {dateStr && (
                    <div className="verify-details__row">
                      <span className="verify-details__label">Issued</span>
                      <span className="verify-details__value">{dateStr}</span>
                    </div>
                  )}
                  <div className="verify-details__row">
                    <span className="verify-details__label">Certificate ID</span>
                    <span className="verify-details__value verify-details__value--mono">
                      {cert.id}
                    </span>
                  </div>
                </div>

                <p className="verify-issuer">
                  <i className="ri-brain-line" /> Issued by{' '}
                  <Link href="/" className="verify-issuer__link">Feyn</Link>
                  {' — free learning, first principles.'}
                </p>
              </div>
            )}

            {state === 'invalid' && (
              <div className="verify-card verify-card--invalid">
                <div className="verify-badge verify-badge--invalid">
                  <i className="ri-close-circle-fill" />
                  Not found
                </div>
                <p className="verify-card__title">Certificate not recognised</p>
                <p className="verify-card__sub">
                  {certId
                    ? <>No certificate with ID{' '}
                        <code className="verify-id">{certId}</code>{' '}
                        exists in Feyn&rsquo;s records. It may have been issued to
                        a local account, or the link may be incorrect.</>
                    : <>No certificate ID was provided in the URL.</>}
                </p>
                <Link href="/" className="btn btn--accent" style={{ marginTop: 20 }}>
                  <i className="ri-home-4-line" /> Go to Feyn
                </Link>
              </div>
            )}

            {state === 'error' && (
              <div className="verify-card verify-card--invalid">
                <div className="verify-badge verify-badge--invalid">
                  <i className="ri-error-warning-line" />
                  Error
                </div>
                <p className="verify-card__sub">
                  Something went wrong while checking this certificate. Please try again.
                </p>
              </div>
            )}

          </div>
        </div>
      </main>
      <Footer />
    </>
  )
}
