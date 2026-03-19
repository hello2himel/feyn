import Head from 'next/head'
import Link from 'next/link'
import { useRouter } from 'next/router'
import { useEffect, useState } from 'react'
import { Nav, Footer } from '../../components/Layout'
import { getSupabase } from '../../lib/supabase'
import { getCerts } from '../../lib/userStore'

// ── States ────────────────────────────────────────────────────────────
// loading | valid | invalid | local | embedded | error

export default function VerifyPage() {
  const { query, isReady } = useRouter()
  // Support:
  //   /verify?id=FEYN-xxx          — DB lookup
  //   /verify?id=FEYN-xxx&d=base64  — embedded cert data fallback
  //   /verify/[certId]             — legacy (netlify redirect hits this)
  const certId = query.id || query.certId

  const [state,  setState]  = useState('loading')
  const [cert,   setCert]   = useState(null)

  useEffect(() => {
    if (!isReady) return
    if (!certId) { setState('invalid'); return }

    async function verify() {

      // 0. Embedded data in URL (works offline, no Supabase needed)
      //    QR encodes: /verify?id=X&d=base64(JSON)
      if (query.d) {
        try {
          const decoded = JSON.parse(atob(query.d))
          if (decoded && decoded.id === certId) {
            setCert(decoded)
            setState('embedded')
            return
          }
        } catch (_) {}
      }

      // 1. Try Supabase (global accounts — works on any device)
      try {
        const sb = getSupabase()
        if (sb) {
          const { data, error } = await sb
            .from('certificates')
            .select('id, program_name, subject_name, user_name, issued_at, program_id, subject_id')
            .eq('id', certId)
            .maybeSingle()

          if (!error && data) {
            setCert(data)
            setState('valid')
            return
          }
        }
      } catch (_) {}

      // 2. localStorage fallback (same device, local account)
      const local = getCerts().find(c => c.id === certId)
      if (local) {
        setCert(local)
        setState('local')
        return
      }

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

  const isVerified = state === 'valid' || state === 'local' || state === 'embedded'

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
                  {state === 'valid'    ? 'Verified'
                  : state === 'embedded' ? 'Verified'
                  : 'Locally verified'}
                </div>

                {state === 'local' && (
                  <p className="verify-local-note">
                    <i className="ri-information-line" />
                    This certificate was issued to a local account and verified from
                    this device's storage. It cannot be confirmed server-side.
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
                  <div className="verify-details__row">
                    <span className="verify-details__label">Program</span>
                    <span className="verify-details__value">{programName}</span>
                  </div>
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
                    ? <>No certificate with ID <code className="verify-id">{certId}</code> exists
                      in Feyn&rsquo;s records. It may have been issued to a local account or the
                      URL may be incorrect.</>
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
