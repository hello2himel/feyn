// ============================================================
// pages/panels/publisher.js — course credits
//
// This is the one surface for the publisher-admin act that is not
// content editing: crediting mentors on a course (`subject_mentors`).
//
// Credit is a permission grant, not a label: a `mentor`-role member can
// only edit courses they are credited on. The schema enforces both
// halves — only a publisher admin may write credits, and only mentors
// with an approved membership in that publisher may be credited (see
// subject_mentors_write in docs/schema.sql).
//
// Publishing used to live here as a bare draft/published toggle. It
// moved into the course builder, where lib/courseReadiness.js can
// refuse to publish an empty course; a button here had no way to know
// whether the course had any content.
//
// Course text, topics and lessons live in the course builder
// (/studio/course/[id]).
// ============================================================

import Head from 'next/head'
import Link from 'next/link'
import { useState, useEffect, useCallback } from 'react'
import { Nav, Footer, useAuth } from '../../components/Layout'
import { usePermissions } from '../../lib/usePermissions'
import { approvedMemberships, canManagePublisher } from '../../lib/permissions'
import { authedClient } from '../../lib/api'

export default function PublisherPanel() {
  const { signedIn, setShowAuth, mounted } = useAuth()
  const { perms, loading: permsLoading } = usePermissions()

  const [publisherId, setPublisherId] = useState('')
  const [subjects, setSubjects] = useState([])
  const [members, setMembers] = useState([])
  const [credits, setCredits] = useState({})
  const [busy, setBusy] = useState('')
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  // Publishers this caller can administer. App admins can administer
  // any of them, so their list is fetched rather than derived.
  const [adminPublishers, setAdminPublishers] = useState([])

  useEffect(() => {
    if (permsLoading) return
    let alive = true
    ;(async () => {
      if (perms.isAppAdmin) {
        const sb = await authedClient()
        if (!sb) return
        const { data } = await sb
          .from('publishers')
          .select('id, name, slug, type')
          .eq('status', 'approved')
          .order('name')
        if (alive) setAdminPublishers(data || [])
      } else {
        const mine = approvedMemberships(perms)
          .filter(m => canManagePublisher(perms, m.publisher_id))
          .map(m => ({ id: m.publisher_id, name: m.publishers?.name, slug: m.publishers?.slug, type: m.publishers?.type }))
        if (alive) setAdminPublishers(mine)
      }
    })()
    return () => { alive = false }
  }, [perms, permsLoading])

  useEffect(() => {
    if (!publisherId && adminPublishers.length) setPublisherId(adminPublishers[0].id)
  }, [adminPublishers, publisherId])

  const load = useCallback(async () => {
    if (!publisherId) return
    const sb = await authedClient()
    if (!sb) return

    const [subjRes, memRes] = await Promise.all([
      sb
        .from('subjects')
        .select('id, name, slug, status, publisher_id, programs ( slug, name ), subject_mentors ( mentor_id, role_label )')
        .eq('publisher_id', publisherId)
        .order('sort_order'),
      sb
        .from('publisher_memberships')
        .select('mentor_id, role, status, mentors ( id, username, display_name )')
        .eq('publisher_id', publisherId)
        .eq('status', 'approved'),
    ])

    const subs = subjRes.data || []
    setSubjects(subs)
    setMembers((memRes.data || []).filter(m => m.mentors))
    setCredits(Object.fromEntries(subs.map(s => [s.id, (s.subject_mentors || []).map(sm => sm.mentor_id)])))
  }, [publisherId])

  useEffect(() => {
    load()
  }, [load])

  async function run(key, fn, msg) {
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

  async function toggleCredit(subjectId, mentorId, credited) {
    await run(`cr-${subjectId}-${mentorId}`, async () => {
      const sb = await authedClient()
      if (!sb) throw new Error('Sign in to do that.')
      if (credited) {
        const { error: e } = await sb
          .from('subject_mentors')
          .delete()
          .eq('subject_id', subjectId)
          .eq('mentor_id', mentorId)
        if (e) throw new Error(e.message)
      } else {
        const { error: e } = await sb
          .from('subject_mentors')
          .insert({ subject_id: subjectId, mentor_id: mentorId, role_label: 'lead' })
        if (e) throw new Error(e.message)
      }
    }, 'Credits updated.')
  }

  // Publishing moved to the course builder, where the readiness checks
  // live — a bare "Publish" button here could ship an empty course.

  if (!mounted) return null

  if (!signedIn) {
    return (
      <Shell>
        <p className="empty-state">Sign in to manage publishing.</p>
        <button className="btn btn--accent" onClick={() => setShowAuth(true)}>
          <i className="ri-login-circle-line" /> Sign in
        </button>
      </Shell>
    )
  }

  if (permsLoading) return <Shell><p className="empty-state">Loading…</p></Shell>

  if (adminPublishers.length === 0) {
    return (
      <Shell>
        <p className="empty-state">You are not an admin of any publisher.</p>
        <Link href="/studio" className="btn btn--ghost btn--sm"><i className="ri-dashboard-line" /> My studio</Link>
      </Shell>
    )
  }

  return (
    <Shell>
      {error && <p className="auth-field__err" style={{ marginBottom: 14 }}><i className="ri-error-warning-line" /> {error}</p>}
      {notice && <p style={{ color: 'var(--accent)', fontSize: '0.82rem', marginBottom: 14 }}><i className="ri-check-line" /> {notice}</p>}

      <div className="auth-field" style={{ maxWidth: 340 }}>
        <label className="auth-field__label" htmlFor="pub-select">Publisher</label>
        <select id="pub-select" className="auth-input" value={publisherId} onChange={e => setPublisherId(e.target.value)}>
          {adminPublishers.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
      </div>

      {members.length === 0 && (
        <p style={{ color: 'var(--text-3)', fontSize: '0.8rem', marginTop: 14 }}>
          No approved members yet — invite mentors from the publisher dashboard before assigning credits.
        </p>
      )}

      <section style={{ marginTop: 24 }}>
        {subjects.length === 0 && <p className="empty-state">No courses under this publisher yet.</p>}

        <div style={{ display: 'grid', gap: 16 }}>
          {subjects.map(s => {
            const credited = credits[s.id] || []
            return (
              <div key={s.id} className="panel-card-block">
                <h2>
                  {s.name}{' '}
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.65rem', color: 'var(--text-3)' }}>
                    {s.programs?.slug}/{s.slug} · {s.status}
                  </span>
                </h2>

                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
                  <Link href={`/studio/course/${s.id}`} className="btn btn--ghost btn--sm">
                    <i className="ri-edit-line" /> Open in builder
                  </Link>
                  {s.status === 'published' && (
                    <Link href={`/${s.programs?.slug}/${s.slug}`} className="btn btn--ghost btn--sm">
                      <i className="ri-external-link-line" /> View live
                    </Link>
                  )}
                </div>

                <span className="auth-field__label">Credited mentors</span>
                <div className="panel-checks">
                  {members.map(m => {
                    const isCredited = credited.includes(m.mentor_id)
                    return (
                      <label key={m.mentor_id} className="panel-check-row" style={{ textTransform: 'none' }}>
                        <input
                          type="checkbox"
                          checked={isCredited}
                          disabled={busy === `cr-${s.id}-${m.mentor_id}`}
                          onChange={() => toggleCredit(s.id, m.mentor_id, isCredited)}
                        />
                        {m.mentors.display_name}
                        <span style={{ color: 'var(--text-3)', fontSize: '0.7rem', fontFamily: 'var(--font-mono)' }}>
                          @{m.mentors.username} · {m.role}
                        </span>
                      </label>
                    )
                  })}
                </div>
                <p style={{ fontSize: '0.7rem', color: 'var(--text-3)', marginTop: 8 }}>
                  Crediting a <code>mentor</code>-role member also gives them edit rights on this course.
                </p>
              </div>
            )
          })}
        </div>
      </section>
    </Shell>
  )
}

function Shell({ children }) {
  return (
    <>
      <Head><title>Course credits · Feyn</title></Head>
      <Nav />
      <main>
        <div className="container panel-page">
          <h1 className="panel-page__title">Course credits</h1>
          <p style={{ color: 'var(--text-2)', margin: 0 }}>
            Who is credited on each course. Credit is also permission: a member with the{' '}
            <code>mentor</code> role can edit exactly the courses they are credited on.
            Publishing now happens in the course builder, next to the readiness checks.
          </p>
          <div>{children}</div>
        </div>
      </main>
      <Footer />
    </>
  )
}
