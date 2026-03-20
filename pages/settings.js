import Head from 'next/head'
import Link from 'next/link'
import { useState, useEffect, useRef } from 'react'
import { Nav, Footer, useAuth, ProgressBar, YTThumb } from '../components/Layout'
import {
  getProfile, saveProfile, signOut, deleteAccount,
} from '../lib/userStore'
import { isSupabaseAvailable } from '../lib/supabase'

// ── Tab definitions ───────────────────────────────────────────────────
const TABS = [
  { id: 'account',     label: 'Account',       icon: 'ri-user-settings-line',   group: 'You' },
  { id: 'security',    label: 'Security',       icon: 'ri-shield-keyhole-line',  group: 'You' },
  { id: 'sync',        label: 'Sync & Data',    icon: 'ri-cloud-line',           group: 'You' },
  { id: 'appearance',  label: 'Appearance',     icon: 'ri-palette-line',         group: 'App' },
  { id: 'privacy',     label: 'Privacy & Data', icon: 'ri-lock-password-line',   group: 'Data' },
  { id: 'danger',      label: 'Delete Account', icon: 'ri-delete-bin-line',      group: 'Data' },
]

export default function SettingsPage() {
  const { signedIn, setShowAuth, refresh, mounted } = useAuth()
  // null = menu screen (mobile); string = active tab (desktop always shows tab)
  const [activeTab, setActiveTab] = useState('account')
  // Mobile: null means "show menu list", string means "show that section"
  const [mobileView, setMobileView] = useState(null)

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
  const activeTabDef = TABS.find(t => t.id === (mobileView || activeTab))

  function openTab(id) {
    setActiveTab(id)
    setMobileView(id)
  }

  function renderContent(id) {
    switch (id) {
      case 'account':    return <AccountTab    onRefresh={refresh} />
      case 'security':   return <SecurityTab   onRefresh={refresh} />
      case 'sync':       return <SyncTab       onRefresh={refresh} />
      case 'appearance': return <AppearanceTab />
      case 'privacy':    return <PrivacyTab />
      case 'danger':     return <DangerTab     onRefresh={refresh} />
      default:           return null
    }
  }

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

            {/* ── Desktop sidebar nav (always visible on desktop) ── */}
            <nav className="settings-nav">
              {groups.map(group => (
                <div key={group} className="settings-nav__group">
                  <p className="settings-nav__group-label">{group}</p>
                  {TABS.filter(t => t.group === group).map(t => (
                    <button
                      key={t.id}
                      className={`settings-nav__item ${activeTab === t.id ? 'active' : ''} ${t.id === 'danger' ? 'danger' : ''}`}
                      onClick={() => openTab(t.id)}
                    >
                      <i className={t.icon} />
                      {t.label}
                    </button>
                  ))}
                </div>
              ))}
            </nav>

            {/* ── Content area ── */}
            <div className="settings-content">

              {/* Mobile: menu list screen (shown when no mobileView selected) */}
              <div className={`settings-mobile-menu ${mobileView ? 'settings-mobile-menu--hidden' : ''}`}>
                {groups.map(group => (
                  <div key={group} className="settings-mobile-group">
                    <p className="settings-mobile-group__label">{group}</p>
                    <div className="settings-mobile-group__items">
                      {TABS.filter(t => t.group === group).map(t => (
                        <button
                          key={t.id}
                          className={`settings-mobile-row ${t.id === 'danger' ? 'settings-mobile-row--danger' : ''}`}
                          onClick={() => openTab(t.id)}
                        >
                          <span className="settings-mobile-row__icon-wrap">
                            <i className={t.icon} aria-hidden="true" />
                          </span>
                          <span className="settings-mobile-row__label">{t.label}</span>
                          <i className="ri-arrow-right-s-line settings-mobile-row__chevron" aria-hidden="true" />
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              {/* Mobile: content screen (shown when a tab is selected) */}
              <div className={`settings-mobile-detail ${mobileView ? 'settings-mobile-detail--visible' : ''}`}>
                {/* Back button header */}
                <div className="settings-mobile-detail__header">
                  <button
                    className="settings-mobile-detail__back"
                    onClick={() => setMobileView(null)}
                    aria-label="Back to Settings"
                  >
                    <i className="ri-arrow-left-line" aria-hidden="true" />
                    Settings
                  </button>
                  {activeTabDef && (
                    <span className="settings-mobile-detail__title">
                      {activeTabDef.label}
                    </span>
                  )}
                </div>
                <div className="settings-mobile-detail__body">
                  {mobileView && renderContent(mobileView)}
                </div>
              </div>

              {/* Desktop: plain content (controlled by sidebar) */}
              <div className="settings-desktop-content">
                {renderContent(activeTab)}
              </div>

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

  const isGlobal = true  // all accounts are cloud accounts
  const accountType = 'Cloud account'

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
            <i className="ri-cloud-line" />
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
  return (
    <div className="settings-section">
      <SectionHeader title="Security" desc="Manage how you sign in to Feyn." />

      <div className="settings-field">
        <label className="settings-field__label">Account type</label>
        <p style={{ fontSize: '0.88rem', color: 'var(--text-2)', display: 'flex', alignItems: 'center', gap: 8 }}>
          <i className="ri-cloud-line" style={{ color: 'var(--accent)' }} />
          Cloud account — progress synced via Supabase
        </p>
      </div>

      <div className="settings-divider" />

      <SectionHeader
        title="Session"
        desc="You are signed in with email and password. Your session is stored securely in the browser and refreshes automatically."
      />

      <button className="btn btn--ghost btn--sm" onClick={() => {
        if (confirm('Sign out of this device? Your synced data will remain in the cloud.')) {
          signOut(); window.location.href = '/'
        }
      }}>
        <i className="ri-logout-box-line" /> Sign out of this device
      </button>

      <div className="settings-divider" />

      <SectionHeader
        title="Session management"
        desc="Active sessions on other devices. Full session management available in a future update."
      />
      <div className="settings-coming-soon">
        <i className="ri-computer-line" />
        <span>Multi-device session management coming soon.</span>
      </div>
    </div>
  )
}

// ── SYNC TAB ──────────────────────────────────────────────────────────
function SyncTab({ onRefresh }) {
  const profile = getProfile() || {}

  return (
    <div className="settings-section">
      <SectionHeader title="Sync and storage" desc="Control where your data lives." />

      <div className="settings-sync-status">
        <div className="settings-sync-indicator active" />
        <div>
          <p className="settings-sync-status__label">Cloud sync is on</p>
          <p className="settings-sync-status__sub">
            Your progress, certificates and enrollments sync across all your devices.
          </p>
        </div>
      </div>

      <div className="settings-divider" />

      <SectionHeader title="Account" desc="Your Feyn account details." />
      <div className="settings-field">
        <label className="settings-field__label">Email</label>
        <p style={{ fontSize: '0.88rem', color: 'var(--text-2)' }}>{profile.email || '—'}</p>
      </div>
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

  // Sync system theme dynamically
  useEffect(() => {
    if (theme !== 'system') return
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const handler = (e) => {
      const resolved = e.matches ? 'dark' : 'light'
      document.documentElement.setAttribute('data-theme', resolved)
    }
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [theme])

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

// ── PRIVACY TAB ───────────────────────────────────────────────────────
function PrivacyTab() {
  const [downloading, setDownloading] = useState(false)

  function handleDownload() {
    setDownloading(true)
    const exportData = exportAccountData()
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' })
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

  async function handleDelete() {
    if (confirmText !== 'delete my account') return
    await deleteAccount()
    window.location.href = '/'
  }

  return (
    <div className="settings-section">
      <SectionHeader title="Delete account" desc="Permanently remove your account and all associated data." />

      <div className="settings-danger-box">
        <p style={{ fontSize: '0.88rem', color: 'var(--text-2)', marginBottom: 12, lineHeight: 1.6 }}>
          This will delete your profile, enrolled courses, watch history, and certificates.
          Your cloud data will also be removed from Feyn's servers.
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
