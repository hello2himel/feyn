import Head from 'next/head'
import Link from 'next/link'
import { useState, useEffect, useRef } from 'react'
import { Nav, Footer, useAuth, ProgressBar, YTThumb } from '../components/Layout'
import {
  getProfile, saveProfile, signOut, isGlobalAccount, getAccountType,
  getEnrolled, isEnrolled, enroll, unenroll, getFeedOrder, saveFeedOrder,
  getSubjectProgress, getCerts, upgradeToGlobal, exportAccountData,
} from '../lib/userStore'
import { isSupabaseAvailable } from '../lib/supabase'
import { classifySubjects, getTotalLessons, getCoachesFor } from '../data/courseHelpers'
import { downloadCertificate } from '../lib/certificate'
import data from '../data/courses'

// ── Tab definitions ───────────────────────────────────────────────────
const TABS = [
  { id: 'account',     label: 'Account',       icon: 'ri-user-settings-line',   group: 'You' },
  { id: 'security',    label: 'Security',       icon: 'ri-shield-keyhole-line',  group: 'You' },
  { id: 'sync',        label: 'Sync & Data',    icon: 'ri-cloud-line',           group: 'You' },
  { id: 'appearance',  label: 'Appearance',     icon: 'ri-palette-line',         group: 'App' },
  { id: 'classes',     label: 'My Classes',     icon: 'ri-graduation-cap-line',  group: 'Learning' },
  { id: 'interests',   label: 'My Interests',   icon: 'ri-heart-line',           group: 'Learning' },
  { id: 'feed',        label: 'Feed Order',     icon: 'ri-layout-masonry-line',  group: 'Learning' },
  { id: 'privacy',     label: 'Privacy & Data', icon: 'ri-lock-password-line',   group: 'Data' },
  { id: 'danger',      label: 'Delete Account', icon: 'ri-delete-bin-line',      group: 'Data' },
]

