import Link from 'next/link'
import { useState, useEffect, createContext, useContext, useCallback } from 'react'
import dynamic from 'next/dynamic'
const ExploreDrawer = dynamic(() => import('./ExploreDrawer'), { ssr: false })
import { isSignedIn, getProfile, signOut, hasOnboarded } from '../lib/userStore'

const DONATE_URL = 'https://hello2himel.netlify.app/donate'

// ── Theme ─────────────────────────────────────────────────────────────
export function useTheme() {
  const [theme, setTheme] = useState('dark')
  useEffect(() => {
    const stored = localStorage.getItem('ff_theme')
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
    const t = stored || (prefersDark ? 'dark' : 'light')
    setTheme(t)
    document.documentElement.setAttribute('data-theme', t)
  }, [])
  function toggle() {
    const next = theme === 'dark' ? 'light' : 'dark'
    setTheme(next)
    document.documentElement.setAttribute('data-theme', next)
    localStorage.setItem('ff_theme', next)
  }
  return { theme, toggle }
}

// ── Auth context ───────────────────────────────────────────────────────
// Provides: { user, signedIn, refresh, showAuth, setShowAuth }
const AuthCtx = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser]           = useState(null)
  const [signedIn, setSignedIn]   = useState(false)
  const [showAuth, setShowAuth]   = useState(false)
  const [mounted, setMounted]     = useState(false)

  const refresh = useCallback(() => {
    const profile = getProfile()
    setUser(profile)
    setSignedIn(!!profile)
  }, [])

  useEffect(() => {
    setMounted(true)
    refresh()
  }, [refresh])

  return (
    <AuthCtx.Provider value={{ user, signedIn, refresh, showAuth, setShowAuth, mounted }}>
      {children}
    </AuthCtx.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthCtx)
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider')
  return ctx
}

// ── Nav ────────────────────────────────────────────────────────────────
export function Nav() {
  const { theme, toggle } = useTheme()
  const { user, signedIn, setShowAuth, refresh, mounted } = useAuth()
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const [exploreOpen, setExploreOpen]   = useState(false)

  function handleSignOut() {
    signOut()
    refresh()
    setUserMenuOpen(false)
  }

  return (
    <nav className="nav">
      <Link href="/" className="nav__logo">Feyn</Link>

      <div className="nav__right">
        <button className="nav__icon-btn" onClick={toggle} title="Toggle theme" aria-label="Toggle theme">
          <i className={theme === 'dark' ? 'ri-sun-line' : 'ri-moon-line'} />
        </button>
        <button className="nav__icon-btn" onClick={() => setExploreOpen(true)} title="Explore courses" aria-label="Explore">
          <i className="ri-compass-discover-line" />
        </button>

        {mounted && (
          signedIn ? (
            <div className="nav__user-wrap">
              <button
                className="nav__avatar"
                onClick={() => setUserMenuOpen(o => !o)}
                aria-label="User menu"
              >
                {user?.name?.[0]?.toUpperCase() || <i className="ri-user-line" />}
              </button>

              {userMenuOpen && (
                <>
                  <div className="nav__user-backdrop" onClick={() => setUserMenuOpen(false)} />
                  <div className="nav__user-menu">
                    <div className="nav__user-menu__header">
                      <p className="nav__user-menu__name">{user?.name || 'User'}</p>
                      {user?.username && <p className="nav__user-menu__username">@{user.username}</p>}
                    </div>
                    <Link href="/profile" className="nav__user-menu__item" onClick={() => setUserMenuOpen(false)}>
                      <i className="ri-user-line" /> Profile
                    </Link>
                    <Link href="/settings" className="nav__user-menu__item" onClick={() => setUserMenuOpen(false)}>
                      <i className="ri-settings-3-line" /> Settings
                    </Link>
                    <button className="nav__user-menu__item nav__user-menu__item--danger" onClick={handleSignOut}>
                      <i className="ri-logout-box-line" /> Sign out
                    </button>
                  </div>
                </>
              )}
            </div>
          ) : (
            <button className="nav__signin-btn" onClick={() => setShowAuth(true)}>
              <i className="ri-user-line" /> Sign in
            </button>
          )
        )}

        <a href={DONATE_URL} className="nav__donate" target="_blank" rel="noopener noreferrer">
          Support
        </a>
      </div>
      {exploreOpen && <ExploreDrawer onClose={() => setExploreOpen(false)} />}
    </nav>
  )
}

