// ============================================================
// pages/apply/mentor.js — mentor application form (spec §7, §4)
//
// Behind sign-in. Submits apply_as_mentor() through /api/rpc, which
// creates or reuses a `pending` mentors row. Approval is an App Admin
// action; on approval a solo publisher is auto-created.
//
// The form shows the caller's current application state instead of
// letting them submit twice — re-applying is only meaningful after a
// rejection, which the RPC allows by reusing the same row.
// ============================================================

import Head from 'next/head'
import Link from 'next/link'
import { useState, useEffect } from 'react'
import { Nav, Footer, useAuth } from '../../components/Layout'
import HandleField from '../../components/HandleField'
import { callRpc, authedClient } from '../../lib/api'
import { invalidatePermissions } from '../../lib/usePermissions'

const SOCIAL_KEYS = ['website', 'youtube', 'github', 'linkedin', 'x']

export default function ApplyMentor() {
  const { signedIn, setShowAuth, mounted } = useAuth()

  const [displayName, setDisplayName] = useState('')
  const [username, setUsername] = useState('')
  const [handleOk, setHandleOk] = useState(false)
  const [bio, setBio] = useState('')
  const [credentials, setCredentials] = useState('')
  const [socials, setSocials] = useState({})
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [existing, setExisting] = useState(null)
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    if (!signedIn) {
      setLoaded(true)
      return
    }
    let alive = true
    ;(async () => {
      const sb = await authedClient()
      if (!sb) {
        if (alive) setLoaded(true)
        return
      }
      const { data: auth } = await sb.auth.getUser()
      const uid = auth?.user?.id
      if (!uid) {
        if (alive) setLoaded(true)
        return
      }
      // RLS lets a caller read their own pending row.
      const { data } = await sb
        .from('mentors')
        .select('id, username, display_name, status, applied_at')
        .eq('user_id', uid)
        .maybeSingle()
      if (!alive) return
      setExisting(data || null)
      setLoaded(true)
    })()
    return () => { alive = false }
  }, [signedIn])

  async function submit(e) {
    e.preventDefault()
    setError('')
    if (!displayName.trim()) return setError('Enter your name.')
    if (!handleOk) return setError('Pick an available username first.')

    setBusy(true)
    try {
      await callRpc('apply_as_mentor', {
        p_display_name: displayName.trim(),
        p_username: username,
        p_bio: bio.trim() || null,
        p_credentials: credentials.trim() || null,
        p_socials: Object.fromEntries(Object.entries(socials).filter(([, v]) => v?.trim())),
      })
      invalidatePermissions()
      setExisting({ username, display_name: displayName, status: 'pending' })
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  if (!mounted || !loaded) return <Shell><p className="empty-state">Loading…</p></Shell>

  if (!signedIn) {
    return (
      <Shell>
        <p className="empty-state">Sign in to apply as a mentor.</p>
        <button className="btn btn--accent" onClick={() => setShowAuth(true)}>
          <i className="ri-login-circle-line" /> Sign in
        </button>
      </Shell>
    )
  }

  if (existing && existing.status !== 'rejected') {
    return (
      <Shell>
        <div className="settings-section">
          <p className="section-label">
            <i className={existing.status === 'approved' ? 'ri-checkbox-circle-line' : 'ri-time-line'} style={{ marginRight: 6 }} />
            Application {existing.status}
          </p>
          {existing.status === 'approved' ? (
            <>
              <p style={{ color: 'var(--text-2)', marginBottom: 16 }}>
                You are an approved mentor. Your profile is live at{' '}
                <Link href={`/m/${existing.username}`} style={{ color: 'var(--accent)' }}>/m/{existing.username}</Link>.
              </p>
              <Link href="/studio" className="btn btn--accent btn--sm">
                <i className="ri-dashboard-line" /> Open my studio
              </Link>
            </>
          ) : (
            <p style={{ color: 'var(--text-2)' }}>
              Your application as <strong>@{existing.username}</strong> is waiting for review by an app admin.
              You will see your studio here once it is approved.
            </p>
          )}
        </div>
      </Shell>
    )
  }

  return (
    <Shell>
      {existing?.status === 'rejected' && (
        <p style={{ color: 'var(--danger)', marginBottom: 20, fontSize: '0.85rem' }}>
          <i className="ri-information-line" /> A previous application was rejected. Submitting again replaces it.
        </p>
      )}

      <form onSubmit={submit} className="auth-fields" style={{ maxWidth: 560 }}>
        <div className="auth-field">
          <label className="auth-field__label" htmlFor="display-name">
            Display name <span className="auth-field__req">*</span>
          </label>
          <input
            id="display-name"
            className="auth-input"
            value={displayName}
            onChange={e => setDisplayName(e.target.value)}
            placeholder="How your name appears on courses and certificates"
          />
        </div>

        <HandleField
          namespace="mentor"
          label="Username"
          prefix="feyn.app/m/"
          value={username}
          onChange={setUsername}
          onValidityChange={setHandleOk}
        />

        <div className="auth-field">
          <label className="auth-field__label" htmlFor="credentials">
            Credentials <span className="auth-field__opt">optional</span>
          </label>
          <input
            id="credentials"
            className="auth-input"
            value={credentials}
            onChange={e => setCredentials(e.target.value)}
            placeholder="e.g. BSc Physics, University of Dhaka"
          />
        </div>

        <div className="auth-field">
          <label className="auth-field__label" htmlFor="bio">
            Bio <span className="auth-field__opt">optional</span>
          </label>
          <textarea
            id="bio"
            className="auth-input"
            rows={4}
            value={bio}
            onChange={e => setBio(e.target.value)}
            placeholder="What you teach and how you teach it."
            style={{ resize: 'vertical' }}
          />
        </div>

        <fieldset style={{ border: 0, padding: 0, margin: 0 }}>
          <legend className="auth-field__label">Links <span className="auth-field__opt">optional</span></legend>
          <div style={{ display: 'grid', gap: 10, marginTop: 8 }}>
            {SOCIAL_KEYS.map(key => (
              <input
                key={key}
                className="auth-input"
                value={socials[key] || ''}
                onChange={e => setSocials(s => ({ ...s, [key]: e.target.value }))}
                placeholder={`${key} URL`}
                aria-label={`${key} URL`}
              />
            ))}
          </div>
        </fieldset>

        {error && <p className="auth-field__err"><i className="ri-error-warning-line" /> {error}</p>}

        <div>
          <button className="btn btn--accent" type="submit" disabled={busy}>
            <i className="ri-send-plane-line" /> {busy ? 'Submitting…' : 'Submit application'}
          </button>
        </div>
      </form>
    </Shell>
  )
}

function Shell({ children }) {
  return (
    <>
      <Head><title>Apply as a mentor · Feyn</title></Head>
      <Nav />
      <main>
        <div className="container" style={{ paddingBottom: 80 }}>
          <header className="page-header">
            <p className="page-header__eyebrow"><i className="ri-user-star-line" /> Mentor application</p>
            <h1 className="page-header__title">Teach on Feyn</h1>
            <p className="page-header__desc">
              Mentors own their own publishing space and can also join platforms. An app admin
              reviews every application. Approval creates your personal publisher automatically.
            </p>
          </header>
          <div style={{ paddingTop: 32 }}>{children}</div>
        </div>
      </main>
      <Footer />
    </>
  )
}
