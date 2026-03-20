import Link from 'next/link'
import { useState, useEffect, createContext, useContext, useCallback } from 'react'
import dynamic from 'next/dynamic'
const SearchPalette = dynamic(() => import('./SearchPalette'), { ssr: false })
import { isSignedIn, getProfile, signOut } from '../lib/userStore'

const DONATE_BASE = 'https://hello2himel.netlify.app/donate'

function getDonateUrl(profile, mounted = false) {
  if (mounted && profile?.supabaseId) {
    return `${DONATE_BASE}?source=Feyn&session_id=${profile.supabaseId}`
  }
  return `${DONATE_BASE}?source=Feyn`
}

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
const AuthCtx = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser]         = useState(null)
  const [signedIn, setSignedIn] = useState(false)
  const [showAuth, setShowAuth] = useState(false)
  const [mounted, setMounted]   = useState(false)

  const refresh = useCallback(() => {
    const profile = getProfile()
    setUser(profile)
    setSignedIn(!!profile)
  }, [])

  useEffect(() => { setMounted(true); refresh() }, [refresh])

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

// ── FeynLogo ───────────────────────────────────────────────────────────
// Brain icon + "Feyn" wordmark — used everywhere
export function FeynLogo({ className = '' }) {
  return (
    <span className={`feyn-logo ${className}`}>
      <i className="ri-brain-line feyn-logo__icon" />
      <span className="feyn-logo__word">Feyn</span>
    </span>
  )
}

// ── Nav ────────────────────────────────────────────────────────────────
export function Nav() {
  const { theme, toggle } = useTheme()
  const { user, signedIn, setShowAuth, refresh, mounted } = useAuth()
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const [searchOpen, setSearchOpen]     = useState(false)

  // Cmd/Ctrl+K — open search palette
  useEffect(() => {
    function onKey(e) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setSearchOpen(o => !o)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  function handleSignOut() {
    signOut(); refresh(); setUserMenuOpen(false)
  }

  return (
    <>
      <nav className="nav">
        <Link href="/" className="nav__logo" aria-label="Feyn home">
          <FeynLogo />
        </Link>

        <div className="nav__right">
          {/* Search */}
          <button
            className="nav__search-btn"
            onClick={() => setSearchOpen(true)}
            aria-label="Search courses"
            title="Search  ⌘K"
          >
            <i className="ri-search-line" />
            <span className="nav__search-btn__label">Search</span>
            <span className="nav__search-btn__kbd">⌘K</span>
          </button>

          {/* Support */}
          <a href={getDonateUrl(user, mounted)} className="nav__donate" target="_blank" rel="noopener noreferrer" title="Support Feyn">
            <i className="ri-heart-fill" /><span>Support</span>
          </a>

          {/* Auth */}
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
                      {/* User info */}
                      <div className="nav__user-menu__header">
                        <p className="nav__user-menu__name">{user?.name || 'User'}</p>
                        {user?.username && <p className="nav__user-menu__username">@{user.username}</p>}
                      </div>

                      {/* Nav links */}
                      <Link href="/profile" className="nav__user-menu__item" onClick={() => setUserMenuOpen(false)}>
                        <i className="ri-user-line" /> Profile
                      </Link>
                      <Link href="/settings" className="nav__user-menu__item" onClick={() => setUserMenuOpen(false)}>
                        <i className="ri-settings-3-line" /> Settings
                      </Link>

                      {/* Theme toggle — lives here, not as a standalone nav button */}
                      <button className="nav__user-menu__item nav__user-menu__item--theme" onClick={toggle}>
                        <i className={theme === 'dark' ? 'ri-sun-line' : 'ri-moon-line'} />
                        Mode
                        <span className="nav__user-menu__theme-badge">
                          {theme === 'dark' ? 'Dark' : 'Light'}
                        </span>
                      </button>

                      {/* Sign out */}
                      <button className="nav__user-menu__item nav__user-menu__item--danger" onClick={handleSignOut}>
                        <i className="ri-logout-box-line" /> Sign out
                      </button>
                    </div>
                  </>
                )}
              </div>
            ) : (
              <>
                {/* Logged-out: theme toggle stays as icon in nav */}
                <button className="nav__icon-btn" onClick={toggle} title="Toggle theme" aria-label="Toggle theme">
                  <i className={theme === 'dark' ? 'ri-sun-line' : 'ri-moon-line'} />
                </button>
                <button className="nav__signin-btn" onClick={() => setShowAuth(true)}>
                  <i className="ri-user-line" /> Sign in
                </button>
              </>
            )
          )}
        </div>
      </nav>

      {/* Search palette — rendered outside nav so it can be truly full-screen */}
      {searchOpen && <SearchPalette onClose={() => setSearchOpen(false)} />}
    </>
  )
}

