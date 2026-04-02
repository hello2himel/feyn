import Head from 'next/head'
import { useEffect, useMemo, useState } from 'react'
import { Nav, Footer, useAuth } from '../../components/Layout'
import { getPanelRoles } from '../../lib/panelAccess'
import { loadPanelDraft, savePanelDraft } from '../../lib/panelStore'

const EMPTY = {
  releaseTag: '',
  summary: '',
  includedProposalIds: '',
  publishChecklist: {
    schemaChecked: false,
    mediaChecked: false,
    linksChecked: false,
    rollbackReady: false,
  },
}

export default function PublisherPanelPage() {
  const { signedIn, user, setShowAuth, mounted } = useAuth()
  const roles = useMemo(() => getPanelRoles(user), [user])
  const [draft, setDraft] = useState(EMPTY)
  const [status, setStatus] = useState('')

  useEffect(() => {
    let alive = true
    ;(async () => {
      const loaded = await loadPanelDraft('publisher', EMPTY)
      if (alive && loaded) setDraft({ ...EMPTY, ...loaded, publishChecklist: { ...EMPTY.publishChecklist, ...(loaded.publishChecklist || {}) } })
    })()
    return () => { alive = false }
  }, [])

  async function persist(next) {
    setDraft(next)
    const res = await savePanelDraft('publisher', next)
    setStatus(res.ok ? 'Saved' : `Saved locally${res.error ? ` · ${res.error}` : ''}`)
    setTimeout(() => setStatus(''), 1400)
  }

  if (!mounted) return null

  const allReady = Object.values(draft.publishChecklist).every(Boolean)

  return (
    <>
      <Head><title>Publisher Console · Feyn</title></Head>
      <Nav />
      <main>
        <div className="container">
          <section className="panel-page">
            <h1 className="panel-page__title">Publisher Console</h1>
            {!signedIn ? (
              <div className="panel-gate">
                <p>Sign in to access Publisher Console.</p>
                <button className="btn btn--accent" onClick={() => setShowAuth(true)}><i className="ri-user-line" /> Sign in</button>
              </div>
            ) : !roles.publisher && !roles.admin ? (
              <div className="panel-gate"><p>Access denied: publisher role required.</p></div>
            ) : (
              <>
                <div className="panel-card-block">
                  <h2>Release Draft</h2>
                  <input className="profile-input" placeholder="Release tag (e.g. content-2026-04-02)" value={draft.releaseTag} onChange={e => setDraft(d => ({ ...d, releaseTag: e.target.value }))} />
                  <textarea className="profile-input" placeholder="Release summary" value={draft.summary} onChange={e => setDraft(d => ({ ...d, summary: e.target.value }))} />
                  <textarea className="profile-input" placeholder="Included proposal IDs (comma-separated)" value={draft.includedProposalIds} onChange={e => setDraft(d => ({ ...d, includedProposalIds: e.target.value }))} />
                  <div className="panel-checks">
                    {Object.entries(draft.publishChecklist).map(([k, v]) => (
                      <label key={k} className="panel-check-row">
                        <input type="checkbox" checked={v} onChange={e => setDraft(d => ({ ...d, publishChecklist: { ...d.publishChecklist, [k]: e.target.checked } }))} />
                        {k}
                      </label>
                    ))}
                  </div>
                  <p className="muted">{allReady ? 'Checklist complete. Ready to publish.' : 'Complete all checklist items before publish.'}</p>
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

