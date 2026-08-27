// ============================================================
// pages/studio/index.js — mentor studio (spec §7)
//
// One place for everything a mentor holds:
//   · pending invitations to accept or decline
//   · every approved membership, including their solo publisher
//   · a browse list of joinable platforms, with the join affordance
//     driven by each platform's join_policy (spec §2.4)
//   · account settings: username change with cooldown (spec §8.5)
//
// Client-fetched, never statically generated — it is behind auth and
// always needs fresh data (spec §6).
// ============================================================

import Head from 'next/head'
import Link from 'next/link'
import { useState, useEffect, useCallback } from 'react'
import { Nav, Footer, useAuth } from '../../components/Layout'
import HandleField from '../../components/HandleField'
import { usePermissions } from '../../lib/usePermissions'
import { approvedMemberships, pendingInvitations, isApprovedMentor } from '../../lib/permissions'
import { handleChangeStatus, HANDLE_CHANGE_CAP } from '../../lib/handles'
import { callRpc, authedClient } from '../../lib/api'

const POLICY_LABEL = {
  open: 'Open — join instantly',
  approval_required: 'Approval required',
  invite_only: 'Invite only',
}

export default function Studio() {
  const { signedIn, setShowAuth, mounted } = useAuth()
  const { perms, loading, refresh } = usePermissions()

  const [mentor, setMentor] = useState(null)
  const [platforms, setPlatforms] = useState([])
  const [joinState, setJoinState] = useState({})
  const [busy, setBusy] = useState('')
  const [error, setError] = useState('')

  const loadMentor = useCallback(async () => {
    const sb = await authedClient()
    if (!sb || !perms.mentorId) return
    const { data } = await sb
      .from('mentors')
      .select('id, username, display_name, status, username_updated_at, username_change_count')
      .eq('id', perms.mentorId)
      .maybeSingle()
    setMentor(data || null)
  }, [perms.mentorId])

  useEffect(() => {
    loadMentor()
  }, [loadMentor])

  // Joinable platforms: approved, type='platform', not already a member.
  useEffect(() => {
    if (!isApprovedMentor(perms)) return
    let alive = true
    ;(async () => {
      const sb = await authedClient()
      if (!sb) return
      const { data } = await sb
        .from('publishers')
        .select('id, name, slug, description, join_policy, logo_url')
        .eq('type', 'platform')
        .eq('status', 'approved')
        .order('name')
      if (!alive) return
      const mine = new Set((perms.memberships || []).map(m => m.publisher_id))
      setPlatforms((data || []).filter(p => !mine.has(p.id)))
    })()
    return () => { alive = false }
  }, [perms])

  async function act(key, fn) {
    setBusy(key)
    setError('')
    try {
      await fn()
      await refresh()
      await loadMentor()
    } catch (e) {
      setError(e.message)
    } finally {
      setBusy('')
    }
  }

  async function requestJoin(publisherId) {
    await act(`join-${publisherId}`, async () => {
      const status = await callRpc('request_publisher_join', { p_publisher_id: publisherId })
      setJoinState(s => ({ ...s, [publisherId]: status }))
    })
  }

  if (!mounted) return null

  if (!signedIn) {
    return (
      <Shell>
        <p className="empty-state">Sign in to open your studio.</p>
        <button className="btn btn--accent" onClick={() => setShowAuth(true)}>
          <i className="ri-login-circle-line" /> Sign in
        </button>
      </Shell>
    )
  }

  if (loading) return <Shell><p className="empty-state">Loading…</p></Shell>

  // Not a mentor and not an admin — point at the application forms.
  if (!perms.mentorId && !perms.isAppAdmin && approvedMemberships(perms).length === 0) {
    return (
      <Shell>
        <p className="empty-state">You are not a mentor yet.</p>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <Link href="/apply/mentor" className="btn btn--accent btn--sm">
            <i className="ri-user-star-line" /> Apply as a mentor
          </Link>
          <Link href="/apply/platform" className="btn btn--ghost btn--sm">
            <i className="ri-building-line" /> Register a platform
          </Link>
        </div>
      </Shell>
    )
  }

  const invites = pendingInvitations(perms)
  const memberships = approvedMemberships(perms)

  return (
    <Shell>
      {error && <p className="auth-field__err" style={{ marginBottom: 20 }}><i className="ri-error-warning-line" /> {error}</p>}

      {mentor?.status === 'pending' && (
        <p style={{ color: 'var(--text-2)', marginBottom: 28, fontSize: '0.88rem' }}>
          <i className="ri-time-line" /> Your mentor application is awaiting review.
        </p>
      )}

      {invites.length > 0 && (
        <section style={{ marginBottom: 40 }}>
          <p className="section-label"><i className="ri-mail-line" style={{ marginRight: 6 }} />Invitations & requests</p>
          <div style={{ display: 'grid', gap: 10 }}>
            {invites.map(m => (
              <div key={m.id} className="course-row">
                <span className="course-row__icon"><i className="ri-mail-open-line" /></span>
                <div className="course-row__info">
                  <span className="course-row__name">{m.publishers?.name || 'Publisher'}</span>
                  <span className="course-row__meta">invited as {m.role}</span>
                </div>
                <button
                  className="btn btn--accent btn--sm"
                  disabled={busy === `inv-${m.id}`}
                  onClick={() => act(`inv-${m.id}`, () => callRpc('respond_to_invitation', { p_membership_id: m.id, p_accept: true }))}
                >
                  <i className="ri-check-line" /> Accept
                </button>
                <button
                  className="btn btn--ghost btn--sm"
                  disabled={busy === `inv-${m.id}`}
                  onClick={() => act(`inv-${m.id}`, () => callRpc('respond_to_invitation', { p_membership_id: m.id, p_accept: false }))}
                >
                  <i className="ri-close-line" /> Decline
                </button>
              </div>
            ))}
          </div>
        </section>
      )}

      <section style={{ marginBottom: 40 }}>
        <p className="section-label"><i className="ri-building-line" style={{ marginRight: 6 }} />My publishers</p>
        {memberships.length === 0 && <p className="empty-state">No memberships yet.</p>}
        <div style={{ display: 'grid', gap: 10 }}>
          {memberships.map(m => {
            const pub = m.publishers || {}
            const isSolo = pub.type === 'solo'
            return (
              <div key={m.id} className="course-row">
                <span className="course-row__icon">
                  <i className={isSolo ? 'ri-user-star-line' : 'ri-building-line'} />
                </span>
                <div className="course-row__info">
                  <span className="course-row__name">
                    <Link href={`/p/${pub.slug}`}>{pub.name}</Link>
                  </span>
                  <span className="course-row__meta">
                    {m.role}{isSolo ? ' · your own space' : ''}
                    {pub.status !== 'approved' ? ` · ${pub.status}` : ''}
                  </span>
                </div>
                <Link href={`/p/${pub.slug}/dashboard`} className="btn btn--ghost btn--sm">
                  <i className="ri-dashboard-line" /> Manage
                </Link>
                {!isSolo && (
                  <button
                    className="btn btn--danger btn--sm"
                    disabled={busy === `leave-${m.publisher_id}`}
                    onClick={() => act(`leave-${m.publisher_id}`, () => callRpc('leave_publisher', { p_publisher_id: m.publisher_id }))}
                  >
                    <i className="ri-logout-box-line" /> Leave
                  </button>
                )}
              </div>
            )
          })}
        </div>
      </section>

      {isApprovedMentor(perms) && platforms.length > 0 && (
        <section style={{ marginBottom: 40 }}>
          <p className="section-label"><i className="ri-compass-discover-line" style={{ marginRight: 6 }} />Browse platforms</p>
          <div style={{ display: 'grid', gap: 10 }}>
            {platforms.map(p => {
              const requested = joinState[p.id]
              return (
                <div key={p.id} className="course-row">
                  <span className="course-row__icon"><i className="ri-building-line" /></span>
                  <div className="course-row__info">
                    <span className="course-row__name"><Link href={`/p/${p.slug}`}>{p.name}</Link></span>
                    <span className="course-row__meta">{POLICY_LABEL[p.join_policy] || p.join_policy}</span>
                  </div>
                  {requested ? (
                    <span className="tag" style={{ color: 'var(--accent)', borderColor: 'var(--accent-2)' }}>
                      {requested === 'approved' ? 'Joined' : 'Requested'}
                    </span>
                  ) : p.join_policy === 'invite_only' ? (
                    <span className="tag"><i className="ri-lock-line" /> Invite only</span>
                  ) : (
                    <button
                      className="btn btn--accent btn--sm"
                      disabled={busy === `join-${p.id}`}
                      onClick={() => requestJoin(p.id)}
                    >
                      <i className="ri-add-line" /> {p.join_policy === 'open' ? 'Join' : 'Request to join'}
                    </button>
                  )}
                </div>
              )
            })}
          </div>
        </section>
      )}

      {mentor && <UsernameSection mentor={mentor} onChanged={loadMentor} />}
    </Shell>
  )
}

