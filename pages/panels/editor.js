import Head from 'next/head'
import { useEffect, useMemo, useState } from 'react'
import { Nav, Footer, useAuth } from '../../components/Layout'
import { getPanelRoles } from '../../lib/panelAccess'
import { loadPanelDraft, savePanelDraft } from '../../lib/panelStore'

const EMPTY = {
  reviewQueue: [],
  selectedProposalId: '',
  editorialNotes: '',
  status: 'draft',
}

export default function EditorPanelPage() {
  const { signedIn, user, setShowAuth, mounted } = useAuth()
  const roles = useMemo(() => getPanelRoles(user), [user])
  const [draft, setDraft] = useState(EMPTY)
  const [status, setStatus] = useState('')

  useEffect(() => {
    let alive = true
    ;(async () => {
      const loaded = await loadPanelDraft('editor', EMPTY)
      if (alive && loaded) setDraft({ ...EMPTY, ...loaded })
    })()
    return () => { alive = false }
  }, [])

  async function persist(next) {
    setDraft(next)
    const res = await savePanelDraft('editor', next)
    setStatus(res.ok ? 'Saved' : `Saved locally${res.error ? ` · ${res.error}` : ''}`)
    setTimeout(() => setStatus(''), 1400)
  }

  if (!mounted) return null

  return (
    <>
      <Head><title>Editor Review Desk · Feyn</title></Head>
      <Nav />
      <main>
        <div className="container">
          <section className="panel-page">
            <h1 className="panel-page__title">Editor Review Desk</h1>
            {!signedIn ? (
              <div className="panel-gate">
                <p>Sign in to access Editor Review Desk.</p>
                <button className="btn btn--accent" onClick={() => setShowAuth(true)}><i className="ri-user-line" /> Sign in</button>
              </div>
            ) : !roles.editor && !roles.admin ? (
              <div className="panel-gate"><p>Access denied: editor role required.</p></div>
            ) : (
              <>
                <div className="panel-card-block">
                  <h2>Review Draft</h2>
                  <input className="profile-input" placeholder="Proposal ID" value={draft.selectedProposalId} onChange={e => setDraft(d => ({ ...d, selectedProposalId: e.target.value }))} />
                  <select className="profile-input" value={draft.status} onChange={e => setDraft(d => ({ ...d, status: e.target.value }))}>
                    <option value="draft">Draft</option>
                    <option value="in_review">In review</option>
                    <option value="changes_requested">Changes requested</option>
                    <option value="approved">Approved</option>
                  </select>
                  <textarea className="profile-input" placeholder="Editorial notes" value={draft.editorialNotes} onChange={e => setDraft(d => ({ ...d, editorialNotes: e.target.value }))} />
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button className="btn btn--accent" onClick={() => persist(draft)}><i className="ri-save-line" /> Save draft</button>
                  <button className="btn btn--ghost" onClick={() => persist(EMPTY)}>Reset</button>
                  {status && <span className="muted" style={{ alignSelf: 'center' }}>{status}</span>}
                </div>
              </>
            )}
          </section>
        </div>
      </main>
      <Footer />
    </>
  )
}

