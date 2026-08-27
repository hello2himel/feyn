// ============================================================
// pages/p/[slug]/dashboard.js — publisher dashboard (spec §7)
//
// Permission-scoped, per spec §3:
//   admin  → settings, join_policy, slug, members, invites, all courses
//   editor → all courses under this publisher
//   mentor → only the courses they are credited on
//
// Every mutation goes through a Part 7 RPC via /api/rpc, so join_policy
// and last-admin protection are enforced in exactly one place. The UI
// hides what the caller cannot do; the database refuses it regardless.
//
// Client-fetched and never statically generated (spec §6).
// ============================================================

import Head from 'next/head'
import Link from 'next/link'
import { useRouter } from 'next/router'
import { useState, useEffect, useCallback } from 'react'
import { Nav, Footer, useAuth } from '../../../components/Layout'
import HandleField from '../../../components/HandleField'
import { usePermissions } from '../../../lib/usePermissions'
import { canManagePublisher, canCreateSubject, hasPublisherRole, canEditSubject } from '../../../lib/permissions'
import { handleChangeStatus, HANDLE_CHANGE_CAP } from '../../../lib/handles'
import { callRpc, authedClient } from '../../../lib/api'

const POLICIES = [
  { value: 'open', label: 'Open', hint: 'Any approved mentor joins instantly.' },
  { value: 'approval_required', label: 'Approval required', hint: 'Mentors request; an admin decides.' },
  { value: 'invite_only', label: 'Invite only', hint: 'Only admins can start a membership.' },
]

const ROLES = ['admin', 'editor', 'mentor']

