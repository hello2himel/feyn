// ============================================================
// pages/admin.js — App Admin console (spec §7)
//
// REPLACES the old localhost-only code generator. That page wrote
// JavaScript for /data/**.js and had nothing to do with the database;
// keeping any of it would have meant two sources of truth for content.
//
// What this is instead: the two approval queues plus the global
// override surface that only an App Admin has.
//
//   · pending mentor applications  → review_mentor_application()
//   · pending platform registrations → review_publisher_registration()
//   · every publisher and mentor, with direct links into their spaces
//   · grant another app admin by email
//
// Access is decided by public.app_admins through is_app_admin(), not by
// hostname or an env-var email list. A non-admin who loads this page
// sees a refusal, and every RPC here re-checks admin status server-side
// regardless of what the UI shows.
// ============================================================

import Head from 'next/head'
import Link from 'next/link'
import { useState, useEffect, useCallback } from 'react'
import { Nav, Footer, useAuth } from '../components/Layout'
import { usePermissions } from '../lib/usePermissions'
import { callRpc, authedClient } from '../lib/api'

export default function AdminConsole() {
  const { signedIn, setShowAuth, mounted } = useAuth()
  const { perms, loading: permsLoading } = usePermissions()

  const [mentors, setMentors] = useState([])
  const [publishers, setPublishers] = useState([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState('')
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [notes, setNotes] = useState({})

  const load = useCallback(async () => {
    const sb = await authedClient()
    if (!sb) {
      setLoading(false)
      return
    }
    // An App Admin's RLS policies expose every row here; a non-admin
    // simply gets the public subset, which is why the guard below is
    // about UX rather than security.
    const [mentorsRes, pubsRes] = await Promise.all([
      sb
        .from('mentors')
        .select('id, username, display_name, credentials, bio, status, applied_at, user_id')
        .order('applied_at', { ascending: false }),
      sb
        .from('publishers')
        .select('id, name, slug, type, status, join_policy, created_at, registered_by, owner_mentor_id')
        .order('created_at', { ascending: false }),
    ])
    setMentors(mentorsRes.data || [])
    setPublishers(pubsRes.data || [])
    setLoading(false)
  }, [])

  useEffect(() => {
    if (perms.isAppAdmin) load()
    else if (!permsLoading) setLoading(false)
  }, [perms.isAppAdmin, permsLoading, load])

  async function act(key, fn, msg) {
    setBusy(key)
    setError('')
    setNotice('')
    try {
      await fn()
      await load()
      if (msg) setNotice(msg)
    } catch (e) {
      setError(e.message)
    } finally {
      setBusy('')
    }
  }

  if (!mounted) return null

  if (!signedIn) {
    return (
      <Shell>
        <p className="empty-state">Sign in to continue.</p>
        <button className="btn btn--accent" onClick={() => setShowAuth(true)}>
          <i className="ri-login-circle-line" /> Sign in
        </button>
      </Shell>
    )
  }

  if (permsLoading || loading) return <Shell><p className="empty-state">Loading…</p></Shell>

  if (!perms.isAppAdmin) {
    return (
      <Shell>
        <p className="empty-state">This console is for app admins only.</p>
        <p style={{ color: 'var(--text-3)', fontSize: '0.8rem' }}>
          The first app admin is created with a SQL statement in your Supabase project —
          see <code>docs/self-hosting.md</code>.
        </p>
      </Shell>
    )
  }

  const pendingMentors = mentors.filter(m => m.status === 'pending')
  const pendingPlatforms = publishers.filter(p => p.status === 'pending' && p.type === 'platform')

  return (
    <Shell>
      {error && <p className="auth-field__err" style={{ marginBottom: 16 }}><i className="ri-error-warning-line" /> {error}</p>}
      {notice && <p style={{ color: 'var(--accent)', fontSize: '0.82rem', marginBottom: 16 }}><i className="ri-check-line" /> {notice}</p>}

      {/* ── Mentor applications ─────────────────────────────── */}
      <section style={{ marginBottom: 44 }}>
        <p className="section-label">
          <i className="ri-user-star-line" style={{ marginRight: 6 }} />
          Pending mentors ({pendingMentors.length})
        </p>
        {pendingMentors.length === 0 && <p className="empty-state">Nothing waiting.</p>}
        <div style={{ display: 'grid', gap: 12 }}>
          {pendingMentors.map(m => (
            <div key={m.id} style={{ border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: 14 }}>
              <p style={{ fontFamily: 'var(--font-serif)', fontSize: '1rem' }}>
                {m.display_name} <span style={{ color: 'var(--text-3)', fontFamily: 'var(--font-mono)', fontSize: '0.7rem' }}>@{m.username}</span>
              </p>
              {m.credentials && <p style={{ fontSize: '0.8rem', color: 'var(--text-2)', marginTop: 4 }}>{m.credentials}</p>}
              {m.bio && <p style={{ fontSize: '0.82rem', color: 'var(--text-2)', marginTop: 6 }}>{m.bio}</p>}
              <label className="sr-only" htmlFor={`note-m-${m.id}`}>Review note</label>
              <input
                id={`note-m-${m.id}`}
                className="auth-input"
                placeholder="Review note (optional)"
                value={notes[m.id] || ''}
                onChange={e => setNotes(n => ({ ...n, [m.id]: e.target.value }))}
                style={{ marginTop: 10 }}
              />
              <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                <button
                  className="btn btn--accent btn--sm"
                  disabled={busy === `m-${m.id}`}
                  onClick={() => act(`m-${m.id}`, () => callRpc('review_mentor_application', {
                    p_mentor_id: m.id, p_approve: true, p_note: notes[m.id] || null,
                  }), 'Mentor approved — solo publisher created.')}
                >
                  <i className="ri-check-line" /> Approve
                </button>
                <button
                  className="btn btn--danger btn--sm"
                  disabled={busy === `m-${m.id}`}
                  onClick={() => act(`m-${m.id}`, () => callRpc('review_mentor_application', {
                    p_mentor_id: m.id, p_approve: false, p_note: notes[m.id] || null,
                  }), 'Application rejected.')}
                >
                  <i className="ri-close-line" /> Reject
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Platform registrations ──────────────────────────── */}
      <section style={{ marginBottom: 44 }}>
        <p className="section-label">
          <i className="ri-building-line" style={{ marginRight: 6 }} />
          Pending platforms ({pendingPlatforms.length})
        </p>
        {pendingPlatforms.length === 0 && <p className="empty-state">Nothing waiting.</p>}
        <div style={{ display: 'grid', gap: 12 }}>
          {pendingPlatforms.map(p => (
            <div key={p.id} style={{ border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: 14 }}>
              <p style={{ fontFamily: 'var(--font-serif)', fontSize: '1rem' }}>
                {p.name} <span style={{ color: 'var(--text-3)', fontFamily: 'var(--font-mono)', fontSize: '0.7rem' }}>/p/{p.slug}</span>
              </p>
              <label className="sr-only" htmlFor={`note-p-${p.id}`}>Review note</label>
              <input
                id={`note-p-${p.id}`}
                className="auth-input"
                placeholder="Review note (optional)"
                value={notes[p.id] || ''}
                onChange={e => setNotes(n => ({ ...n, [p.id]: e.target.value }))}
                style={{ marginTop: 10 }}
              />
              <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                <button
                  className="btn btn--accent btn--sm"
                  disabled={busy === `p-${p.id}`}
                  onClick={() => act(`p-${p.id}`, () => callRpc('review_publisher_registration', {
                    p_publisher_id: p.id, p_approve: true, p_note: notes[p.id] || null,
                  }), 'Platform approved — registrant is now its admin.')}
                >
                  <i className="ri-check-line" /> Approve
                </button>
                <button
                  className="btn btn--danger btn--sm"
                  disabled={busy === `p-${p.id}`}
                  onClick={() => act(`p-${p.id}`, () => callRpc('review_publisher_registration', {
                    p_publisher_id: p.id, p_approve: false, p_note: notes[p.id] || null,
                  }), 'Registration rejected.')}
                >
                  <i className="ri-close-line" /> Reject
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Global overrides ────────────────────────────────── */}
      <section style={{ marginBottom: 44 }}>
        <p className="section-label"><i className="ri-building-4-line" style={{ marginRight: 6 }} />All publishers ({publishers.length})</p>
        <div style={{ display: 'grid', gap: 8 }}>
          {publishers.map(p => (
            <div key={p.id} className="course-row">
              <span className="course-row__icon">
                <i className={p.type === 'solo' ? 'ri-user-star-line' : 'ri-building-line'} />
              </span>
              <div className="course-row__info">
                <span className="course-row__name">
                  {p.status === 'approved' ? <Link href={`/p/${p.slug}`}>{p.name}</Link> : p.name}
                </span>
                <span className="course-row__meta">/p/{p.slug} · {p.type} · {p.status} · {p.join_policy}</span>
              </div>
              {/* An App Admin passes has_publisher_role() everywhere, so
                  the dashboard works with no membership row. */}
              <Link href={`/p/${p.slug}/dashboard`} className="btn btn--ghost btn--sm">
                <i className="ri-dashboard-line" /> Manage
              </Link>
            </div>
          ))}
        </div>
      </section>

      <section style={{ marginBottom: 44 }}>
        <p className="section-label"><i className="ri-team-line" style={{ marginRight: 6 }} />All mentors ({mentors.length})</p>
        <div style={{ display: 'grid', gap: 8 }}>
          {mentors.map(m => (
            <div key={m.id} className="course-row">
              <span className="course-row__icon"><i className="ri-user-line" /></span>
              <div className="course-row__info">
                <span className="course-row__name">
                  {m.status === 'approved' ? <Link href={`/m/${m.username}`}>{m.display_name}</Link> : m.display_name}
                </span>
                <span className="course-row__meta">@{m.username} · {m.status}</span>
              </div>
            </div>
          ))}
        </div>
      </section>

      <GrantAdminForm onDone={msg => act('grant', async () => {}, msg)} />
    </Shell>
  )
}

// ── Grant another app admin ───────────────────────────────────────────
// grant_app_admin() requires the caller to already be an app admin —
// there is deliberately no bootstrap path through the app, because on a
// fresh fork that would let the first visitor claim the site.
function GrantAdminForm({ onDone }) {
  const [email, setEmail] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function submit(e) {
    e.preventDefault()
    setError('')
    setBusy(true)
    try {
      await callRpc('grant_app_admin', { target_email: email.trim() })
      setEmail('')
      await onDone('App admin granted.')
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <section style={{ paddingBottom: 60 }}>
      <p className="section-label"><i className="ri-shield-user-line" style={{ marginRight: 6 }} />Grant app admin</p>
      <form onSubmit={submit} style={{ display: 'flex', gap: 8, alignItems: 'flex-end', flexWrap: 'wrap', maxWidth: 520 }}>
        <div style={{ flex: '1 1 240px' }}>
          <label className="auth-field__label" htmlFor="grant-email">Existing user&rsquo;s email</label>
          <input
            id="grant-email"
            className="auth-input"
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="person@example.com"
          />
        </div>
        <button className="btn btn--accent btn--sm" type="submit" disabled={busy || !email.trim()}>
          <i className="ri-add-line" /> {busy ? 'Granting…' : 'Grant'}
        </button>
        {error && <p className="auth-field__err" style={{ flexBasis: '100%' }}><i className="ri-error-warning-line" /> {error}</p>}
      </form>
      <p style={{ fontSize: '0.72rem', color: 'var(--text-3)', marginTop: 10 }}>
        The person must already have a Feyn account. App admin cannot be revoked from here.
      </p>
    </section>
  )
}

function Shell({ children }) {
  return (
    <>
      <Head><title>Admin console · Feyn</title></Head>
      <Nav />
      <main>
        <div className="container" style={{ paddingBottom: 80 }}>
          <header className="page-header">
            <p className="page-header__eyebrow"><i className="ri-shield-user-line" /> App admin</p>
            <h1 className="page-header__title">Admin console</h1>
            <p className="page-header__desc">
              Approval queues for mentors and platforms, plus global override into any publisher.
            </p>
          </header>
          <div style={{ paddingTop: 32 }}>{children}</div>
        </div>
      </main>
      <Footer />
    </>
  )
}
