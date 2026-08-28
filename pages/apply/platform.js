// ============================================================
// pages/apply/platform.js — platform registration form (spec §7, §4)
//
// Behind sign-in. Submits register_publisher() through /api/rpc, which
// creates a `pending`, `type='platform'` publisher. On approval the
// registrant becomes its first admin.
//
// Solo publishers are never created here — they only ever appear when
// a mentor application is approved.
// ============================================================

import Head from 'next/head'
import Link from 'next/link'
import { useState, useEffect } from 'react'
import { Nav, Footer, useAuth, PageHeader } from '../../components/Layout'
import HandleField from '../../components/HandleField'
import { callRpc, authedClient } from '../../lib/api'
import { invalidatePermissions } from '../../lib/usePermissions'

export default function ApplyPlatform() {
  const { signedIn, setShowAuth, mounted } = useAuth()

  const [name, setName] = useState('')
  const [slug, setSlug] = useState('')
  const [handleOk, setHandleOk] = useState(false)
  const [description, setDescription] = useState('')
  const [brandColor, setBrandColor] = useState('#c8a96e')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [mine, setMine] = useState([])
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
      // A registrant can see their own pending publisher rows.
      const { data } = await sb
        .from('publishers')
        .select('id, name, slug, status, type')
        .eq('registered_by', uid)
        .eq('type', 'platform')
        .order('created_at', { ascending: false })
      if (!alive) return
      setMine(data || [])
      setLoaded(true)
    })()
    return () => { alive = false }
  }, [signedIn])

  async function submit(e) {
    e.preventDefault()
    setError('')
    if (!name.trim()) return setError('Enter the platform name.')
    if (!handleOk) return setError('Pick an available slug first.')

    setBusy(true)
    try {
      await callRpc('register_publisher', {
        p_name: name.trim(),
        p_slug: slug,
        p_description: description.trim() || null,
        p_brand_color: brandColor || null,
      })
      invalidatePermissions()
      setMine(m => [{ name: name.trim(), slug, status: 'pending', type: 'platform' }, ...m])
      setName('')
      setSlug('')
      setDescription('')
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
        <p className="empty-state">Sign in to register a platform.</p>
        <button className="btn btn--accent" onClick={() => setShowAuth(true)}>
          <i className="ri-login-circle-line" /> Sign in
        </button>
      </Shell>
    )
  }

  return (
    <Shell>
      {mine.length > 0 && (
        <section style={{ marginBottom: 36 }}>
          <p className="section-label"><i className="ri-list-check-2" style={{ marginRight: 6 }} />Your registrations</p>
          <div style={{ border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', overflow: 'hidden' }}>
            {mine.map(p => (
              <div key={p.slug} className="course-row">
                <span className="course-row__icon"><i className="ri-building-line" /></span>
                <div className="course-row__info">
                  <span className="course-row__name">
                    {p.status === 'approved' ? <Link href={`/p/${p.slug}`}>{p.name}</Link> : p.name}
                  </span>
                  <span className="course-row__meta">/p/{p.slug}</span>
                </div>
                <span
                  className="tag"
                  style={p.status === 'approved' ? { color: 'var(--accent)', borderColor: 'var(--accent-2)' } : undefined}
                >
                  {p.status}
                </span>
                {p.status === 'approved' && (
                  <Link href={`/p/${p.slug}/dashboard`} className="btn btn--ghost btn--sm">
                    <i className="ri-dashboard-line" /> Dashboard
                  </Link>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      <form onSubmit={submit} className="auth-fields" style={{ maxWidth: 560 }}>
        <div className="auth-field">
          <label className="auth-field__label" htmlFor="platform-name">
            Platform name <span className="auth-field__req">*</span>
          </label>
          <input
            id="platform-name"
            className="auth-input"
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="e.g. OnnoRokom Pathshala"
          />
        </div>

        <HandleField
          namespace="publisher"
          label="URL slug"
          prefix="feyn.app/p/"
          value={slug}
          onChange={setSlug}
          onValidityChange={setHandleOk}
        />

        <div className="auth-field">
          <label className="auth-field__label" htmlFor="platform-desc">
            Description <span className="auth-field__opt">optional</span>
          </label>
          <textarea
            id="platform-desc"
            className="auth-input"
            rows={4}
            value={description}
            onChange={e => setDescription(e.target.value)}
            placeholder="Who you are and what you teach."
            style={{ resize: 'vertical' }}
          />
        </div>

        <div className="auth-field">
          <label className="auth-field__label" htmlFor="brand-color">
            Brand colour <span className="auth-field__opt">optional</span>
          </label>
          <input
            id="brand-color"
            type="color"
            value={brandColor}
            onChange={e => setBrandColor(e.target.value)}
            style={{ width: 64, height: 36, background: 'none', border: '1px solid var(--border)', borderRadius: 6 }}
          />
        </div>

        {error && <p className="auth-field__err"><i className="ri-error-warning-line" /> {error}</p>}

        <div>
          <button className="btn btn--accent" type="submit" disabled={busy}>
            <i className="ri-send-plane-line" /> {busy ? 'Submitting…' : 'Register platform'}
          </button>
        </div>
      </form>
    </Shell>
  )
}

function Shell({ children }) {
  return (
    <>
      <Head><title>Register a platform · Feyn</title></Head>
      <Nav />
      <main>
        <PageHeader
          eyebrow="Platform registration"
          icon="ri-building-line"
          title="Publish as an organisation"
          desc="A platform owns its courses and can invite mentors to teach under it. An app admin reviews every registration; on approval you become its first admin."
        />
        <div className="container page-body">{children}</div>
      </main>
      <Footer />
    </>
  )
}