// ── Footer ─────────────────────────────────────────────────────────────
export function Footer() {
  return (
    <footer className="footer container--wide">
      <p className="footer__left">
        Feyn, inspired by <em>Feynman Files</em> &amp; Richard Feynman's teaching principle.
      </p>
      <div className="footer__right">
        <a href={DONATE_URL} className="footer__link" target="_blank" rel="noopener noreferrer">
          <i className="ri-heart-line" style={{ marginRight: 4 }} />Support
        </a>
        <Link href="/" className="footer__link">
          <i className="ri-home-line" style={{ marginRight: 4 }} />Home
        </Link>
      </div>
    </footer>
  )
}

// ── Auth gate, wrap any feature that requires sign-in ─────────────────
export function AuthGate({ children, fallback }) {
  const { signedIn, setShowAuth, mounted } = useAuth()
  if (!mounted) return null
  if (!signedIn) {
    return fallback || (
      <div className="auth-gate">
        <i className="ri-lock-line auth-gate__icon" />
        <p className="auth-gate__text">Sign in to access this feature</p>
        <button className="btn btn--accent btn--sm" onClick={() => setShowAuth(true)}>
          <i className="ri-user-line" /> Sign in
        </button>
      </div>
    )
  }
  return children
}

// ── Breadcrumb ─────────────────────────────────────────────────────────
export function Breadcrumb({ crumbs }) {
  return (
    <nav className="breadcrumb" aria-label="Breadcrumb">
      <Link href="/"><i className="ri-home-4-line" /></Link>
      {crumbs.map((c, i) => (
        <span key={i} style={{ display: 'contents' }}>
          <span className="breadcrumb__sep"><i className="ri-arrow-right-s-line" /></span>
          {c.href
            ? <Link href={c.href}>{c.label}</Link>
            : <span className="breadcrumb__current">{c.label}</span>}
        </span>
      ))}
    </nav>
  )
}

// ── DonateStrip ────────────────────────────────────────────────────────
export function DonateStrip() {
  return (
    <div className="donate-strip">
      <p className="donate-strip__text">
        This content is free. If it's helped you, consider supporting the project.
      </p>
      <a href={DONATE_URL} className="donate-strip__btn" target="_blank" rel="noopener noreferrer">
        <i className="ri-heart-line" /> Donate
      </a>
    </div>
  )
}

// ── CoachChip ──────────────────────────────────────────────────────────
export function CoachChip({ coach }) {
  return (
    <Link href={`/coaches/${coach.id}`} className="coach-chip">
      <span className="coach-chip__avatar">
        {coach.avatar ? <img src={coach.avatar} alt={coach.name} /> : coach.name[0]}
      </span>
      <span className="coach-chip__name">{coach.name}</span>
    </Link>
  )
}

// ── ProgressBar ────────────────────────────────────────────────────────
export function ProgressBar({ pct, label }) {
  return (
    <div className="progress-bar-wrap">
      <div className="progress-bar">
        <div className="progress-bar__fill" style={{ width: `${pct}%` }} />
      </div>
      {label && <span className="progress-bar__label">{label}</span>}
    </div>
  )
}