// ── Account settings: username change (spec §8.4, §8.5) ───────────────
function UsernameSection({ mentor, onChanged }) {
  const [next, setNext] = useState('')
  const [ok, setOk] = useState(false)
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState('')
  const [error, setError] = useState('')

  const status = handleChangeStatus({
    updatedAt: mentor.username_updated_at,
    changeCount: mentor.username_change_count,
  })

  async function submit(e) {
    e.preventDefault()
    setError('')
    setMsg('')
    setBusy(true)
    try {
      await callRpc('change_mentor_username', { p_new: next })
      setMsg('Username updated. Your old links will redirect.')
      setNext('')
      await onChanged()
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <section style={{ paddingBottom: 60 }}>
      <p className="section-label"><i className="ri-at-line" style={{ marginRight: 6 }} />Account settings</p>
      <p style={{ color: 'var(--text-2)', fontSize: '0.86rem', marginBottom: 16 }}>
        Your profile is at{' '}
        <Link href={`/m/${mentor.username}`} style={{ color: 'var(--accent)' }}>/m/{mentor.username}</Link>.{' '}
        {mentor.username_change_count}/{HANDLE_CHANGE_CAP} changes used.
        {status.reason ? ` ${status.reason}` : ''}
      </p>

      {status.allowed && (
        <form onSubmit={submit} style={{ maxWidth: 480 }}>
          <HandleField
            namespace="mentor"
            label="New username"
            prefix="feyn.app/m/"
            value={next}
            onChange={setNext}
            onValidityChange={setOk}
          />
          {error && <p className="auth-field__err"><i className="ri-error-warning-line" /> {error}</p>}
          {msg && <p style={{ color: 'var(--accent)', fontSize: '0.8rem', marginTop: 8 }}>{msg}</p>}
          <button className="btn btn--accent btn--sm" type="submit" disabled={busy || !ok} style={{ marginTop: 14 }}>
            <i className="ri-save-line" /> {busy ? 'Saving…' : 'Change username'}
          </button>
        </form>
      )}
    </section>
  )
}

function Shell({ children }) {
  return (
    <>
      <Head><title>My studio · Feyn</title></Head>
      <Nav />
      <main>
        <div className="container" style={{ paddingBottom: 80 }}>
          <header className="page-header">
            <p className="page-header__eyebrow"><i className="ri-dashboard-line" /> Studio</p>
            <h1 className="page-header__title">My studio</h1>
            <p className="page-header__desc">
              Your publishers, invitations and account handle in one place.
            </p>
          </header>
          <div style={{ paddingTop: 32 }}>{children}</div>
        </div>
      </main>
      <Footer />
    </>
  )
}
