import Head from 'next/head'
import Link from 'next/link'
import { useMemo } from 'react'
import { Nav, Footer, useAuth } from '../../components/Layout'
import { getPanelRoles } from '../../lib/panelAccess'

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

export default function PanelsHubPage() {
  const { signedIn, user, setShowAuth, mounted } = useAuth()
  const roles = useMemo(() => getPanelRoles(user), [user])

  if (!mounted) return null

  return (
    <>
      <Head><title>Panels · Feyn</title></Head>
      <Nav />
      <main>
        <div className="container">
          <section className="panel-hub">
            <h1 className="panel-hub__title">Creator & Ops Panels</h1>
            <p className="panel-hub__sub">
              This replaces hardcoded-only content workflows with role-based panel operations.
            </p>

            {!signedIn && (
              <div className="panel-gate">
                <p>Sign in first to access role-based panels.</p>
                <button className="btn btn--accent" onClick={() => setShowAuth(true)}>
                  <i className="ri-user-line" /> Sign in
                </button>
              </div>
            )}

            {signedIn && !(roles.admin || roles.coach || roles.editor || roles.publisher) && (
              <div className="panel-gate">
                <p>Your account has no panel role assigned yet.</p>
                <p className="muted">Ask an admin to add your email to role environment variables.</p>
              </div>
            )}

            {signedIn && (roles.admin || roles.coach || roles.editor || roles.publisher) && (
              <div className="panel-grid">
                {roles.admin && (
                  <PanelCard
                    href="/admin"
                    title="Admin Content Studio"
                    body="Manage full course tree, coaches, and JSON export package."
                    icon="ri-shield-user-line"
                  />
                )}
                {roles.coach && (
                  <PanelCard
                    href="/panels/coach"
                    title="Coach Studio"
                    body="Update coach profile draft and submit lesson proposals."
                    icon="ri-graduation-cap-line"
                  />
                )}
                {roles.editor && (
                  <PanelCard
                    href="/panels/editor"
                    title="Editor Review Desk"
                    body="Review and refine coach proposals into publication-ready content."
                    icon="ri-file-edit-line"
                  />
                )}
                {roles.publisher && (
                  <PanelCard
                    href="/panels/publisher"
                    title="Publisher Console"
                    body="Create final publish bundle and promote approved content."
                    icon="ri-rocket-2-line"
                  />
                )}
              </div>
            )}
          </section>
        </div>
      </main>
      <Footer />
    </>
  )
}

