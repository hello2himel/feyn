// ============================================================
// pages/studio/index.js — creator home
//
// WHAT WAS WRONG WITH THE OLD STUDIO
// It listed memberships and an invitation queue, and that was all. The
// thing a mentor actually comes here to do — work on a course — was not
// on the page. Courses lived one or two clicks away under
// /p/{slug}/dashboard, per publisher, so a mentor teaching under two
// platforms had no single view of their own work. "New course" was a
// link into a raw editor with an empty form.
//
// WHAT THIS IS NOW
// A work surface. Courses first, across every publisher, each with its
// real readiness state; then anything waiting on the mentor
// (invitations, join requests); then the spaces they publish into; then
// account settings, collapsed out of the way.
//
// Data still comes straight from Supabase under RLS, so a mentor with
// the `mentor` role sees only what they are credited on, without this
// page having to know that rule.
// ============================================================

import Head from 'next/head'
import Link from 'next/link'
import { useState, useEffect, useCallback } from 'react'
import { Nav, Footer, useAuth, Plate } from '../../components/Layout'
import HandleField from '../../components/HandleField'
import { usePermissions } from '../../lib/usePermissions'
import {
  approvedMemberships, pendingInvitations, isApprovedMentor,
  canEditSubject, canCreateSubject, canManagePublisher,
} from '../../lib/permissions'
import { handleChangeStatus, HANDLE_CHANGE_CAP } from '../../lib/handles'
import { callRpc, authedClient } from '../../lib/api'

const POLICY_LABEL = {
  open: 'Open — join instantly',
  approval_required: 'Approval required',
  invite_only: 'Invite only',
}

const STATUS_TAG = {
  published: { label: 'Live', icon: 'ri-broadcast-line', cls: 'is-live' },
  draft: { label: 'Draft', icon: 'ri-draft-line', cls: 'is-draft' },
  archived: { label: 'Archived', icon: 'ri-archive-line', cls: 'is-archived' },
}

