// ============================================================
// pages/panels/index.js — panel hub, driven by real permissions
//
// The old version derived roles from NEXT_PUBLIC_PANEL_* email lists,
// which is exactly the flat-role model spec §3 forbids. Cards are now
// shown from lib/permissions.js: app-admin status, mentor status and
// per-publisher membership roles.
// ============================================================

import Head from 'next/head'
import Link from 'next/link'
import { Nav, Footer, useAuth } from '../../components/Layout'
import { usePermissions } from '../../lib/usePermissions'
import { approvedMemberships, canManagePublisher, hasPublisherRole } from '../../lib/permissions'

function PanelCard({ href, title, body, icon }) {
  return (
    <Link href={href} className="panel-card">
      <div className="panel-card__icon"><i className={icon} /></div>
      <div>
        <h3 className="panel-card__title">{title}</h3>
        <p className="panel-card__body">{body}</p>
      </div>
    </Link>
  )
}

export default function PanelsHub() {
  const { signedIn, setShowAuth, mounted } = useAuth()
  const { perms, loading } = usePermissions()

  if (!mounted) return null

  const memberships = approvedMemberships(perms)
  const canEditSomething = perms.isAppAdmin || memberships.some(m => hasPublisherRole(perms, m.publisher_id, 'mentor'))
  const canAdminSomething = perms.isAppAdmin || memberships.some(m => canManagePublisher(perms, m.publisher_id))

  return (
    <>
      <Head><title>Panels · Feyn</title></Head>
      <Nav />
      <main>
        <div className="container">
          <section className="panel-hub">
            <h1 className="panel-hub__title">Creator panels</h1>
            <p className="panel-hub__sub">
              What you see here follows your actual memberships — there is no separate role list.
            </p>

            {!signedIn && (
              <div className="panel-gate">
                <p>Sign in to see your panels.</p>
                <button className="btn btn--accent" onClick={() => setShowAuth(true)}>
                  <i className="ri-user-line" /> Sign in
                </button>
              </div>
            )}

            {signedIn && loading && <p className="empty-state">Loading…</p>}

            {signedIn && !loading && !canEditSomething && !perms.mentorId && (
              <div className="panel-gate">
                <p>You have no publishing access yet.</p>
                <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 10 }}>
                  <Link href="/apply/mentor" className="btn btn--accent btn--sm">
                    <i className="ri-user-star-line" /> Apply as a mentor
                  </Link>
                  <Link href="/apply/platform" className="btn btn--ghost btn--sm">
                    <i className="ri-building-line" /> Register a platform
                  </Link>
                </div>
              </div>
            )}

            {signedIn && !loading && (perms.mentorId || canEditSomething) && (
              <div className="panel-grid">
                <PanelCard
                  href="/studio"
                  title="My studio"
                  body="Your publishers, invitations and account handle."
                  icon="ri-dashboard-line"
                />
                {canAdminSomething && (
                  <PanelCard
                    href="/panels/publisher"
                    title="Credits & publishing"
                    body="Assign course credits and publish or unpublish courses."
                    icon="ri-rocket-line"
                  />
                )}
                {canEditSomething && (
                  <PanelCard
                    href="/panels/editor"
                    title="Course editor"
                    body="Edit topics, skills, lessons and questions directly."
                    icon="ri-edit-box-line"
                  />
                )}
                {perms.isAppAdmin && (
                  <PanelCard
                    href="/admin"
                    title="Admin console"
                    body="Approve mentors and platforms, override any publisher."
                    icon="ri-shield-user-line"
                  />
                )}
              </div>
            )}

            {signedIn && !loading && memberships.length > 0 && (
              <div style={{ marginTop: 28 }}>
                <p className="section-label"><i className="ri-building-line" style={{ marginRight: 6 }} />Your publishers</p>
                <div style={{ display: 'grid', gap: 8 }}>
                  {memberships.map(m => (
                    <div key={m.id} className="course-row">
                      <span className="course-row__icon">
                        <i className={m.publishers?.type === 'solo' ? 'ri-user-star-line' : 'ri-building-line'} />
                      </span>
                      <div className="course-row__info">
                        <span className="course-row__name">
                          <Link href={`/p/${m.publishers?.slug}`}>{m.publishers?.name}</Link>
                        </span>
                        <span className="course-row__meta">{m.role}</span>
                      </div>
                      <Link href={`/p/${m.publishers?.slug}/dashboard`} className="btn btn--ghost btn--sm">
                        <i className="ri-dashboard-line" /> Dashboard
                      </Link>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </section>
        </div>
      </main>
      <Footer />
    </>
  )
}
