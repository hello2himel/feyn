import Head from 'next/head'
import Link from 'next/link'
import { useState, useEffect } from 'react'
import { Nav, Footer, ProgressBar, useAuth } from '../components/Layout'
import {
  getProfile, saveProfile, signOut,
  getEnrolled, isEnrolled, enroll, unenroll,
  getSubjectProgress, getCerts, issueCert,
} from '../lib/userStore'
import { downloadCertificate } from '../lib/certificate'
import data from '../data/index.js'
import { coaches } from '../data/courseHelpers'
import { getCoachesFor, getTotalLessons } from '../data/courseHelpers'

export default function ProfilePage() {
  const { signedIn, setShowAuth, refresh, mounted } = useAuth()
  const [profile, setProfile]     = useState(null)
  const [editing, setEditing]     = useState(false)
  const [draftName, setDraftName] = useState('')
  const [enrolled, setEnrolled]   = useState([])
  const [certs, setCerts]         = useState([])
  const [certLoading, setCertLoading] = useState(null)
  const [certStatus, setCertStatus]   = useState({})  // { [certId]: 'fetching'|'pushing'|'verifying'|'verified' }

  function load() {
    const p = getProfile()
    setProfile(p)
    setDraftName(p?.name || '')
    setEnrolled(getEnrolled())
    setCerts(getCerts())
  }

  useEffect(() => {
    if (signedIn) load()
  }, [signedIn])

  function handleSave() {
    if (!draftName.trim()) return
    const updated = saveProfile({ name: draftName.trim() })
    setProfile(updated)
    setEditing(false)
    refresh()
  }

  function handleEnrollToggle(programId, subjectId) {
    if (isEnrolled(programId, subjectId)) unenroll(programId, subjectId)
    else enroll(programId, subjectId)
    setEnrolled(getEnrolled())
  }

  async function handleDownloadCert(cert) {
    const id = cert.id
    setCertLoading(id)
    const setStatus = s => setCertStatus(prev => ({ ...prev, [id]: s }))

    let coachName = 'Instructor', coachTitle = 'Instructor', coachSignatureUrl = null
    for (const program of data.programs) {
      const subj = program.subjects.find(s => s.id === (cert.subjectId || cert.subject_id))
      if (subj) {
        const coach = getCoachesFor(subj.coachIds || [])[0]
        coachName         = coach?.name      || coachName
        coachTitle        = coach?.title     || coachTitle
        coachSignatureUrl = coach?.signature || null
        break
      }
    }

    setStatus('fetching')

    // Re-issue pushes to DB and returns whether it actually landed
    const { cert: freshCert, dbOk, dbError } = await issueCert(
      cert.programId || cert.program_id,
      cert.subjectId || cert.subject_id,
      cert.subjectName || cert.subject_name,
      cert.programName || cert.program_name,
      cert.userName    || cert.user_name,
    )

    const finalCert = freshCert || cert

    if (!dbOk) {
      console.error('[Feyn] profile cert not in DB after push:', dbError)
      setStatus('failed')
      await new Promise(r => setTimeout(r, 1500))
    } else {
      setStatus('verified')
      await new Promise(r => setTimeout(r, 800))
    }

    await downloadCertificate({ cert: finalCert, coachName, coachTitle, coachSignatureUrl, isGlobal: true })

    setCertLoading(null)
    setCertStatus(prev => { const n = { ...prev }; delete n[id]; return n })
  }

  function handleSignOut() {
    signOut()
    refresh()
  }

  if (!mounted) return null

  // Not signed in, show prompt
  if (!signedIn) {
    return (
      <>
        <Head><title>Profile · Feyn</title></Head>
        <Nav />
        <main>
          <div className="container">
            <div className="profile-gate">
              <i className="ri-user-line profile-gate__icon" />
              <h1 className="profile-gate__title">Your profile</h1>
              <p className="profile-gate__body">
                Sign in to track your progress, earn certificates, and get a personalised feed.
              </p>
              <button className="btn btn--accent" onClick={() => setShowAuth(true)}>
                <i className="ri-user-line" /> Sign in or create account
              </button>
            </div>
          </div>
        </main>
        <Footer />
      </>
    )
  }

  // Enrolled subject details
  const enrolledSubjects = []
  for (const program of data.programs)
    for (const subject of program.subjects)
      if (isEnrolled(program.id, subject.id))
        enrolledSubjects.push({ program, subject, pct: getSubjectProgress(program.id, subject.id, subject) })

  return (
    <>
      <Head><title>My Profile · Feyn</title></Head>
      <Nav />
      <main>
        <div className="container">

          {/* Profile header */}
          <section className="profile-header">
            <div className="profile-avatar">{profile?.name ? profile.name[0].toUpperCase() : '?'}</div>
            <div className="profile-info">
              {editing ? (
                <div className="profile-edit">
                  <input className="profile-input" value={draftName} onChange={e => setDraftName(e.target.value)}
                    placeholder="Your name" autoFocus onKeyDown={e => e.key === 'Enter' && handleSave()} />
                  <button className="btn btn--accent btn--sm" onClick={handleSave}>Save</button>
                  <button className="btn btn--ghost btn--sm" onClick={() => setEditing(false)}>Cancel</button>
                </div>
              ) : (
                <>
                  <h1 className="profile-name">{profile?.name || <span className="muted">No name set</span>}</h1>
                  {profile?.username && <p className="profile-meta">@{profile.username}</p>}
                  <p className="profile-meta">
                    {profile?.createdAt ? `Joined ${new Date(profile.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long' })}` : 'Local profile'}
                    {' · '}{enrolledSubjects.length} enrolled{' · '}{certs.length} {certs.length === 1 ? 'cert' : 'certs'}
                  </p>
                  <button className="btn btn--ghost btn--sm" onClick={() => { setEditing(true); setDraftName(profile?.name || '') }}>
                    <i className="ri-edit-line" /> Edit name
                  </button>
                </>
              )}
            </div>
          </section>

          <div className="divider" />

          {/* Enrolled courses */}
          <section className="profile-section">
            <h2 className="profile-section__title">Enrolled Courses</h2>
            {enrolledSubjects.length === 0 ? (
              <p className="empty-state">Browse <Link href="/" style={{ color: 'var(--accent)' }}>subjects</Link> and click Enroll to get started.</p>
            ) : (
              <div className="enrolled-grid">
                {enrolledSubjects.map(({ program, subject, pct }) => (
                  <div className="enrolled-card" key={`${program.id}/${subject.id}`}>
                    <div className="enrolled-card__top">
                      <span className="enrolled-card__icon">
                        <i className={subject.icon || 'ri-book-open-line'} />
                      </span>
                      <div>
                        <p className="enrolled-card__program">{program.name}</p>
                        <Link href={`/${program.id}/${subject.id}`} className="enrolled-card__name">{subject.name}</Link>
                      </div>
                    </div>
                    <ProgressBar pct={pct} label={`${pct}% complete`} />
                    <div className="enrolled-card__actions">
                      <Link href={`/${program.id}/${subject.id}`} className="btn btn--accent btn--sm">Continue →</Link>
                      <button className="btn btn--ghost btn--sm" onClick={() => handleEnrollToggle(program.id, subject.id)}>Unenroll</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          <div className="divider" />

          {/* All courses */}
          <section className="profile-section">
            <h2 className="profile-section__title">All Courses</h2>
            <div className="all-courses-list">
              {data.programs.map(program =>
                program.subjects.map(subject => {
                  const isEnr = isEnrolled(program.id, subject.id)
                  const pct   = getSubjectProgress(program.id, subject.id, subject)
                  return (
                    <div className="course-row" key={`${program.id}/${subject.id}`}>
                      <span className="course-row__icon"><i className={subject.icon || 'ri-book-open-line'} /></span>
                      <div className="course-row__info">
                        <span className="course-row__name"><Link href={`/${program.id}/${subject.id}`}>{subject.name}</Link></span>
                        <span className="course-row__meta">{program.name} · {getTotalLessons(subject)} lessons</span>
                      </div>
                      {isEnr && <span className="tag" style={{ color: 'var(--accent)', borderColor: 'var(--accent-2)' }}>{pct}%</span>}
                      <button className={`btn btn--sm ${isEnr ? 'btn--ghost' : 'btn--accent'}`}
                        onClick={() => handleEnrollToggle(program.id, subject.id)}>
                        {isEnr ? '✓ Enrolled' : 'Enroll'}
                      </button>
                    </div>
                  )
                })
              )}
            </div>
          </section>

          <div className="divider" />

          {/* Certificates */}
          <section className="profile-section">
            <h2 className="profile-section__title">Certificates</h2>
            {certs.length === 0 ? (
              <p className="empty-state">Complete all lessons in a course to earn a certificate.</p>
            ) : (
              <div className="certs-list">
                {certs.map(cert => (
                  <div className="cert-card" key={cert.id}>
                    <div className="cert-card__icon"><i className="ri-award-fill" style={{ fontSize: '1.4rem', color: 'var(--accent)' }} /></div>
                    <div className="cert-card__info">
                      <p className="cert-card__title">{cert.subjectName || cert.subject_name}</p>
                      <p className="cert-card__meta">{cert.programName || cert.program_name} · {new Date(cert.issuedAt || cert.issued_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
                      <p className="cert-card__id">{cert.id}</p>
                    </div>
                    <button className="btn btn--accent btn--sm" onClick={() => handleDownloadCert(cert)} disabled={certLoading === cert.id}>
                      <i className={
                        certStatus[cert.id] === 'verified' ? 'ri-shield-check-fill'
                        : certStatus[cert.id] === 'failed' ? 'ri-error-warning-line'
                        : certStatus[cert.id] ? 'ri-loader-4-line ri-spin'
                        : 'ri-download-2-line'
                      } />
                      {certStatus[cert.id] === 'fetching'   ? 'Fetching…'
                        : certStatus[cert.id] === 'failed'  ? 'DB error — downloading anyway'
                        : certStatus[cert.id] === 'verified'? 'Verified ✓'
                        : 'Download PDF'}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </section>

          <div className="divider" />

          {/* Account */}
          <section className="profile-section" style={{ paddingBottom: 60 }}>
            <h2 className="profile-section__title" style={{ color: 'var(--text-3)' }}>Account</h2>
            <p style={{ fontSize: '0.82rem', color: 'var(--text-3)', marginBottom: 16 }}>
              Your data is stored locally in this browser only.
            </p>
            <button className="btn btn--danger btn--sm" onClick={handleSignOut}>
              <i className="ri-logout-box-line" /> Sign out &amp; clear data
            </button>
          </section>

        </div>
      </main>
      <Footer />
    </>
  )
}