// ── Footer ─────────────────────────────────────────────────────────────
export function Footer() {
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])
  const year    = new Date().getFullYear()
  const profile = typeof window !== 'undefined' ? getProfile() : null
  const donate  = getDonateUrl(profile, mounted)
  return (
    <footer className="footer-full">
      <div className="footer-full__inner container--wide">

        {/* Top row: brand + link columns */}
        <div className="footer-full__top">

          {/* Brand */}
          <div className="footer-full__brand">
            <Link href="/" className="footer-full__logo">
              <FeynLogo />
            </Link>
            <p className="footer-full__tagline">
              Learn the way Feynman would.<br />
              First principles. No fluff.
            </p>
            <a href={donate} className="footer-full__support" target="_blank" rel="noopener noreferrer">
              <i className="ri-heart-fill" /> Support the project
            </a>
          </div>

          {/* Link columns */}
          <div className="footer-full__links">
            <div className="footer-full__col">
              <p className="footer-full__col-label">Learn</p>
              <Link href="/#courses" className="footer-full__link">All courses</Link>
              <Link href="/coaches" className="footer-full__link">Coaches</Link>
              <Link href="/about" className="footer-full__link">About Feyn</Link>
            </div>
            <div className="footer-full__col">
              <p className="footer-full__col-label">Account</p>
              <Link href="/profile" className="footer-full__link">Profile</Link>
              <Link href="/settings" className="footer-full__link">Settings</Link>
            </div>
            <div className="footer-full__col">
              <p className="footer-full__col-label">Company</p>
              <Link href="/about" className="footer-full__link">About</Link>
              <Link href="/contact" className="footer-full__link">Contact</Link>
              <a href={donate} className="footer-full__link" target="_blank" rel="noopener noreferrer">Donate</a>
            </div>
            <div className="footer-full__col">
              <p className="footer-full__col-label">Legal</p>
              <Link href="/privacy" className="footer-full__link">Privacy policy</Link>
              <Link href="/terms" className="footer-full__link">Terms of use</Link>
            </div>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="footer-full__bottom">
          <p className="footer-full__copy">
            © {year} Feyn · Part of <strong>STΛRGZR</strong> · Inspired by Feynman Files
          </p>
          <p className="footer-full__copy" style={{ opacity: 0.5 }}>
            Free forever. No ads. No tracking.
          </p>
        </div>

      </div>
    </footer>
  )
}

// ── Auth gate ──────────────────────────────────────────────────────────
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
          <span className="breadcrumb__sep" aria-hidden="true"><i className="ri-arrow-right-s-line" /></span>
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
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])
  const profile = typeof window !== 'undefined' ? getProfile() : null
  const donate  = getDonateUrl(profile, mounted)
  return (
    <div className="donate-strip">
      <p className="donate-strip__text">
        This content is free. If it's helped you, consider supporting the project.
      </p>
      <a href={donate} className="donate-strip__btn" target="_blank" rel="noopener noreferrer">
        <i className="ri-heart-fill" /> Support
      </a>
    </div>
  )
}