export default function Studio() {
  const { signedIn, setShowAuth, mounted, user } = useAuth()
  const { perms, loading, refresh } = usePermissions()

  const [mentor, setMentor] = useState(null)
  const [courses, setCourses] = useState([])
  const [platforms, setPlatforms] = useState([])
  const [joinState, setJoinState] = useState({})
  const [busy, setBusy] = useState('')
  const [error, setError] = useState('')
  const [dataLoading, setDataLoading] = useState(true)
  const [showAccount, setShowAccount] = useState(false)

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

  // Every course this caller can touch, across every publisher, with
  // enough of the tree to compute a real progress figure per course.
  const loadCourses = useCallback(async () => {
    const sb = await authedClient()
    if (!sb) return setDataLoading(false)

    const pubIds = approvedMemberships(perms).map(m => m.publisher_id)
    let q = sb
      .from('subjects')
      .select(`
        id, name, slug, description, icon, status, publisher_id, updated_at,
        programs ( slug, name ),
        publishers ( id, name, slug, type ),
        topics ( id, skills ( id, lessons ( id, status, video_url ) ) )
      `)
      .order('updated_at', { ascending: false })

    // App admins legitimately see everything; everyone else is scoped to
    // their own publishers so we do not pull the whole catalogue.
    if (!perms.isAppAdmin) {
      if (!pubIds.length) {
        setCourses([])
        setDataLoading(false)
        return
      }
      q = q.in('publisher_id', pubIds)
    }

    const { data, error: e } = await q
    if (e) setError(e.message)
    setCourses((data || []).filter(s => canEditSubject(perms, s)))
    setDataLoading(false)
  }, [perms])

  useEffect(() => { if (!loading) { loadMentor(); loadCourses() } }, [loading, loadMentor, loadCourses])

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
      await loadCourses()
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
        <div className="studio-gate">
          <i className="ri-lock-line studio-gate__icon" />
          <p className="studio-gate__text">Sign in to open your studio.</p>
          <button className="btn btn--accent" onClick={() => setShowAuth(true)}>
            <i className="ri-login-circle-line" /> Sign in
          </button>
        </div>
      </Shell>
    )
  }

  if (loading) return <Shell><p className="empty-state">Loading your studio…</p></Shell>

  const memberships = approvedMemberships(perms)
  const invites = pendingInvitations(perms)

  // No mentor record, no memberships, not an admin → this person has not
  // applied yet. Point at /teach rather than dumping them on a raw form.
  if (!perms.mentorId && !perms.isAppAdmin && memberships.length === 0) {
    return (
      <Shell>
        <div className="studio-gate">
          <i className="ri-quill-pen-line studio-gate__icon" />
          <p className="studio-gate__text">You don&rsquo;t have a publishing space yet.</p>
          <p className="studio-gate__sub">
            Mentors get their own publisher the moment they are approved. Schools and coaching
            centres register a platform instead and bring a team.
          </p>
          <div className="studio-gate__actions">
            <Link href="/teach" className="btn btn--accent btn--sm"><i className="ri-arrow-right-line" /> How teaching works</Link>
            <Link href="/apply/mentor" className="btn btn--ghost btn--sm"><i className="ri-user-star-line" /> Apply as a mentor</Link>
          </div>
        </div>
      </Shell>
    )
  }

  const canCreateAnywhere = memberships.some(m => canCreateSubject(perms, m.publisher_id)) || perms.isAppAdmin
  const drafts = courses.filter(c => c.status === 'draft')
  const live = courses.filter(c => c.status === 'published')
  const archived = courses.filter(c => c.status === 'archived')

  return (
    <Shell
      identity={mentor}
      right={canCreateAnywhere && (
        <Link href="/studio/new" className="btn btn--accent studio-head__cta">
          <i className="ri-add-line" /> New course
        </Link>
      )}
    >
      {error && <p className="auth-field__err" style={{ marginBottom: 20 }}><i className="ri-error-warning-line" /> {error}</p>}

      {mentor?.status === 'pending' && (
        <div className="studio-banner">
          <i className="ri-time-line" />
          <div>
            <p className="studio-banner__title">Your mentor application is under review</p>
            <p className="studio-banner__body">
              You&rsquo;ll get your own publisher as soon as an admin approves it. Nothing else to do.
            </p>
          </div>
        </div>
      )}

      {/* ── Anything waiting on this person, first ─────────────── */}
      {invites.length > 0 && (
        <section className="studio-section">
          <SectionHead icon="ri-mail-open-line" title="Waiting on you" count={invites.length} />
          <div className="studio-list">
            {invites.map(m => (
              <div key={m.id} className="studio-row">
                <span className="studio-row__icon"><i className="ri-mail-open-line" /></span>
                <div className="studio-row__body">
                  <p className="studio-row__title">{m.publishers?.name || 'A publisher'} invited you</p>
                  <p className="studio-row__meta">as {m.role} · accepting adds their courses to your studio</p>
                </div>
                <div className="studio-row__actions">
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
                    Decline
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ── Courses: the actual work ───────────────────────────── */}
      <section className="studio-section">
        <SectionHead icon="ri-stack-line" title="Your courses" count={courses.length} />

        {dataLoading ? (
          <p className="empty-state">Loading courses…</p>
        ) : courses.length === 0 ? (
          <div className="studio-empty">
            <i className="ri-book-open-line studio-empty__icon" />
            <p className="studio-empty__title">No courses yet</p>
            <p className="studio-empty__body">
              A course is a topic broken into skills, and skills broken into short lessons with
              questions. You can start with one lesson and grow it.
            </p>
            {canCreateAnywhere && (
              <Link href="/studio/new" className="btn btn--accent btn--sm">
                <i className="ri-add-line" /> Create your first course
              </Link>
            )}
          </div>
        ) : (
          <>
            {drafts.length > 0 && <CourseGroup label="In progress" icon="ri-draft-line" courses={drafts} multiPub={memberships.length > 1 || perms.isAppAdmin} />}
            {live.length > 0 && <CourseGroup label="Live" icon="ri-broadcast-line" courses={live} multiPub={memberships.length > 1 || perms.isAppAdmin} />}
            {archived.length > 0 && <CourseGroup label="Archived" icon="ri-archive-line" courses={archived} multiPub={memberships.length > 1 || perms.isAppAdmin} />}
          </>
        )}
      </section>

      {/* ── Publishing spaces ──────────────────────────────────── */}
      <section className="studio-section">
        <SectionHead icon="ri-building-line" title="Where you publish" count={memberships.length} />
        {memberships.length === 0 && <p className="empty-state">No publishing spaces yet.</p>}
        <div className="studio-list">
          {memberships.map(m => {
            const pub = m.publishers || {}
            const isSolo = pub.type === 'solo'
            const mine = courses.filter(c => c.publisher_id === m.publisher_id).length
            return (
              <div key={m.id} className="studio-row">
                <span className="studio-row__icon">
                  <i className={isSolo ? 'ri-user-star-line' : 'ri-building-line'} />
                </span>
                <div className="studio-row__body">
                  <p className="studio-row__title">
                    <Link href={`/p/${pub.slug}`}>{pub.name}</Link>
                    {isSolo && <span className="studio-chip">your own space</span>}
                  </p>
                  <p className="studio-row__meta">
                    you are {m.role} · {mine} course{mine === 1 ? '' : 's'}
                    {pub.status !== 'approved' ? ` · ${pub.status}` : ''}
                  </p>
                </div>
                <div className="studio-row__actions">
                  {canManagePublisher(perms, m.publisher_id) && (
                    <Link href={`/p/${pub.slug}/dashboard`} className="btn btn--ghost btn--sm">
                      <i className="ri-settings-3-line" /> Manage
                    </Link>
                  )}
                  {!isSolo && (
                    <button
                      className="btn btn--ghost btn--sm"
                      disabled={busy === `leave-${m.publisher_id}`}
                      onClick={() => {
                        if (!window.confirm(`Leave ${pub.name}? Courses stay with them.`)) return
                        act(`leave-${m.publisher_id}`, () => callRpc('leave_publisher', { p_publisher_id: m.publisher_id }))
                      }}
                    >
                      Leave
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </section>

      {/* ── Joinable platforms ─────────────────────────────────── */}
      {isApprovedMentor(perms) && platforms.length > 0 && (
        <section className="studio-section">
          <SectionHead icon="ri-compass-discover-line" title="Teach with a platform" count={platforms.length} />
          <p className="studio-section__note">
            Joining a platform doesn&rsquo;t affect your own space — you keep both.
          </p>
          <div className="studio-list">
            {platforms.map(p => {
              const requested = joinState[p.id]
              return (
                <div key={p.id} className="studio-row">
                  <span className="studio-row__icon"><i className="ri-building-line" /></span>
                  <div className="studio-row__body">
                    <p className="studio-row__title"><Link href={`/p/${p.slug}`}>{p.name}</Link></p>
                    <p className="studio-row__meta">{POLICY_LABEL[p.join_policy] || p.join_policy}</p>
                  </div>
                  <div className="studio-row__actions">
                    {requested ? (
                      <span className="studio-tag is-live">
                        {requested === 'approved' ? 'Joined' : 'Requested'}
                      </span>
                    ) : p.join_policy === 'invite_only' ? (
                      <span className="studio-tag"><i className="ri-lock-line" /> Invite only</span>
                    ) : (
                      <button
                        className="btn btn--accent btn--sm"
                        disabled={busy === `join-${p.id}`}
                        onClick={() => requestJoin(p.id)}
                      >
                        <i className="ri-add-line" /> {p.join_policy === 'open' ? 'Join' : 'Request'}
                      </button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </section>
      )}

      {/* ── Account, collapsed: rarely needed, never the point ── */}
      {mentor && (
        <section className="studio-section studio-section--quiet">
          <button className="studio-disclosure" onClick={() => setShowAccount(o => !o)} aria-expanded={showAccount}>
            <i className="ri-at-line" />
            <span>Your handle and profile</span>
            <span className="studio-disclosure__hint">/m/{mentor.username}</span>
            <i className={`ri-arrow-down-s-line studio-disclosure__chev${showAccount ? ' is-open' : ''}`} />
          </button>
          {showAccount && <UsernameSection mentor={mentor} onChanged={loadMentor} />}
        </section>
      )}
    </Shell>
  )
}

// ── Course group + card ───────────────────────────────────────────────
function CourseGroup({ label, icon, courses, multiPub }) {
  return (
    <div className="studio-group">
      <p className="studio-group__label"><i className={icon} /> {label} <span>{courses.length}</span></p>
      <div className="studio-courses">
        {courses.map(c => <CourseCard key={c.id} course={c} multiPub={multiPub} />)}
      </div>
    </div>
  )
}

function CourseCard({ course, multiPub }) {
  // Counts come from the nested select, so the card can show real
  // structure instead of a name and a status word.
  const skills = (course.topics || []).flatMap(t => t.skills || [])
  const lessons = skills.flatMap(s => s.lessons || [])
  const liveLessons = lessons.filter(l => l.status === 'published').length
  const videoless = lessons.filter(l => !l.video_url).length
  const tag = STATUS_TAG[course.status] || STATUS_TAG.draft

  return (
    <div className="studio-course">
      <Link href={`/studio/course/${course.id}`} className="studio-course__link" aria-label={`Edit ${course.name}`} />
      <div className="studio-course__top">
        <span className="studio-course__icon"><i className={course.icon || 'ri-book-open-line'} /></span>
        <span className={`studio-tag ${tag.cls}`}><i className={tag.icon} /> {tag.label}</span>
      </div>
      <h3 className="studio-course__name">{course.name || 'Untitled course'}</h3>
      <p className="studio-course__desc">
        {course.description?.trim() || 'No description yet — learners see this on every card.'}
      </p>
      <p className="studio-course__where">
        {course.programs?.name || 'No program'}
        {multiPub && course.publishers?.name ? ` · ${course.publishers.name}` : ''}
      </p>
      <div className="studio-course__stats">
        <span><i className="ri-folder-line" /> {(course.topics || []).length}</span>
        <span><i className="ri-shapes-line" /> {skills.length}</span>
        <span><i className="ri-play-circle-line" /> {liveLessons}/{lessons.length}</span>
        {videoless > 0 && (
          <span className="studio-course__warn" title={`${videoless} lesson(s) have no video`}>
            <i className="ri-alert-line" /> {videoless}
          </span>
        )}
      </div>
      <span className="studio-course__go">
        Open builder <i className="ri-arrow-right-line" />
      </span>
    </div>
  )
}

function SectionHead({ icon, title, count }) {
  return (
    <header className="studio-section__head">
      <h2 className="studio-section__title"><i className={icon} /> {title}</h2>
      {typeof count === 'number' && <span className="studio-section__count">{count}</span>}
    </header>
  )
}

// ── Handle change (unchanged rules, calmer presentation) ──────────────
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
      setMsg('Username updated. Old links redirect to the new one.')
      setNext('')
      await onChanged()
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="studio-account">
      <p className="studio-account__note">
        Your public profile is{' '}
        <Link href={`/m/${mentor.username}`}>/m/{mentor.username}</Link>.{' '}
        {mentor.username_change_count}/{HANDLE_CHANGE_CAP} changes used.
        {status.reason ? ` ${status.reason}` : ''}
      </p>

      {status.allowed && (
        <form onSubmit={submit} className="studio-account__form">
          <HandleField
            namespace="mentor"
            label="New username"
            prefix="feyn.app/m/"
            value={next}
            onChange={setNext}
            onValidityChange={setOk}
          />
          {error && <p className="auth-field__err"><i className="ri-error-warning-line" /> {error}</p>}
          {msg && <p className="studio-account__ok"><i className="ri-check-line" /> {msg}</p>}
          <button className="btn btn--accent btn--sm" type="submit" disabled={busy || !ok}>
            <i className="ri-save-line" /> {busy ? 'Saving…' : 'Change username'}
          </button>
        </form>
      )}
    </div>
  )
}

function Shell({ identity, right, children }) {
  return (
    <>
      <Head><title>Studio · Feyn</title></Head>
      <Nav />
      <main>
        <Plate>
          <header className="studio-head">
            <div>
              <p className="studio-head__eyebrow"><i className="ri-quill-pen-line" /> Studio</p>
              <h1 className="studio-head__title">
                {identity?.display_name ? `${identity.display_name}'s workspace` : 'Your workspace'}
              </h1>
              <p className="studio-head__sub">
                Everything you teach, in one place — whichever publisher it lives under.
              </p>
            </div>
            {right}
          </header>
        </Plate>
        <div className="container studio">
          {children}
        </div>
      </main>
      <Footer />
    </>
  )
}