// ── YTThumb ────────────────────────────────────────────────────────────
export function YTThumb({ videoId, alt = '', className = '' }) {
  const [err, setErr] = useState(false)
  const isPlaceholder = !videoId || videoId === 'YOUTUBE_ID_HERE'
  if (isPlaceholder || err) {
    return (
      <div className={`thumb ${className}`} style={{ aspectRatio: '16/9' }}>
        <div className="thumb__placeholder"><i className="ri-play-circle-line" /></div>
      </div>
    )
  }
  return (
    <div className={`thumb ${className}`} style={{ aspectRatio: '16/9' }}>
      <img
        src={`https://i.ytimg.com/vi/${videoId}/mqdefault.jpg`}
        alt={alt}
        onError={() => setErr(true)}
      />
      <div className="thumb__play"><i className="ri-play-fill" /></div>
    </div>
  )
}

// ── Material helpers ───────────────────────────────────────────────────
export function materialIcon(type) {
  switch (type) {
    case 'pdf':   return 'ri-file-pdf-2-line'
    case 'doc':   return 'ri-file-word-line'
    case 'video': return 'ri-video-line'
    case 'link':  return 'ri-link'
    default:      return 'ri-attachment-line'
  }
}

// ── MaterialsSidebar ───────────────────────────────────────────────────
export function MaterialsSidebar({ materials, subjectName }) {
  const [open, setOpen] = useState(false)
  const courseMats = materials.filter(m => m._source === 'course')
  const lessonMats = materials.filter(m => m._source === 'lesson')
  const byLesson   = {}
  for (const m of lessonMats) {
    if (!byLesson[m._lessonId]) byLesson[m._lessonId] = { title: m._lessonTitle, items: [] }
    byLesson[m._lessonId].items.push(m)
  }
  return (
    <>
      <div className={`sidebar-overlay ${open ? 'open' : ''}`} onClick={() => setOpen(false)} />
      <button className="sidebar-fab" onClick={() => setOpen(true)} aria-label="Open materials">
        <i className="ri-folder-open-line" />
      </button>
      <aside className={`materials-sidebar ${open ? 'open' : ''}`}>
        <div className="sidebar-header">
          <span className="sidebar-header__title">
            <i className="ri-folder-open-line" /> Course Materials
          </span>
          <button className="sidebar-toggle" onClick={() => setOpen(false)}>
            <i className="ri-close-line" />
          </button>
        </div>
        {materials.length === 0 && (
          <p style={{ padding: '20px 16px', fontSize: '0.8rem', color: 'var(--text-3)', fontStyle: 'italic' }}>No materials yet.</p>
        )}
        {courseMats.length > 0 && (
          <div className="sidebar-section">
            <p className="sidebar-section__label"><i className="ri-book-open-line" /> Course-level</p>
            {courseMats.map(m => <MaterialItem key={m.id} material={m} />)}
          </div>
        )}
        {Object.entries(byLesson).map(([lid, { title, items }]) => (
          <div className="sidebar-section" key={lid}>
            <p className="sidebar-section__label" title={title}>
              <i className="ri-play-circle-line" />
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 170 }}>{title}</span>
            </p>
            {items.map(m => <MaterialItem key={m.id} material={m} />)}
          </div>
        ))}
      </aside>
    </>
  )
}

function MaterialItem({ material }) {
  return (
    <div className="material-item">
      <a href={material.url} target="_blank" rel="noopener noreferrer">
        <span className="material-item__icon"><i className={materialIcon(material.type)} /></span>
        <span className="material-item__label">{material.label}</span>
        <span className="material-item__ext">{material.type}</span>
      </a>
    </div>
  )
}

// ── LessonMaterials ────────────────────────────────────────────────────
export function LessonMaterials({ materials }) {
  const [open, setOpen] = useState(true)
  if (!materials || materials.length === 0) return null
  return (
    <div className="lesson-materials">
      <div className="lesson-materials__header" onClick={() => setOpen(o => !o)}>
        <span className="lesson-materials__title">
          <i className="ri-folder-open-line" /> Lesson Materials ({materials.length})
        </span>
        <i className={`ri-arrow-down-s-line lesson-materials__toggle ${open ? 'open' : ''}`} />
      </div>
      {open && (
        <div className="lesson-materials__body">
          {materials.map(m => <MaterialItem key={m.id} material={m} />)}
        </div>
      )}
    </div>
  )
}
