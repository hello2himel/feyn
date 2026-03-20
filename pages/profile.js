import Head from 'next/head'
import Link from 'next/link'
import { useState, useEffect } from 'react'
import { Nav, Footer, useAuth } from '../components/Layout'
import {
  getProfile, saveProfile, signOut, deleteAccount,
  getStats, getAllSkillProgress, getCerts,
} from '../lib/userStore'
import data from '../data/index.js'

export default function ProfilePage() {
  const { signedIn, setShowAuth, refresh, mounted } = useAuth()
  const [profile, setProfile]     = useState(null)
  const [editing, setEditing]     = useState(false)
  const [draftName, setDraftName] = useState('')
  const [stats, setStats]         = useState({ totalXp: 0, streak: 0 })
  const [skillProgress, setSP]    = useState({})
  const [certs, setCerts]         = useState([])

  function load() {
    const p = getProfile()
    setProfile(p)
    setDraftName(p?.name || '')
    setStats(getStats())
    setSP(getAllSkillProgress())
    setCerts(getCerts())
  }

  useEffect(() => { if (signedIn) load() }, [signedIn])

  async function handleSave() {
    if (!draftName.trim()) return
    const updated = await saveProfile({ name: draftName.trim() })  // BUG FIX: await
    setProfile(updated)
    setEditing(false)
    refresh()
  }

  function handleSignOut() { signOut(); refresh() }

  if (!mounted) return null

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
              <p className="profile-gate__body">Sign in to track your progress and earn certificates.</p>
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

  // Compute completed skills across all units
  const completedSkills = []
  for (const prog of data.programs) {
    for (const subj of prog.subjects) {
      for (const topic of subj.topics) {
        for (const skill of topic.skills) {
          const sp = skillProgress[`${prog.id}/${subj.id}/${topic.id}/${skill.id}`]
          if (sp?.status === 'complete' || sp?.status === 'mastered') {
            completedSkills.push({ prog, subj, topic, skill, sp })
          }
        }
      }
    }
  }

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
                    {profile?.createdAt
                      ? `Joined ${new Date(profile.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long' })}`
                      : ''}
                    {' · '}{completedSkills.length} skills complete
                    {' · '}{certs.length} {certs.length === 1 ? 'cert' : 'certs'}
                  </p>
                  <button className="btn btn--ghost btn--sm" onClick={() => { setEditing(true); setDraftName(profile?.name || '') }}>
                    <i className="ri-edit-line" /> Edit name
                  </button>
                </>
              )}
            </div>
          </section>

          <div className="divider" />

          {/* XP / Streak stats */}
          <section className="profile-section">
            <h2 className="profile-section__title">Progress</h2>
            <div className="profile-stats-grid">
              <div className="profile-stat-card">
                <i className="ri-sparkling-2-line" style={{ color: 'var(--accent)', fontSize: '1.5rem' }} />
                <span className="profile-stat-card__val">{stats.totalXp}</span>
                <span className="profile-stat-card__label">Total XP</span>
              </div>
              <div className="profile-stat-card">
                <i className="ri-fire-line" style={{ color: '#e6631c', fontSize: '1.5rem' }} />
                <span className="profile-stat-card__val">{stats.streak}</span>
                <span className="profile-stat-card__label">Day streak</span>
              </div>
              <div className="profile-stat-card">
                <i className="ri-checkbox-circle-line" style={{ color: 'var(--success)', fontSize: '1.5rem' }} />
                <span className="profile-stat-card__val">{completedSkills.length}</span>
                <span className="profile-stat-card__label">Skills done</span>
              </div>
              <div className="profile-stat-card">
                <i className="ri-vip-crown-line" style={{ color: 'var(--accent)', fontSize: '1.5rem' }} />
                <span className="profile-stat-card__val">{certs.length}</span>
                <span className="profile-stat-card__label">Certificates</span>
              </div>
            </div>
          </section>

          <div className="divider" />

          {/* Completed skills */}
          <section className="profile-section">
            <h2 className="profile-section__title">Completed Skills</h2>
            {completedSkills.length === 0 ? (
              <p className="empty-state">
                Complete lessons in a unit to see your progress here.{' '}
                <Link href={`/${data.programs[0]?.id}`} style={{ color: 'var(--accent)' }}>Start learning →</Link>
              </p>
            ) : (
              <div className="completed-skills-list">
                {completedSkills.map(({ unit, skill, sp }) => (
                  <Link key={`${prog.id}/${subj.id}/${topic.id}/${skill.id}`} href={`/${prog.id}/${subj.id}/${topic.id}`} className="completed-skill-row">
                    <div className="completed-skill-row__icon"><i className={skill.icon} /></div>
                    <div className="completed-skill-row__body">
                      <p className="completed-skill-row__name">{skill.name}</p>
                      <p className="completed-skill-row__meta">{prog.name} · {subj.name} · {sp.xp} XP</p>
                    </div>
                    {sp.status === 'mastered' && (
                      <span className="completed-skill-row__stars">
                        {Array.from({ length: sp.stars }).map((_, i) => <i key={i} className="ri-star-fill" style={{ color: '#f0c040', fontSize: '0.8rem' }} />)}
                      </span>
                    )}
                    <i className="ri-arrow-right-s-line" style={{ color: 'var(--text-3)' }} />
                  </Link>
                ))}
              </div>
            )}
          </section>

          <div className="divider" />

          {/* Certificates */}
          <section className="profile-section">
            <h2 className="profile-section__title">Certificates</h2>
            {certs.length === 0 ? (
              <p className="empty-state">Complete an entire unit to earn a certificate.</p>
            ) : (
              <div className="certs-list">
                {certs.map(cert => (
                  <div className="cert-card" key={cert.id}>
                    <div className="cert-card__icon"><i className="ri-award-fill" style={{ fontSize: '1.4rem', color: 'var(--accent)' }} /></div>
                    <div className="cert-card__info">
                      <p className="cert-card__title">{cert.unitName}</p>
                      <p className="cert-card__meta">{cert.id} · {new Date(cert.issuedAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
                    </div>
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
              Your progress syncs to the cloud across all your devices.
            </p>
            <button className="btn btn--danger btn--sm" onClick={handleSignOut}>
              <i className="ri-logout-box-line" /> Sign out
            </button>
          </section>

        </div>
      </main>
      <Footer />
    </>
  )
}