export default function SettingsPage() {
  const { signedIn, setShowAuth, refresh, mounted, theme, setTheme } = useAuth()
  const [activeTab, setActiveTab] = useState('account')

  if (!mounted) return null

  if (!signedIn) {
    return (
      <>
        <Head><title>Settings - Feyn</title></Head>
        <Nav />
        <main>
          <div className="container">
            <div className="profile-gate">
              <i className="ri-settings-3-line profile-gate__icon" />
              <h1 className="profile-gate__title">Settings</h1>
              <p className="profile-gate__body">Sign in to access your settings.</p>
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

  const groups = [...new Set(TABS.map(t => t.group))]

  return (
    <>
      <Head><title>Settings - Feyn</title></Head>
      <Nav />
      <main>
        <div className="container">
          <header className="settings-header">
            <h1 className="settings-header__title">Settings</h1>
          </header>

          <div className="settings-layout">

            {/* Sidebar */}
            <nav className="settings-nav">
              {groups.map(group => (
                <div key={group} className="settings-nav__group">
                  <p className="settings-nav__group-label">{group}</p>
                  {TABS.filter(t => t.group === group).map(t => (
                    <button
                      key={t.id}
                      className={`settings-nav__item ${activeTab === t.id ? 'active' : ''} ${t.id === 'danger' ? 'danger' : ''}`}
                      onClick={() => setActiveTab(t.id)}
                    >
                      <i className={t.icon} />
                      {t.label}
                    </button>
                  ))}
                </div>
              ))}
            </nav>

            {/* Content */}
            <div className="settings-content">
              {activeTab === 'account'    && <AccountTab    onRefresh={refresh} />}
              {activeTab === 'security'   && <SecurityTab   onRefresh={refresh} />}
              {activeTab === 'sync'       && <SyncTab       onRefresh={refresh} />}
              {activeTab === 'appearance' && <AppearanceTab />}
              {activeTab === 'classes'    && <ClassesTab />}
              {activeTab === 'interests'  && <InterestsTab />}
              {activeTab === 'feed'       && <FeedTab />}
              {activeTab === 'privacy'    && <PrivacyTab />}
              {activeTab === 'danger'     && <DangerTab     onRefresh={refresh} />}
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </>
  )
}

// ── Helpers ───────────────────────────────────────────────────────────

function SectionHeader({ title, desc }) {
  return (
    <div className="settings-section__header">
      <h2 className="settings-section__title">{title}</h2>
      {desc && <p className="settings-section__desc">{desc}</p>}
    </div>
  )
}

function SaveButton({ onClick, saving, saved, label = 'Save changes' }) {
  return (
    <button className="btn btn--accent" onClick={onClick} disabled={saving}>
      {saving ? <><i className="ri-loader-4-line" /> Saving</> :
       saved  ? <><i className="ri-check-line" /> Saved!</> :
                <><i className="ri-save-line" /> {label}</>}
    </button>
  )
}

function StatusBadge({ type, children }) {
  const colours = { success: 'var(--success)', error: 'var(--danger)', info: 'var(--accent)' }
  return (
    <p style={{
      fontSize: '0.82rem', color: colours[type] || 'var(--text-2)',
      display: 'flex', alignItems: 'center', gap: 6, marginTop: 8,
      padding: '8px 12px', background: `${colours[type]}14`,
      borderRadius: 'var(--radius)', border: `1px solid ${colours[type]}30`,
    }}>
      <i className={type === 'success' ? 'ri-check-circle-line' : type === 'error' ? 'ri-error-warning-line' : 'ri-information-line'} />
      {children}
    </p>
  )
}

// ── ACCOUNT TAB ───────────────────────────────────────────────────────
function AccountTab({ onRefresh }) {
  const profile = getProfile() || {}
  const [name, setName]         = useState(profile.name || '')
  const [username, setUsername] = useState(profile.username || '')
  const [saved, setSaved]       = useState(false)
  const [saving, setSaving]     = useState(false)

  function handleSave() {
    setSaving(true)
    saveProfile({ name: name.trim(), username: username.trim() })
    onRefresh()
    setTimeout(() => { setSaving(false); setSaved(true) }, 400)
    setTimeout(() => setSaved(false), 2400)
  }

  const isGlobal = isGlobalAccount()
  const accountType = isGlobal ? 'Global (synced)' : 'Local (this device only)'

  return (
    <div className="settings-section">
      <SectionHeader title="Account" desc="Your public identity on Feyn." />

      {/* Avatar placeholder */}
      <div className="settings-avatar-row">
        <div className="settings-avatar">
          {name ? name[0].toUpperCase() : <i className="ri-user-line" />}
        </div>
        <div>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-2)', marginBottom: 4 }}>
            Profile picture coming soon. Avatar will use your initials for now.
          </p>
          <span className="settings-account-type">
            <i className={isGlobal ? 'ri-cloud-line' : 'ri-hard-drive-line'} />
            {accountType}
          </span>
        </div>
      </div>

      <div className="settings-fields">
        <div className="settings-field">
          <label className="settings-field__label">Display name</label>
          <input className="authflow-input" value={name} onChange={e => setName(e.target.value)} placeholder="Your name" />
        </div>
        <div className="settings-field">
          <label className="settings-field__label">Username</label>
          <div className="authflow-input-prefix-wrap">
            <span className="authflow-input-prefix">@</span>
            <input className="authflow-input authflow-input--prefixed" value={username} onChange={e => setUsername(e.target.value.replace(/\s/g,''))} placeholder="username" />
          </div>
        </div>
        <div>
          <SaveButton onClick={handleSave} saving={saving} saved={saved} />
        </div>
      </div>

      <div className="settings-divider" />

      <SectionHeader title="Member since" />
      <p style={{ fontSize: '0.88rem', color: 'var(--text-2)' }}>
        {profile.createdAt
          ? new Date(profile.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
          : 'Unknown'}
      </p>
    </div>
  )
}

// ── SECURITY TAB ──────────────────────────────────────────────────────
function SecurityTab({ onRefresh }) {
  const isGlobal  = isGlobalAccount()
  const supabaseOn = isSupabaseAvailable()

  return (
    <div className="settings-section">
      <SectionHeader title="Security" desc="Manage how you sign in to Feyn." />

      {!isGlobal && (
        <div className="settings-info-box">
          <i className="ri-information-line" />
          <div>
            <p style={{ fontWeight: 500, marginBottom: 4 }}>Local account</p>
            <p style={{ fontSize: '0.83rem', color: 'var(--text-2)' }}>
              Your account lives on this device only. There is no password or email
              because nothing is sent to a server. To add cross-device security and
              sync, upgrade to a global account in the Sync tab.
            </p>
          </div>
        </div>
      )}

      {isGlobal && (
        <>
          <div className="settings-field">
            <label className="settings-field__label">Account type</label>
            <p style={{ fontSize: '0.88rem', color: 'var(--text-2)', display: 'flex', alignItems: 'center', gap: 8 }}>
              <i className="ri-cloud-line" style={{ color: 'var(--accent)' }} />
              Global account — synced via Supabase
            </p>
          </div>

          <div className="settings-divider" />

          <SectionHeader
            title="Session"
            desc="You are signed in anonymously (no email or password required). Your session persists via a secure token stored in your browser."
          />

          <button className="btn btn--ghost btn--sm" onClick={() => {
            if (confirm('Sign out of this device? Your synced data will remain in the cloud.')) {
              signOut(); window.location.href = '/'
            }
          }}>
            <i className="ri-logout-box-line" /> Sign out of this device
          </button>
        </>
      )}

      <div className="settings-divider" />

      <SectionHeader
        title="Session management"
        desc="Active sessions on other devices. Full session management available after email auth is added."
      />
      <div className="settings-coming-soon">
        <i className="ri-computer-line" />
        <span>Multi-device session management coming in a future update.</span>
      </div>
    </div>
  )
}

// ── SYNC TAB ──────────────────────────────────────────────────────────
function SyncTab({ onRefresh }) {
  const isGlobal   = isGlobalAccount()
  const supabaseOn = isSupabaseAvailable()
  const profile    = getProfile() || {}

  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [username, setUsername] = useState(profile.username || '')
  const [showPass, setShowPass] = useState(false)
  const [errors, setErrors]     = useState({})
  const [upgrading, setUpgrading] = useState(false)
  const [result, setResult]       = useState(null)

  function setErr(field, msg) { setErrors(p => ({ ...p, [field]: msg })) }
  function clearErr(field)    { setErrors(p => { const n = { ...p }; delete n[field]; return n }) }

  async function handleUpgrade(e) {
    e.preventDefault()
    setErrors({}); setResult(null)
    let hasError = false
    if (!email.trim() || !email.includes('@')) { setErr('email', 'Enter a valid email.'); hasError = true }
    if (!password || password.length < 6)       { setErr('password', 'Min. 6 characters.'); hasError = true }
    if (hasError) return

    if (!confirm('This will create a cloud account and upload all your local progress. Continue?')) return
    setUpgrading(true)
    const res = await upgradeToGlobal({ email, password, username: username || profile.username })
    setUpgrading(false)

    if (!res.ok) {
      if (res.field) setErr(res.field, res.error)
      else setResult({ ok: false, msg: res.error })
      return
    }
    if (res.needsVerify) {
      setResult({ ok: 'verify', email })
      return
    }
    setResult({ ok: true })
    onRefresh()
  }

  return (
    <div className="settings-section">
      <SectionHeader title="Sync and storage" desc="Control where your data lives." />

      <div className="settings-sync-status">
        <div className={`settings-sync-indicator ${isGlobal ? 'active' : ''}`} />
        <div>
          <p className="settings-sync-status__label">{isGlobal ? 'Cloud sync is on' : 'Local only'}</p>
          <p className="settings-sync-status__sub">
            {isGlobal
              ? 'Your progress, certs and enrollments sync across all your devices.'
              : 'Everything is stored on this device. Nothing leaves your browser.'}
          </p>
        </div>
      </div>

      {!isGlobal && supabaseOn && !result?.ok && (
        <>
          <div className="settings-divider" />
          <SectionHeader
            title="Upgrade to cloud sync"
            desc="Sync your progress and certificates across all your devices. Create an account with email and password."
          />

          {result?.ok === 'verify' && (
            <StatusBadge type="success">
              Check your email at <strong>{result.email}</strong> to confirm, then sign in again.
            </StatusBadge>
          )}

          <form onSubmit={handleUpgrade} className="settings-fields" style={{ marginTop: 16 }}>
            {/* Username — may already be set */}
            <div className="settings-field">
              <label className="settings-field__label">
                Username <span style={{ opacity: 0.5, fontSize: '0.75em' }}>(optional)</span>
              </label>
              <div className={`authflow-input-prefix-wrap ${errors.username ? 'authflow-input-prefix-wrap--error' : ''}`}>
                <span className="authflow-input-prefix">@</span>
                <input
                  className="authflow-input authflow-input--prefixed"
                  placeholder={profile.username || 'username'}
                  value={username}
                  onChange={e => { setUsername(e.target.value.replace(/\s/g, '')); clearErr('username') }}
                />
              </div>
              {errors.username && <p className="authflow-field-error"><i className="ri-error-warning-line" /> {errors.username}</p>}
            </div>

            <div className="settings-field">
              <label className="settings-field__label">Email address</label>
              <input
                className={`authflow-input ${errors.email ? 'authflow-input--error' : ''}`}
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={e => { setEmail(e.target.value); clearErr('email') }}
              />
              {errors.email && <p className="authflow-field-error"><i className="ri-error-warning-line" /> {errors.email}</p>}
            </div>

            <div className="settings-field">
              <label className="settings-field__label">Create a password</label>
              <div className="authflow-pass-wrap">
                <input
                  className={`authflow-input authflow-input--pass ${errors.password ? 'authflow-input--error' : ''}`}
                  type={showPass ? 'text' : 'password'}
                  placeholder="Min. 6 characters"
                  value={password}
                  onChange={e => { setPassword(e.target.value); clearErr('password') }}
                />
                <button type="button" className="authflow-pass-toggle" onClick={() => setShowPass(s => !s)}>
                  <i className={showPass ? 'ri-eye-off-line' : 'ri-eye-line'} />
                </button>
              </div>
              {errors.password && <p className="authflow-field-error"><i className="ri-error-warning-line" /> {errors.password}</p>}
            </div>

            {result && !result.ok && <StatusBadge type="error">{result.msg}</StatusBadge>}

            <div className="settings-upgrade-box__features" style={{ marginBottom: 4 }}>
              {['Access progress from any device', 'Certificates stored in cloud', 'Anonymous local data uploaded'].map(f => (
                <p key={f} className="settings-upgrade-box__feat">
                  <i className="ri-check-line" /> {f}
                </p>
              ))}
            </div>

            <button type="submit" className="btn btn--accent" disabled={upgrading}>
              {upgrading
                ? <><i className="ri-loader-4-line" /> Upgrading</>
                : <><i className="ri-cloud-upload-line" /> Enable cloud sync</>}
            </button>
          </form>
        </>
      )}

      {result?.ok === true && (
        <>
          <div className="settings-divider" />
          <StatusBadge type="success">Cloud sync enabled. Your data has been uploaded.</StatusBadge>
        </>
      )}

      {!supabaseOn && !isGlobal && (
        <>
          <div className="settings-divider" />
          <div className="settings-info-box">
            <i className="ri-cloud-off-line" />
            <div>
              <p style={{ fontWeight: 500, marginBottom: 4 }}>Cloud sync not configured</p>
              <p style={{ fontSize: '0.83rem', color: 'var(--text-2)' }}>
                Add <code>NEXT_PUBLIC_SUPABASE_URL</code> and <code>NEXT_PUBLIC_SUPABASE_ANON_KEY</code> to your Netlify environment variables.
              </p>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

// ── APPEARANCE TAB ────────────────────────────────────────────────────
function AppearanceTab() {
  const [theme, setThemeState] = useState('dark')

  useEffect(() => {
    const stored = localStorage.getItem('ff_theme')
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
    setThemeState(stored || (prefersDark ? 'dark' : 'light'))
  }, [])

  function setTheme(t) {
    setThemeState(t)
    document.documentElement.setAttribute('data-theme', t)
    localStorage.setItem('ff_theme', t)
  }

  return (
    <div className="settings-section">
      <SectionHeader title="Appearance" desc="Customise how Feyn looks." />

      <div className="settings-field">
        <label className="settings-field__label">Theme</label>
        <div className="settings-theme-grid">
          {[
            { id: 'dark',   label: 'Dark',   icon: 'ri-moon-line',      desc: 'Easy on the eyes' },
            { id: 'light',  label: 'Light',  icon: 'ri-sun-line',       desc: 'High contrast' },
            { id: 'system', label: 'System', icon: 'ri-contrast-line',  desc: 'Matches your OS' },
          ].map(opt => (
            <button
              key={opt.id}
              className={`settings-theme-card ${theme === opt.id ? 'active' : ''}`}
              onClick={() => {
                if (opt.id === 'system') {
                  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
                  setTheme(prefersDark ? 'dark' : 'light')
                  localStorage.removeItem('ff_theme')
                  setThemeState('system')
                } else {
                  setTheme(opt.id)
                }
              }}
            >
              <i className={opt.icon} />
              <span className="settings-theme-card__label">{opt.label}</span>
              <span className="settings-theme-card__desc">{opt.desc}</span>
              {theme === opt.id && <i className="ri-check-line settings-theme-card__check" />}
            </button>
          ))}
        </div>
      </div>

      <div className="settings-divider" />

      <SectionHeader title="Font size" desc="Adjust text size across the app." />
      <div className="settings-coming-soon">
        <i className="ri-font-size" />
        <span>Font size control coming soon.</span>
      </div>
    </div>
  )
}

// ── CLASSES TAB ───────────────────────────────────────────────────────
function ClassesTab() {
  const { classes } = classifySubjects(data.programs)
  const [enrolled, setEnrolled] = useState(getEnrolled())

  function toggle(programId, subjectId) {
    if (isEnrolled(programId, subjectId)) unenroll(programId, subjectId)
    else enroll(programId, subjectId)
    setEnrolled(getEnrolled())
  }

  const byProgram = {}
  for (const { program, subject } of classes) {
    if (!byProgram[program.id]) byProgram[program.id] = { program, subjects: [] }
    byProgram[program.id].subjects.push(subject)
  }

  return (
    <div className="settings-section">
      <SectionHeader title="My Classes" desc="Which academic classes are you enrolled in? These appear at the top of your feed." />
      {Object.values(byProgram).map(({ program, subjects }) => (
        <div key={program.id} className="settings-program-group">
          <Link href={`/${program.id}`} className="settings-program-label">
            <i className="ri-stack-line" /> {program.name}
            <i className="ri-arrow-right-s-line" style={{ marginLeft: 'auto' }} />
          </Link>
          <div className="settings-course-grid">
            {subjects.map(subject => {
              const isEnr  = enrolled.includes(`${program.id}/${subject.id}`)
              const pct    = getSubjectProgress(program.id, subject.id, subject)
              const total  = getTotalLessons(subject)
              return (
                <div key={subject.id} className={`settings-course-card ${isEnr ? 'settings-course-card--enrolled' : ''}`}>
                  <div className="settings-course-card__thumb">
                    <YTThumb videoId={subject.topics[0]?.lessons[0]?.videoId} alt={subject.name} />
                  </div>
                  <div className="settings-course-card__body">
                    <i className={subject.icon || 'ri-book-open-line'} style={{ color: 'var(--accent)', marginBottom: 3, display: 'block' }} />
                    <p className="settings-course-card__name">{subject.name}</p>
                    <p className="settings-course-card__meta">{total} lessons</p>
                    {isEnr && <ProgressBar pct={pct} label={`${pct}%`} />}
                  </div>
                  <div className="settings-course-card__actions">
                    {isEnr && <Link href={`/${program.id}/${subject.id}`} className="btn btn--ghost btn--sm"><i className="ri-play-circle-line" /> Go</Link>}
                    <button className={`btn btn--sm ${isEnr ? 'btn--danger' : 'btn--accent'}`} onClick={() => toggle(program.id, subject.id)}>
                      <i className={isEnr ? 'ri-close-line' : 'ri-add-line'} /> {isEnr ? 'Leave' : 'Join'}
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

// ── INTERESTS TAB ─────────────────────────────────────────────────────
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
      <SectionHeader title="My Interests" desc="Non-academic topics you want to explore." />
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
              return (
                <div key={subject.id} className={`settings-course-card ${isEnr ? 'settings-course-card--enrolled' : ''}`}>
                  <div className="settings-course-card__thumb">
                    <YTThumb videoId={subject.topics[0]?.lessons[0]?.videoId} alt={subject.name} />
                  </div>
                  <div className="settings-course-card__body">
                    <i className={subject.icon || 'ri-compass-discover-line'} style={{ color: 'var(--accent)', marginBottom: 3, display: 'block' }} />
                    <p className="settings-course-card__name">{subject.name}</p>
                    <p className="settings-course-card__meta">{total} lessons</p>
                  </div>
                  <div className="settings-course-card__actions">
                    <button className={`btn btn--sm ${isEnr ? 'btn--danger' : 'btn--accent'}`} onClick={() => toggle(program.id, subject.id)}>
                      <i className={isEnr ? 'ri-close-line' : 'ri-add-line'} /> {isEnr ? 'Remove' : 'Add'}
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

// ── FEED TAB ──────────────────────────────────────────────────────────
function FeedTab() {
  const [sections, setSections] = useState(() => {
    const order    = getFeedOrder()
    const enrolled = getEnrolled()
    const { classes, genres } = classifySubjects(data.programs)
    const all = [
      ...classes.map(x => ({ ...x, type: 'class' })),
      ...genres.map(x  => ({ ...x, type: 'genre' })),
    ]
    const result = []
    const seen = new Set()
    for (const item of order) {
      if (seen.has(item.type)) continue
      seen.add(item.type)
      const items = all.filter(x => x.type === item.type && enrolled.includes(`${x.program.id}/${x.subject.id}`))
      if (items.length) result.push({ type: item.type, label: item.type === 'class' ? 'My Classes' : 'My Interests', icon: item.type === 'class' ? 'ri-graduation-cap-line' : 'ri-heart-line', items })
    }
    return result
  })

  function move(idx, dir) {
    const next = [...sections]
    ;[next[idx], next[idx+dir]] = [next[idx+dir], next[idx]]
    setSections(next)
    saveFeedOrder(next.flatMap(s => s.items.map(({ program, subject }) => ({ type: s.type, programId: program.id, subjectId: subject.id }))))
  }

  return (
    <div className="settings-section">
      <SectionHeader title="Feed Order" desc="Control which sections appear first on your home feed." />
      {sections.length === 0 ? (
        <div className="settings-empty">
          <i className="ri-inbox-line" />
          <p>Enroll in some classes or interests first, then come back to reorder.</p>
        </div>
      ) : (
        <div style={{ border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', overflow: 'hidden', marginTop: 16 }}>
          {sections.map((s, i) => (
            <div key={s.type} className="feed-settings-row">
              <i className={s.icon} />
              <span>{s.label}</span>
              <span className="feed-settings-row__count">{s.items.length}</span>
              <div style={{ display: 'flex', gap: 4, marginLeft: 'auto' }}>
                <button className="feed-reorder-btn" disabled={i === 0} onClick={() => move(i, -1)}><i className="ri-arrow-up-s-line" /></button>
                <button className="feed-reorder-btn" disabled={i === sections.length-1} onClick={() => move(i, 1)}><i className="ri-arrow-down-s-line" /></button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ── PRIVACY TAB ───────────────────────────────────────────────────────
function PrivacyTab() {
  const [downloading, setDownloading] = useState(false)

  function handleDownload() {
    setDownloading(true)
    const data = exportAccountData()
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a')
    a.href     = url
    a.download = `feyn-data-${Date.now()}.json`
    a.click()
    URL.revokeObjectURL(url)
    setTimeout(() => setDownloading(false), 1000)
  }

  return (
    <div className="settings-section">
      <SectionHeader title="Privacy and data" desc="What we store and how you control it." />

      <div className="settings-info-box">
        <i className="ri-shield-check-line" />
        <div>
          <p style={{ fontWeight: 500, marginBottom: 6 }}>What Feyn stores</p>
          <ul style={{ paddingLeft: 16, color: 'var(--text-2)', fontSize: '0.85rem', display: 'flex', flexDirection: 'column', gap: 4 }}>
            <li>Your name and username</li>
            <li>Which courses you're enrolled in</li>
            <li>Which lessons you've watched</li>
            <li>Your certificates</li>
            <li>Your feed preferences</li>
          </ul>
          <p style={{ marginTop: 10, fontSize: '0.82rem', color: 'var(--text-3)' }}>
            No email. No location. No behavioural tracking. No advertising data.
          </p>
        </div>
      </div>

      <div className="settings-divider" />

      <SectionHeader title="Download your data" desc="Get a copy of everything Feyn has stored about you, in JSON format." />
      <button className="btn btn--ghost" onClick={handleDownload} disabled={downloading}>
        <i className="ri-download-2-line" /> {downloading ? 'Downloading' : 'Download my data'}
      </button>

      <div className="settings-divider" />

      <SectionHeader title="Third-party services" />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {[
          { name: 'YouTube',   purpose: 'Video playback',     link: 'https://policies.google.com/privacy', icon: 'ri-youtube-line' },
          { name: 'Supabase',  purpose: 'Cloud sync (if enabled)', link: 'https://supabase.com/privacy', icon: 'ri-database-2-line' },
          { name: 'Netlify',   purpose: 'Hosting',            link: 'https://www.netlify.com/privacy/', icon: 'ri-global-line' },
        ].map(s => (
          <div key={s.name} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '10px 14px', background: 'var(--bg-2)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)' }}>
            <i className={s.icon} style={{ color: 'var(--accent)', fontSize: '1.1rem', flexShrink: 0 }} />
            <div style={{ flex: 1 }}>
              <p style={{ fontSize: '0.88rem', color: 'var(--text)' }}>{s.name}</p>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-3)' }}>{s.purpose}</p>
            </div>
            <a href={s.link} target="_blank" rel="noopener noreferrer" style={{ fontFamily: 'var(--font-mono)', fontSize: '0.62rem', color: 'var(--accent)', letterSpacing: '0.06em' }}>
              Privacy policy <i className="ri-external-link-line" />
            </a>
          </div>
        ))}
      </div>

      <div className="settings-divider" />
      <p style={{ fontSize: '0.82rem', color: 'var(--text-3)' }}>
        Read our full <Link href="/privacy" style={{ color: 'var(--accent)' }}>Privacy Policy</Link> and <Link href="/terms" style={{ color: 'var(--accent)' }}>Terms of Use</Link>.
      </p>
    </div>
  )
}

// ── DANGER TAB ────────────────────────────────────────────────────────
function DangerTab({ onRefresh }) {
  const [confirmText, setConfirmText] = useState('')
  const isGlobal = isGlobalAccount()

  function handleDelete() {
    if (confirmText !== 'delete my account') return
    signOut()
    window.location.href = '/'
  }

  return (
    <div className="settings-section">
      <SectionHeader title="Delete account" desc="Permanently remove your account and all associated data." />

      <div className="settings-danger-box">
        <p style={{ fontSize: '0.88rem', color: 'var(--text-2)', marginBottom: 12, lineHeight: 1.6 }}>
          This will delete your profile, enrolled courses, watch history, and certificates.
          {isGlobal ? ' Your cloud data will also be removed.' : ' Since you have a local account, this only affects this device.'}
          {' '}This cannot be undone.
        </p>
        <div className="settings-field" style={{ marginBottom: 14 }}>
          <label className="settings-field__label">
            Type <strong style={{ color: 'var(--text)' }}>delete my account</strong> to confirm
          </label>
          <input
            className="authflow-input"
            value={confirmText}
            onChange={e => setConfirmText(e.target.value)}
            placeholder="delete my account"
          />
        </div>
        <button
          className="btn btn--danger"
          onClick={handleDelete}
          disabled={confirmText !== 'delete my account'}
        >
          <i className="ri-delete-bin-line" /> Delete my account permanently
        </button>
      </div>
    </div>
  )
}
