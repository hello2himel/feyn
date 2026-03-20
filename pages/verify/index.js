import Head from 'next/head'
import Link from 'next/link'
import { useRouter } from 'next/router'
import { useEffect, useState } from 'react'
import { Nav, Footer } from '../../components/Layout'
import { getSupabase } from '../../lib/supabase'

// ── States: loading | valid | invalid | error
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
      // Supabase DB is the single source of truth for all certificates.
      // Certificates are always written to the DB on issuance (all accounts
      // are cloud accounts — no more local-only certs).
      try {
        const sb = getSupabase()
        if (sb) {
          const { data, error } = await sb
            .from('certificates')
            .select('id, unit_id, unit_name, user_name, issued_at')
            .eq('id', certId)
            .maybeSingle()

          if (!error && data) {
            setCert(data)
            setState('valid')
            return
          }
        }
      } catch (_) {
        setState('error')
        return
      }

      setState('invalid')
    }

    verify()
  }, [isReady, certId])

  const rawDate     = cert?.issued_at || cert?.issuedAt
  const dateStr     = rawDate
    ? new Date(rawDate).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
    : null
  const unitName = cert?.unit_name || cert?.unitName
  const userName    = cert?.user_name    || cert?.userName

  return (
    <>
      <Head>
        <title>
          {state === 'valid'
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

            {state === 'valid' && cert && (
              <div className="verify-card verify-card--valid">
                <div className="verify-badge verify-badge--valid">
                  <i className="ri-shield-check-fill" />
                  Verified
                </div>

                <div className="verify-details">
                  <div className="verify-details__row">
                    <span className="verify-details__label">Recipient</span>
                    <span className="verify-details__value verify-details__value--name">
                      {userName}
                    </span>
                  </div>
                  <div className="verify-details__row">
                    <span className="verify-details__label">Unit</span>
                    <span className="verify-details__value">{unitName}</span>
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
                    ? <>No certificate with ID{' '}
                        <code className="verify-id">{certId}</code>{' '}
                        exists in Feyn&rsquo;s records. The link may be incorrect or the certificate may have been deleted.</>
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