// ── CoachChip ──────────────────────────────────────────────────────────
export function CoachChip({ coach }) {
  return (
    <Link href={`/coaches/${coach.id}`} className="coach-chip">
      <span className="coach-chip__avatar" aria-label={coach.name}>
        {coach.avatar ? <img src={coach.avatar} alt={coach.name} /> : <span aria-hidden="true">{coach.name[0]}</span>}
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
      <img src={`https://i.ytimg.com/vi/${videoId}/mqdefault.jpg`} alt={alt} crossOrigin="anonymous" onError={() => setErr(true)} />
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
// Desktop: sticky sidebar column
// Mobile (≤900px): FAB → bottom sheet with drag-handle + backdrop dismiss
export function MaterialsSidebar({ materials, subjectName }) {
  const [open, setOpen] = useState(false)

  const courseMats = materials.filter(m => m._source === 'course')
  const lessonMats = materials.filter(m => m._source === 'lesson')
  const byLesson   = {}
  for (const m of lessonMats) {
    if (!byLesson[m._lessonId]) byLesson[m._lessonId] = { title: m._lessonTitle, items: [] }
    byLesson[m._lessonId].items.push(m)
  }

  // Lock body scroll when sheet is open (mobile only)
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => { document.body.style.overflow = '' }
  }, [open])

  // Close on Escape
  useEffect(() => {
    if (!open) return
    const onKey = (e) => { if (e.key === 'Escape') setOpen(false) }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open])

  const inner = (
    <>
      {materials.length === 0 && (
        <p style={{ padding: '20px 16px', fontSize: '0.8rem', color: 'var(--text-3)', fontStyle: 'italic' }}>No materials yet.</p>
      )}
      {courseMats.length > 0 && (
        <div className="sidebar-section">
          <p className="sidebar-section__label"><i className="ri-book-open-line" aria-hidden="true" /> Course-level</p>
          {courseMats.map(m => <MaterialItem key={m.id} material={m} />)}
        </div>
      )}
      {Object.entries(byLesson).map(([lid, { title, items }]) => (
        <div className="sidebar-section" key={lid}>
          <p className="sidebar-section__label" title={title}>
            <i className="ri-play-circle-line" aria-hidden="true" />
            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 170 }}>{title}</span>
          </p>
          {items.map(m => <MaterialItem key={m.id} material={m} />)}
        </div>
      ))}
    </>
  )

  return (
    <>
      {/* ── Desktop sidebar ── */}
      <aside className="materials-sidebar materials-sidebar--desktop">
        <div className="sidebar-header">
          <span className="sidebar-header__title">
            <i className="ri-folder-open-line" aria-hidden="true" /> Course Materials
          </span>
        </div>
        {inner}
      </aside>

      {/* ── Mobile persistent bottom bar trigger ── */}
      {materials.length > 0 && (
        <div className="materials-bar" role="complementary" aria-label="Course materials">
          <button
            className="materials-bar__btn"
            onClick={() => setOpen(true)}
            aria-expanded={open}
            aria-haspopup="dialog"
          >
            <span className="materials-bar__icon">
              <i className="ri-folder-open-line" aria-hidden="true" />
            </span>
            <span className="materials-bar__label">View Course Materials</span>
            <span className="materials-bar__count">{materials.length}</span>
            <i className="ri-arrow-up-s-line materials-bar__arrow" aria-hidden="true" />
          </button>
        </div>
      )}

      {/* ── Mobile bottom sheet ── */}
      {/* Backdrop */}
      <div
        className={`sheet-backdrop ${open ? 'sheet-backdrop--open' : ''}`}
        onClick={() => setOpen(false)}
        aria-hidden="true"
      />

      {/* Sheet */}
      <div
        className={`bottom-sheet ${open ? 'bottom-sheet--open' : ''}`}
        role="dialog"
        aria-modal="true"
        aria-label="Course Materials"
      >
        {/* Drag handle (decorative) */}
        <div className="bottom-sheet__handle" aria-hidden="true" />

        {/* Header */}
        <div className="bottom-sheet__header">
          <span className="bottom-sheet__title">
            <i className="ri-folder-open-line" aria-hidden="true" /> Course Materials
          </span>
          <button
            className="bottom-sheet__close"
            onClick={() => setOpen(false)}
            aria-label="Close materials"
          >
            <i className="ri-close-line" aria-hidden="true" />
          </button>
        </div>

        {/* Scrollable content */}
        <div className="bottom-sheet__body">
          {inner}
        </div>
      </div>
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
      <button
        className="lesson-materials__header"
        onClick={() => setOpen(o => !o)}
        aria-expanded={open}
        aria-controls="lesson-materials-body"
      >
        <span className="lesson-materials__title">
          <i className="ri-folder-open-line" aria-hidden="true" /> Lesson Materials ({materials.length})
        </span>
        <i className={`ri-arrow-down-s-line lesson-materials__toggle ${open ? 'open' : ''}`} aria-hidden="true" />
      </button>
      {open && (
        <div className="lesson-materials__body" id="lesson-materials-body">
          {materials.map(m => <MaterialItem key={m.id} material={m} />)}
        </div>
      )}
    </div>
  )
}
