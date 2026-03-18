import Head from 'next/head'
import Link from 'next/link'
import { useState, useEffect } from 'react'
import { Nav, Footer, useAuth, ProgressBar, YTThumb } from '../components/Layout'
import {
  getProfile, saveProfile,
  getEnrolled, isEnrolled, enroll, unenroll,
  getFeedOrder, saveFeedOrder,
  getSubjectProgress,
} from '../lib/userStore'
import { classifySubjects, getTotalLessons, getCoachesFor } from '../data/courseHelpers'
import data from '../data/courses'

export default function SettingsPage() {
  const { signedIn, setShowAuth, refresh, mounted } = useAuth()
  const [activeTab, setActiveTab] = useState('classes')

  if (!mounted) return null

  if (!signedIn) {
    return (
      <>
        <Head><title>Settings · Feyn</title></Head>
        <Nav />
        <main>
          <div className="container">
            <div className="profile-gate">
              <i className="ri-settings-3-line profile-gate__icon" />
              <h1 className="profile-gate__title">Settings</h1>
              <p className="profile-gate__body">Sign in to manage your classes, interests, and feed.</p>
              <button className="btn btn--accent" onClick={() => setShowAuth(true)}>
                <i className="ri-user-line" /> Sign in
              </button>
            </div>
          </div>
        </main>
        <Footer />
      </>
    )
  }

  const tabs = [
    { id: 'classes',   label: 'My Classes',   icon: 'ri-graduation-cap-line' },
    { id: 'interests', label: 'My Interests',  icon: 'ri-heart-line' },
    { id: 'feed',      label: 'Feed Order',    icon: 'ri-layout-line' },
    { id: 'profile',   label: 'Profile',       icon: 'ri-user-line' },
  ]

  return (
    <>
      <Head><title>Settings · Feyn</title></Head>
      <Nav />
      <main>
        <div className="container">
          <header className="settings-header">
            <h1 className="settings-header__title">Settings</h1>
          </header>

          <div className="settings-layout">
            {/* Sidebar tabs */}
            <nav className="settings-nav">
              {tabs.map(t => (
                <button
                  key={t.id}
                  className={`settings-nav__item ${activeTab === t.id ? 'active' : ''}`}
                  onClick={() => setActiveTab(t.id)}
                >
                  <i className={t.icon} />
                  {t.label}
                </button>
              ))}
            </nav>

            {/* Content */}
            <div className="settings-content">
              {activeTab === 'classes'   && <ClassesTab />}
              {activeTab === 'interests' && <InterestsTab />}
              {activeTab === 'feed'      && <FeedTab />}
              {activeTab === 'profile'   && <ProfileTab onRefresh={refresh} />}
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </>
  )
}