export default function PublisherDashboard() {
  const router = useRouter()
  const { slug } = router.query
  const { signedIn, setShowAuth, mounted } = useAuth()
  const { perms, loading: permsLoading, refresh: refreshPerms } = usePermissions()

  const [publisher, setPublisher] = useState(null)
  const [members, setMembers] = useState([])
  const [subjects, setSubjects] = useState([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState('')
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  const load = useCallback(async () => {
    if (!slug) return
    const sb = await authedClient()
    if (!sb) {
      setLoading(false)
      return
    }

    const { data: pub } = await sb
      .from('publishers')
      .select('id, name, slug, type, description, logo_url, brand_color, join_policy, status, slug_updated_at, slug_change_count, owner_mentor_id')
      .eq('slug', String(slug).toLowerCase())
      .maybeSingle()

    if (!pub) {
      setPublisher(null)
      setLoading(false)
      return
    }
    setPublisher(pub)

    // Membership rows are only visible to the member themself or an
    // admin of that publisher — the empty result for an editor is
    // correct, not an error.
    const [membersRes, subjectsRes] = await Promise.all([
      sb
        .from('publisher_memberships')
        .select('id, user_id, role, status, requested_by, created_at, mentors ( id, username, display_name, avatar_url )')
        .eq('publisher_id', pub.id)
        .order('created_at'),
      sb
        .from('subjects')
        .select('id, name, slug, status, publisher_id, programs ( slug, name )')
        .eq('publisher_id', pub.id)
        .order('sort_order'),
    ])

    setMembers(membersRes.data || [])
    setSubjects(subjectsRes.data || [])
    setLoading(false)
  }, [slug])

  useEffect(() => {
    load()
  }, [load])

  async function act(key, fn, successMsg) {
    setBusy(key)
    setError('')
    setNotice('')
    try {
      await fn()
      await Promise.all([load(), refreshPerms()])
      if (successMsg) setNotice(successMsg)
    } catch (e) {
      setError(e.message)
    } finally {
      setBusy('')
    }
  }

  async function setJoinPolicy(next) {
    await act('policy', async () => {
      const sb = await authedClient()
      if (!sb) throw new Error('Sign in to do that.')
      // join_policy is a plain column an admin may update directly; the
      // RLS policy on publishers allows it, and the guard trigger only
      // protects status/approved_by/slug.
      const { error: e } = await sb
        .from('publishers')
        .update({ join_policy: next })
        .eq('id', publisher.id)
      if (e) throw new Error(e.message)
    }, 'Join policy updated.')
  }

  if (!mounted) return null

  if (!signedIn) {
    return (
      <Shell slug={slug}>
        <p className="empty-state">Sign in to manage this publisher.</p>
        <button className="btn btn--accent" onClick={() => setShowAuth(true)}>
          <i className="ri-login-circle-line" /> Sign in
        </button>
      </Shell>
    )
  }

  if (loading || permsLoading) return <Shell slug={slug}><p className="empty-state">Loading…</p></Shell>

  if (!publisher) {
    return <Shell slug={slug}><p className="empty-state">No such publisher, or you cannot see it.</p></Shell>
  }

  const isAdmin = canManagePublisher(perms, publisher.id)
  const canSeeAllCourses = hasPublisherRole(perms, publisher.id, 'editor')

  if (!hasPublisherRole(perms, publisher.id, 'mentor')) {
    return (
      <Shell slug={slug} publisher={publisher}>
        <p className="empty-state">You are not a member of this publisher.</p>
        <Link href={`/p/${publisher.slug}`} className="btn btn--ghost btn--sm">
          <i className="ri-arrow-left-line" /> View public page
        </Link>
      </Shell>
    )
  }

  const pending = members.filter(m => m.status === 'pending')
  const approved = members.filter(m => m.status === 'approved')
  // A `mentor` role only sees courses they are credited on (spec §3).
  const visibleSubjects = canSeeAllCourses
    ? subjects
    : subjects.filter(s => canEditSubject(perms, s))

  return (
    <Shell slug={slug} publisher={publisher}>
      {error && <p className="auth-field__err" style={{ marginBottom: 16 }}><i className="ri-error-warning-line" /> {error}</p>}
      {notice && <p style={{ color: 'var(--accent)', fontSize: '0.82rem', marginBottom: 16 }}><i className="ri-check-line" /> {notice}</p>}

      {/* ── Courses ─────────────────────────────────────────── */}
      <section style={{ marginBottom: 44 }}>
        <p className="section-label"><i className="ri-stack-line" style={{ marginRight: 6 }} />Courses</p>
        {visibleSubjects.length === 0 && (
          <p className="empty-state">
            {canSeeAllCourses ? 'No courses yet.' : 'You are not credited on any course here yet.'}
          </p>
        )}
        <div style={{ display: 'grid', gap: 10 }}>
          {visibleSubjects.map(s => (
            <div key={s.id} className="course-row">
              <span className="course-row__icon"><i className="ri-book-open-line" /></span>
              <div className="course-row__info">
                <span className="course-row__name">
                  {s.status === 'published'
                    ? <Link href={`/${s.programs?.slug}/${s.slug}`}>{s.name}</Link>
                    : s.name}
                </span>
                <span className="course-row__meta">{s.programs?.name} · {s.status}</span>
              </div>
              {canEditSubject(perms, s) && (
                <Link href={`/panels/editor?subject=${s.id}`} className="btn btn--ghost btn--sm">
                  <i className="ri-edit-line" /> Edit
                </Link>
              )}
            </div>
          ))}
        </div>
        {canCreateSubject(perms, publisher.id) && (
          <p style={{ marginTop: 14 }}>
            <Link href={`/panels/editor?publisher=${publisher.id}`} className="btn btn--accent btn--sm">
              <i className="ri-add-line" /> New course
            </Link>
          </p>
        )}
      </section>

      {/* ── Members (admin only) ────────────────────────────── */}
      {isAdmin && (
        <>
          {pending.length > 0 && (
            <section style={{ marginBottom: 44 }}>
              <p className="section-label"><i className="ri-user-add-line" style={{ marginRight: 6 }} />Pending</p>
              <div style={{ display: 'grid', gap: 10 }}>
                {pending.map(m => (
                  <div key={m.id} className="course-row">
                    <span className="course-row__icon"><i className="ri-time-line" /></span>
                    <div className="course-row__info">
                      <span className="course-row__name">{m.mentors?.display_name || 'Mentor'}</span>
                      <span className="course-row__meta">
                        {m.requested_by === 'platform' ? 'invited — awaiting their reply' : `requested ${m.role}`}
                      </span>
                    </div>
                    {m.requested_by === 'mentor' && (
                      <>
                        <button
                          className="btn btn--accent btn--sm"
                          disabled={busy === `req-${m.id}`}
                          onClick={() => act(`req-${m.id}`, () => callRpc('review_join_request', { p_membership_id: m.id, p_approve: true }), 'Request approved.')}
                        >
                          <i className="ri-check-line" /> Approve
                        </button>
                        <button
                          className="btn btn--ghost btn--sm"
                          disabled={busy === `req-${m.id}`}
                          onClick={() => act(`req-${m.id}`, () => callRpc('review_join_request', { p_membership_id: m.id, p_approve: false }), 'Request rejected.')}
                        >
                          <i className="ri-close-line" /> Reject
                        </button>
                      </>
                    )}
                  </div>
                ))}
              </div>
            </section>
          )}

          <section style={{ marginBottom: 44 }}>
            <p className="section-label"><i className="ri-team-line" style={{ marginRight: 6 }} />Members</p>
            <div style={{ display: 'grid', gap: 10 }}>
              {approved.map(m => (
                <div key={m.id} className="course-row">
                  <span className="course-row__icon"><i className="ri-user-line" /></span>
                  <div className="course-row__info">
                    <span className="course-row__name">
                      {m.mentors?.username
                        ? <Link href={`/m/${m.mentors.username}`}>{m.mentors.display_name}</Link>
                        : (m.mentors?.display_name || 'Member')}
                    </span>
                    <span className="course-row__meta">{m.role}</span>
                  </div>
                  <label className="sr-only" htmlFor={`role-${m.id}`}>Role</label>
                  <select
                    id={`role-${m.id}`}
                    className="auth-input"
                    style={{ width: 120, padding: '5px 8px', fontSize: '0.72rem' }}
                    value={m.role}
                    disabled={busy === `role-${m.id}`}
                    onChange={e => act(`role-${m.id}`, () => callRpc('set_membership_role', { p_membership_id: m.id, p_role: e.target.value }), 'Role updated.')}
                  >
                    {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                  </select>
                  <button
                    className="btn btn--danger btn--sm"
                    disabled={busy === `rm-${m.id}`}
                    onClick={() => act(`rm-${m.id}`, () => callRpc('remove_publisher_member', { p_membership_id: m.id }), 'Member removed.')}
                  >
                    <i className="ri-user-unfollow-line" /> Remove
                  </button>
                </div>
              ))}
            </div>
            <InviteForm publisherId={publisher.id} onDone={msg => act('invite-done', async () => {}, msg)} />
          </section>

          <SettingsSection
            publisher={publisher}
            busy={busy}
            onPolicy={setJoinPolicy}
            onSlugChanged={load}
          />
        </>
      )}
    </Shell>
  )
}

// ── Invite by email ───────────────────────────────────────────────────
function InviteForm({ publisherId, onDone }) {
  const [email, setEmail] = useState('')
  const [role, setRole] = useState('mentor')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function submit(e) {
    e.preventDefault()
    setError('')
    setBusy(true)
    try {
      await callRpc('invite_publisher_member', {
        p_publisher_id: publisherId,
        p_email: email.trim(),
        p_role: role,
      })
      setEmail('')
      await onDone('Invitation sent. It stays pending until they accept.')
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <form onSubmit={submit} style={{ marginTop: 18, display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'flex-end' }}>
      <div style={{ flex: '1 1 240px' }}>
        <label className="auth-field__label" htmlFor="invite-email">Invite by email</label>
        <input
          id="invite-email"
          className="auth-input"
          type="email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          placeholder="mentor@example.com"
        />
      </div>
      <div>
        <label className="auth-field__label" htmlFor="invite-role">Role</label>
        <select
          id="invite-role"
          className="auth-input"
          style={{ width: 120 }}
          value={role}
          onChange={e => setRole(e.target.value)}
        >
          {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
        </select>
      </div>
      <button className="btn btn--accent btn--sm" type="submit" disabled={busy || !email.trim()}>
        <i className="ri-mail-send-line" /> {busy ? 'Sending…' : 'Invite'}
      </button>
      {error && <p className="auth-field__err" style={{ flexBasis: '100%' }}><i className="ri-error-warning-line" /> {error}</p>}
    </form>
  )
}

// ── Settings: join policy + slug (spec §2.4, §8.5) ────────────────────
function SettingsSection({ publisher, busy, onPolicy, onSlugChanged }) {
  const [nextSlug, setNextSlug] = useState('')
  const [slugOk, setSlugOk] = useState(false)
  const [slugBusy, setSlugBusy] = useState(false)
  const [slugError, setSlugError] = useState('')

  const status = handleChangeStatus({
    updatedAt: publisher.slug_updated_at,
    changeCount: publisher.slug_change_count,
  })

  async function changeSlug(e) {
    e.preventDefault()
    setSlugError('')
    setSlugBusy(true)
    try {
      await callRpc('change_publisher_slug', { p_publisher_id: publisher.id, p_new: nextSlug })
      // The dashboard URL itself contains the old slug, so navigate.
      window.location.href = `/p/${nextSlug}/dashboard`
    } catch (err) {
      setSlugError(err.message)
      setSlugBusy(false)
    }
  }

  return (
    <section style={{ paddingBottom: 60 }}>
      <p className="section-label"><i className="ri-settings-3-line" style={{ marginRight: 6 }} />Settings</p>

      <fieldset style={{ border: 0, padding: 0, margin: '0 0 28px' }}>
        <legend className="auth-field__label">Who can join</legend>
        <div style={{ display: 'grid', gap: 8, marginTop: 8, maxWidth: 480 }}>
          {POLICIES.map(p => (
            <label
              key={p.value}
              style={{
                display: 'flex', gap: 10, alignItems: 'flex-start', padding: '10px 12px',
                border: '1px solid var(--border)', borderRadius: 'var(--radius)', cursor: 'pointer',
                borderColor: publisher.join_policy === p.value ? 'var(--accent-2)' : 'var(--border)',
              }}
            >
              <input
                type="radio"
                name="join-policy"
                value={p.value}
                checked={publisher.join_policy === p.value}
                disabled={busy === 'policy' || publisher.type === 'solo'}
                onChange={() => onPolicy(p.value)}
                style={{ marginTop: 3 }}
              />
              <span>
                <span style={{ display: 'block', fontSize: '0.88rem' }}>{p.label}</span>
                <span style={{ display: 'block', fontSize: '0.72rem', color: 'var(--text-3)' }}>{p.hint}</span>
              </span>
            </label>
          ))}
        </div>
        {publisher.type === 'solo' && (
          <p style={{ fontSize: '0.72rem', color: 'var(--text-3)', marginTop: 8 }}>
            Solo publishers stay invite-only — they represent one person.
          </p>
        )}
      </fieldset>

      <div style={{ maxWidth: 480 }}>
        <p style={{ color: 'var(--text-2)', fontSize: '0.84rem', marginBottom: 12 }}>
          Public URL: <code>/p/{publisher.slug}</code> · {publisher.slug_change_count}/{HANDLE_CHANGE_CAP} changes used.
          {status.reason ? ` ${status.reason}` : ''}
        </p>
        {status.allowed && (
          <form onSubmit={changeSlug}>
            <HandleField
              namespace="publisher"
              label="New slug"
              prefix="feyn.app/p/"
              value={nextSlug}
              onChange={setNextSlug}
              onValidityChange={setSlugOk}
            />
            {slugError && <p className="auth-field__err"><i className="ri-error-warning-line" /> {slugError}</p>}
            <button className="btn btn--accent btn--sm" type="submit" disabled={slugBusy || !slugOk} style={{ marginTop: 14 }}>
              <i className="ri-save-line" /> {slugBusy ? 'Saving…' : 'Change slug'}
            </button>
          </form>
        )}
      </div>
    </section>
  )
}

function Shell({ slug, publisher, children }) {
  return (
    <>
      <Head><title>{publisher?.name || slug || 'Publisher'} dashboard · Feyn</title></Head>
      <Nav />
      <main>
        <div className="container" style={{ paddingBottom: 80 }}>
          <header className="page-header">
            <p className="page-header__eyebrow"><i className="ri-dashboard-line" /> Publisher dashboard</p>
            <h1 className="page-header__title">{publisher?.name || slug}</h1>
            {publisher && (
              <p className="page-header__desc">
                <Link href={`/p/${publisher.slug}`} style={{ color: 'var(--accent)' }}>View public page</Link>
              </p>
            )}
          </header>
          <div style={{ paddingTop: 32 }}>{children}</div>
        </div>
      </main>
      <Footer />
    </>
  )
}
