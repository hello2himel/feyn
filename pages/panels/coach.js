import Head from 'next/head'
import { useEffect, useMemo, useState } from 'react'
import { Nav, Footer, useAuth } from '../../components/Layout'
import { getPanelRoles } from '../../lib/panelAccess'
import { loadPanelDraft, savePanelDraft } from '../../lib/panelStore'

const EMPTY = {
  coachProfile: { name: '', title: '', bio: '', avatar: '', signature: '', youtube: '', website: '' },
  lessonProposal: {
    programId: '',
    subjectId: '',
    topicId: '',
    lessonTitle: '',
    videoId: '',
    duration: '',
    summary: '',
    sourceName: '',
    sourceInstructor: '',
    sourceUrl: '',
  },
}

export default function CoachPanelPage() {
  const { signedIn, user, setShowAuth, mounted } = useAuth()
  const roles = useMemo(() => getPanelRoles(user), [user])
  const [draft, setDraft] = useState(EMPTY)
  const [status, setStatus] = useState('')

  useEffect(() => {
    let alive = true
    ;(async () => {
      const loaded = await loadPanelDraft('coach', EMPTY)
      if (alive && loaded) setDraft({ ...EMPTY, ...loaded })
    })()
    return () => { alive = false }
  }, [])

  async function persist(next) {
    setDraft(next)
    const res = await savePanelDraft('coach', next)
    setStatus(res.ok ? 'Saved' : `Saved locally${res.error ? ` · ${res.error}` : ''}`)
    setTimeout(() => setStatus(''), 1400)
  }

  if (!mounted) return null

  return (
    <>
      <Head><title>Coach Studio · Feyn</title></Head>
      <Nav />
      <main>
        <div className="container">
          <section className="panel-page">
            <h1 className="panel-page__title">Coach Studio</h1>
            {!signedIn ? (
              <div className="panel-gate">
                <p>Sign in to access Coach Studio.</p>
                <button className="btn btn--accent" onClick={() => setShowAuth(true)}><i className="ri-user-line" /> Sign in</button>
              </div>
            ) : !roles.coach && !roles.admin ? (
              <div className="panel-gate"><p>Access denied: coach role required.</p></div>
            ) : (
              <>
                <div className="panel-form-grid">
                  <div className="panel-card-block">
                    <h2>Coach Profile Draft</h2>
                    <input className="profile-input" placeholder="Name" value={draft.coachProfile.name} onChange={e => setDraft(d => ({ ...d, coachProfile: { ...d.coachProfile, name: e.target.value } }))} />
                    <input className="profile-input" placeholder="Title" value={draft.coachProfile.title} onChange={e => setDraft(d => ({ ...d, coachProfile: { ...d.coachProfile, title: e.target.value } }))} />
                    <textarea className="profile-input" placeholder="Bio" value={draft.coachProfile.bio} onChange={e => setDraft(d => ({ ...d, coachProfile: { ...d.coachProfile, bio: e.target.value } }))} />
                    <input className="profile-input" placeholder="Avatar URL/path" value={draft.coachProfile.avatar} onChange={e => setDraft(d => ({ ...d, coachProfile: { ...d.coachProfile, avatar: e.target.value } }))} />
                    <input className="profile-input" placeholder="Signature URL/path" value={draft.coachProfile.signature} onChange={e => setDraft(d => ({ ...d, coachProfile: { ...d.coachProfile, signature: e.target.value } }))} />
                  </div>
                  <div className="panel-card-block">
                    <h2>Lesson Proposal Draft</h2>
                    <input className="profile-input" placeholder="Program ID" value={draft.lessonProposal.programId} onChange={e => setDraft(d => ({ ...d, lessonProposal: { ...d.lessonProposal, programId: e.target.value } }))} />
                    <input className="profile-input" placeholder="Subject ID" value={draft.lessonProposal.subjectId} onChange={e => setDraft(d => ({ ...d, lessonProposal: { ...d.lessonProposal, subjectId: e.target.value } }))} />
                    <input className="profile-input" placeholder="Topic ID" value={draft.lessonProposal.topicId} onChange={e => setDraft(d => ({ ...d, lessonProposal: { ...d.lessonProposal, topicId: e.target.value } }))} />
                    <input className="profile-input" placeholder="Lesson title" value={draft.lessonProposal.lessonTitle} onChange={e => setDraft(d => ({ ...d, lessonProposal: { ...d.lessonProposal, lessonTitle: e.target.value } }))} />
                    <input className="profile-input" placeholder="YouTube video ID" value={draft.lessonProposal.videoId} onChange={e => setDraft(d => ({ ...d, lessonProposal: { ...d.lessonProposal, videoId: e.target.value } }))} />
                    <textarea className="profile-input" placeholder="Proposal summary" value={draft.lessonProposal.summary} onChange={e => setDraft(d => ({ ...d, lessonProposal: { ...d.lessonProposal, summary: e.target.value } }))} />
                  </div>
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