// ── Classes tab ────────────────────────────────────────────────────────
function ClassesTab() {
  const { classes } = classifySubjects(data.programs)
  const [enrolled, setEnrolled] = useState(getEnrolled())

  function toggle(programId, subjectId) {
    if (isEnrolled(programId, subjectId)) unenroll(programId, subjectId)
    else enroll(programId, subjectId)
    setEnrolled(getEnrolled())
  }

  // Group by program
  const byProgram = {}
  for (const { program, subject } of classes) {
    if (!byProgram[program.id]) byProgram[program.id] = { program, subjects: [] }
    byProgram[program.id].subjects.push(subject)
  }

  return (
    <div className="settings-section">
      <div className="settings-section__header">
        <h2 className="settings-section__title">
          <i className="ri-graduation-cap-line" /> My Classes
        </h2>
        <p className="settings-section__desc">
          Select which academic classes you're enrolled in. These appear at the top of your feed.
        </p>
      </div>

      {Object.values(byProgram).map(({ program, subjects }) => (
        <div key={program.id} className="settings-program-group">
          <Link href={`/${program.id}`} className="settings-program-label">
            <i className="ri-stack-line" /> {program.name}
            <i className="ri-arrow-right-s-line" style={{ marginLeft: 'auto' }} />
          </Link>
          <div className="settings-course-grid">
            {subjects.map(subject => {
              const isEnr = enrolled.includes(`${program.id}/${subject.id}`)
              const pct   = getSubjectProgress(program.id, subject.id, subject)
              const total = getTotalLessons(subject)
              const coaches = getCoachesFor(subject.coachIds || [])
              return (
                <div key={subject.id} className={`settings-course-card ${isEnr ? 'settings-course-card--enrolled' : ''}`}>
                  <div className="settings-course-card__thumb">
                    <YTThumb videoId={subject.topics[0]?.lessons[0]?.videoId} alt={subject.name} />
                  </div>
                  <div className="settings-course-card__body">
                    <div className="settings-course-card__icon">
                      <i className={subject.icon || 'ri-book-open-line'} />
                    </div>
                    <p className="settings-course-card__name">{subject.name}</p>
                    <p className="settings-course-card__meta">
                      {total} lessons
                      {coaches.length > 0 && <> · {coaches[0].name}</>}
                    </p>
                    {isEnr && <ProgressBar pct={pct} label={`${pct}%`} />}
                  </div>
                  <div className="settings-course-card__actions">
                    {isEnr && (
                      <Link href={`/${program.id}/${subject.id}`} className="btn btn--ghost btn--sm">
                        <i className="ri-play-circle-line" /> Continue
                      </Link>
                    )}
                    <button
                      className={`btn btn--sm ${isEnr ? 'btn--danger' : 'btn--accent'}`}
                      onClick={() => toggle(program.id, subject.id)}
                    >
                      <i className={isEnr ? 'ri-close-line' : 'ri-add-line'} />
                      {isEnr ? 'Unenroll' : 'Enroll'}
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      ))}
    </div>
  )
}

// ── Interests tab ──────────────────────────────────────────────────────
function InterestsTab() {
  const { genres } = classifySubjects(data.programs)
  const [enrolled, setEnrolled] = useState(getEnrolled())

  function toggle(programId, subjectId) {
    if (isEnrolled(programId, subjectId)) unenroll(programId, subjectId)
    else enroll(programId, subjectId)
    setEnrolled(getEnrolled())
  }

  const byProgram = {}
  for (const { program, subject } of genres) {
    if (!byProgram[program.id]) byProgram[program.id] = { program, subjects: [] }
    byProgram[program.id].subjects.push(subject)
  }

  return (
    <div className="settings-section">
      <div className="settings-section__header">
        <h2 className="settings-section__title">
          <i className="ri-heart-line" /> My Interests
        </h2>
        <p className="settings-section__desc">
          Non-academic topics you want to explore — music, tech, art, languages and more.
        </p>
      </div>

      {Object.values(byProgram).map(({ program, subjects }) => (
        <div key={program.id} className="settings-program-group">
          <Link href={`/${program.id}`} className="settings-program-label">
            <i className="ri-compass-discover-line" /> {program.name}
            <i className="ri-arrow-right-s-line" style={{ marginLeft: 'auto' }} />
          </Link>
          <div className="settings-course-grid">
            {subjects.map(subject => {
              const isEnr = enrolled.includes(`${program.id}/${subject.id}`)
              const total = getTotalLessons(subject)
              const coaches = getCoachesFor(subject.coachIds || [])
              return (
                <div key={subject.id} className={`settings-course-card ${isEnr ? 'settings-course-card--enrolled' : ''}`}>
                  <div className="settings-course-card__thumb">
                    <YTThumb videoId={subject.topics[0]?.lessons[0]?.videoId} alt={subject.name} />
                  </div>
                  <div className="settings-course-card__body">
                    <div className="settings-course-card__icon">
                      <i className={subject.icon || 'ri-compass-discover-line'} />
                    </div>
                    <p className="settings-course-card__name">{subject.name}</p>
                    <p className="settings-course-card__meta">
                      {total} lessons
                      {coaches.length > 0 && <> · {coaches[0].name}</>}
                    </p>
                  </div>
                  <div className="settings-course-card__actions">
                    <button
                      className={`btn btn--sm ${isEnr ? 'btn--danger' : 'btn--accent'}`}
                      onClick={() => toggle(program.id, subject.id)}
                    >
                      <i className={isEnr ? 'ri-close-line' : 'ri-add-line'} />
                      {isEnr ? 'Remove' : 'Add'}
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      ))}
    </div>
  )
}

// ── Feed order tab ─────────────────────────────────────────────────────
function FeedTab() {
  const [sections, setSections] = useState(() => {
    const order = getFeedOrder()
    if (!order.length) return []
    const { classes, genres } = classifySubjects(data.programs)
    const all = [
      ...classes.map(x => ({ ...x, type: 'class' })),
      ...genres.map(x  => ({ ...x, type: 'genre' })),
    ]
    const enrolled = getEnrolled()
    const result = []
    const seen = new Set()
    for (const item of order) {
      if (seen.has(item.type)) continue
      seen.add(item.type)
      const typeItems = all.filter(x =>
        x.type === item.type &&
        enrolled.includes(`${x.program.id}/${x.subject.id}`)
      )
      if (typeItems.length) result.push({ type: item.type, items: typeItems })
    }
    return result
  })

  function move(idx, dir) {
    const next = [...sections]
    ;[next[idx], next[idx+dir]] = [next[idx+dir], next[idx]]
    setSections(next)
    saveFeedOrder(next.flatMap(s =>
      s.items.map(({ program, subject }) => ({ type: s.type, programId: program.id, subjectId: subject.id }))
    ))
  }

  const sectionLabels = { class: { label: 'My Classes', icon: 'ri-graduation-cap-line' }, genre: { label: 'My Interests', icon: 'ri-heart-line' } }

  return (
    <div className="settings-section">
      <div className="settings-section__header">
        <h2 className="settings-section__title"><i className="ri-layout-line" /> Feed Order</h2>
        <p className="settings-section__desc">
          Control which sections appear first on your home feed. Drag or use arrows to reorder.
        </p>
      </div>

      {sections.length === 0 ? (
        <div className="settings-empty">
          <i className="ri-inbox-line" />
          <p>Enroll in some classes or interests first, then come back to reorder your feed.</p>
          <Link href="/settings" className="btn btn--accent btn--sm" style={{ marginTop: 12 }}>
            ← Go to Classes
          </Link>
        </div>
      ) : (
        <div className="feed-settings-order" style={{ border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', overflow: 'hidden', marginTop: 16 }}>
          {sections.map((s, i) => {
            const { label, icon } = sectionLabels[s.type] || { label: s.type, icon: 'ri-folder-line' }
            return (
              <div key={s.type} className="feed-settings-row">
                <i className={icon} />
                <span>{label}</span>
                <span className="feed-settings-row__count">{s.items.length}</span>
                <div style={{ display: 'flex', gap: 4, marginLeft: 'auto' }}>
                  <button className="feed-reorder-btn" disabled={i === 0} onClick={() => move(i, -1)}><i className="ri-arrow-up-s-line" /></button>
                  <button className="feed-reorder-btn" disabled={i === sections.length-1} onClick={() => move(i, 1)}><i className="ri-arrow-down-s-line" /></button>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ── Profile tab ────────────────────────────────────────────────────────
function ProfileTab({ onRefresh }) {
  const [profile, setProfile] = useState(getProfile() || {})
  const [saved, setSaved]     = useState(false)

  function handleSave() {
    saveProfile({ name: profile.name, username: profile.username })
    setSaved(true)
    onRefresh()
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <div className="settings-section">
      <div className="settings-section__header">
        <h2 className="settings-section__title"><i className="ri-user-line" /> Profile</h2>
        <p className="settings-section__desc">Your display name and username.</p>
      </div>

      <div className="settings-fields">
        <div className="settings-field">
          <label className="settings-field__label">Display name</label>
          <input
            className="authflow-input"
            value={profile.name || ''}
            onChange={e => setProfile(p => ({ ...p, name: e.target.value }))}
            placeholder="Your name"
          />
        </div>
        <div className="settings-field">
          <label className="settings-field__label">Username</label>
          <div className="authflow-input-prefix-wrap">
            <span className="authflow-input-prefix">@</span>
            <input
              className="authflow-input authflow-input--prefixed"
              value={profile.username || ''}
              onChange={e => setProfile(p => ({ ...p, username: e.target.value.replace(/\s/g,'') }))}
              placeholder="username"
            />
          </div>
        </div>

        <button className="btn btn--accent" onClick={handleSave}>
          {saved ? <><i className="ri-check-line" /> Saved!</> : <><i className="ri-save-line" /> Save changes</>}
        </button>

        <div className="settings-field" style={{ marginTop: 32, paddingTop: 24, borderTop: '1px solid var(--border)' }}>
          <label className="settings-field__label" style={{ color: 'var(--text-3)' }}>Member since</label>
          <p style={{ fontSize: '0.88rem', color: 'var(--text-2)' }}>
            {profile.createdAt
              ? new Date(profile.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
              : '—'}
          </p>
        </div>
      </div>
    </div>
  )
}
