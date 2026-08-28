import Link from 'next/link'
import { useState, useEffect, createContext, useContext, useCallback } from 'react'
import dynamic from 'next/dynamic'
const SearchPalette = dynamic(() => import('./SearchPalette'), { ssr: false })
import { isSignedIn, getProfile, signOut } from '../lib/userStore'
import { usePermissions } from '../lib/usePermissions'
import { hasStudioAccess } from '../lib/permissions'

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
// Two actions, never more: find something, or manage yourself.
//
// Teach, Support, theme and admin used to sit in the bar as separate
// buttons, which meant five competing targets on every page. They are
// secondary journeys, so they now live one level down — in the account
// menu for signed-in users and in the footer for everyone. The bar keeps
// only what a learner reaches for mid-task.
export function Nav() {
  const { theme, toggle } = useTheme()
  const { user, signedIn, setShowAuth, refresh, mounted } = useAuth()
  // Studio/admin links come from real DB permissions, cached per session.
  const { perms } = usePermissions()
  const [menuOpen, setMenuOpen]     = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)

  // Cmd/Ctrl+K anywhere, plus a `feyn:search` event so any page can offer
  // its own "browse everything" button without duplicating the palette.
  useEffect(() => {
    function onKey(e) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setSearchOpen(o => !o)
      }
    }
    function onOpen() { setSearchOpen(true) }
    window.addEventListener('keydown', onKey)
    window.addEventListener('feyn:search', onOpen)
    return () => {
      window.removeEventListener('keydown', onKey)
      window.removeEventListener('feyn:search', onOpen)
    }
  }, [])

  // Close the account menu on Escape — it is a popover, so it must be
  // dismissible from the keyboard.
  useEffect(() => {
    if (!menuOpen) return
    const onKey = e => { if (e.key === 'Escape') setMenuOpen(false) }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [menuOpen])

  function handleSignOut() {
    signOut(); refresh(); setMenuOpen(false)
  }

  const canPublish = mounted && hasStudioAccess(perms)

  return (
    <>
      <nav className="nav">
        <Link href="/" className="nav__logo" aria-label="Feyn home">
          <FeynLogo />
        </Link>

        <div className="nav__right">
          {/* Find */}
          <button
            className="nav__search-btn"
            onClick={() => setSearchOpen(true)}
            aria-label="Search courses"
            title="Search  ⌘K"
          >
            <i className="ri-search-line" aria-hidden="true" />
            <span className="nav__search-btn__label">Search</span>
            <span className="nav__search-btn__kbd" aria-hidden="true">⌘K</span>
          </button>

          {/* Account */}
          {mounted && (
            signedIn ? (
              <div className="nav__user-wrap">
                <button
                  className="nav__avatar"
                  onClick={() => setMenuOpen(o => !o)}
                  aria-label="Account menu"
                  aria-haspopup="menu"
                  aria-expanded={menuOpen}
                >
                  {user?.name?.[0]?.toUpperCase() || <i className="ri-user-line" />}
                </button>

                {menuOpen && (
                  <>
                    <div className="nav__user-backdrop" onClick={() => setMenuOpen(false)} />
                    <div className="nav__user-menu" role="menu">
                      <div className="nav__user-menu__header">
                        <p className="nav__user-menu__name">{user?.name || 'User'}</p>
                        {user?.username && <p className="nav__user-menu__username">@{user.username}</p>}
                      </div>

                      <Link href="/profile" className="nav__user-menu__item" role="menuitem" onClick={() => setMenuOpen(false)}>
                        <i className="ri-user-line" aria-hidden="true" /> Profile
                      </Link>
                      <Link href="/settings" className="nav__user-menu__item" role="menuitem" onClick={() => setMenuOpen(false)}>
                        <i className="ri-settings-3-line" aria-hidden="true" /> Settings
                      </Link>

                      {/* Publishing entry point. Which link you get depends on
                          real memberships, so it is never a dead end. */}
                      {canPublish ? (
                        <Link href="/studio" className="nav__user-menu__item" role="menuitem" onClick={() => setMenuOpen(false)}>
                          <i className="ri-dashboard-line" aria-hidden="true" /> My studio
                        </Link>
                      ) : (
                        <Link href="/teach" className="nav__user-menu__item" role="menuitem" onClick={() => setMenuOpen(false)}>
                          <i className="ri-quill-pen-line" aria-hidden="true" /> Teach on Feyn
                        </Link>
                      )}
                      {perms.isAppAdmin && (
                        <Link href="/admin" className="nav__user-menu__item" role="menuitem" onClick={() => setMenuOpen(false)}>
                          <i className="ri-shield-user-line" aria-hidden="true" /> Admin console
                        </Link>
                      )}

                      <button className="nav__user-menu__item nav__user-menu__item--theme" role="menuitem" onClick={toggle}>
                        <i className={theme === 'dark' ? 'ri-sun-line' : 'ri-moon-line'} aria-hidden="true" />
                        Appearance
                        <span className="nav__user-menu__theme-badge">
                          {theme === 'dark' ? 'Dark' : 'Light'}
                        </span>
                      </button>

                      <button className="nav__user-menu__item nav__user-menu__item--danger" role="menuitem" onClick={handleSignOut}>
                        <i className="ri-logout-box-line" aria-hidden="true" /> Sign out
                      </button>
                    </div>
                  </>
                )}
              </div>
            ) : (
              <>
                {/* Guests have no account menu, so theme stays reachable here. */}
                <button className="nav__icon-btn" onClick={toggle} title="Toggle theme" aria-label="Toggle theme">
                  <i className={theme === 'dark' ? 'ri-sun-line' : 'ri-moon-line'} aria-hidden="true" />
                </button>
                <button className="nav__signin-btn" onClick={() => setShowAuth(true)}>
                  Sign in
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

// ── Plate ──────────────────────────────────────────────────────────────
// The shared page-top band: a soft accent bloom in one corner over a
// faint rule grid, both painted from theme tokens so there is no image
// request and it inverts with the theme.
//
// This was built for the /teach hero. It is now the standard treatment
// for the top of every page, so arriving anywhere on Feyn reads as the
// same site rather than a set of separately-designed screens.
//
//   variant 'quiet'  no hairline — for a band followed by another band
//           'close'  bloom rises from the bottom — for a closing band
//           'inset'  texture clipped to a rounded panel, for a header
//                    that lives inside a column rather than the page
//                    (sidebar layouts, settings). Renders no container,
//                    since the column already supplies the measure.
//   wide            use the 1100px measure instead of 860px
export function Plate({ children, variant, wide = false, className = '', ...rest }) {
  const cls = ['plate', variant && `plate--${variant}`, className].filter(Boolean).join(' ')
  const inset = variant === 'inset'
  return (
    <section className={cls} {...rest}>
      {inset ? children : <div className={wide ? 'container--wide' : 'container'}>{children}</div>}
    </section>
  )
}

// ── PageHeader ─────────────────────────────────────────────────────────
// Eyebrow, title, optional lede — on a plate. Every page-top heading
// that is not a bespoke hero goes through this, which is what keeps the
// eyebrow size, the title clamp and the band texture identical across
// /coaches, /admin, /apply/*, the topic page and the publisher pages.
//
// Anything extra (progress bars, chips, actions) is passed as children
// and lands under the lede, inside the same band.
export function PageHeader({ eyebrow, icon, title, desc, children, variant, wide, actions }) {
  return (
    <Plate variant={variant} wide={wide}>
      <header className="page-header">
        {eyebrow && (
          <p className="page-header__eyebrow">
            {icon && <i className={icon} aria-hidden="true" />}
            {eyebrow}
          </p>
        )}
        <div className="page-header__row">
          <div className="page-header__text">
            <h1 className="page-header__title">{title}</h1>
            {desc && <p className="page-header__desc">{desc}</p>}
          </div>
          {actions && <div className="page-header__actions">{actions}</div>}
        </div>
        {children}
      </header>
    </Plate>
  )
}

// ── Footer ─────────────────────────────────────────────────────────────
// The footer carries every secondary journey the nav gave up: teaching,
// support, legal, the mentor directory. It is the one place on the site
// with a complete map, so it is worth reading rather than skipping.
//
// Same design language as the rest of the site: it sits on a closing
// plate, column labels are mono small-caps like every other eyebrow,
// and "Support the project" is the shared outline button instead of a
// one-off uppercase pill.
export function Footer() {
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])
  const year    = new Date().getFullYear()
  const profile = typeof window !== 'undefined' ? getProfile() : null
  const donate  = getDonateUrl(profile, mounted)

  return (
    <footer className="footer plate plate--close">
      <div className="footer__inner container--wide">

        {/* Brand + the map */}
        <div className="footer__top">
          <div className="footer__brand">
            <Link href="/" className="footer__logo" aria-label="Feyn home">
              <FeynLogo />
            </Link>
            <p className="footer__tagline">
              Learn the way Feynman would.<br />
              First principles. No fluff.
            </p>
            <a
              href={donate}
              className="btn btn--ghost btn--sm"
              target="_blank"
              rel="noopener noreferrer"
            >
              <i className="ri-heart-line" aria-hidden="true" /> Support the project
            </a>
          </div>

          <nav className="footer__links" aria-label="Footer">
            <div className="footer__col">
              <p className="footer__col-label">Learn</p>
              <Link href="/#courses" className="footer__link">All courses</Link>
              <Link href="/coaches" className="footer__link">Mentors</Link>
              <Link href="/verify" className="footer__link">Verify a certificate</Link>
            </div>
            <div className="footer__col">
              <p className="footer__col-label">Teach</p>
              <Link href="/teach" className="footer__link">Teach on Feyn</Link>
              <Link href="/apply/mentor" className="footer__link">Become a mentor</Link>
              <Link href="/apply/platform" className="footer__link">Register a platform</Link>
            </div>
            <div className="footer__col">
              <p className="footer__col-label">Account</p>
              <Link href="/profile" className="footer__link">Profile</Link>
              <Link href="/settings" className="footer__link">Settings</Link>
              <Link href="/studio" className="footer__link">My studio</Link>
            </div>
            <div className="footer__col">
              <p className="footer__col-label">Project</p>
              <Link href="/about" className="footer__link">About Feyn</Link>
              <Link href="/contact" className="footer__link">Contact</Link>
              <a href={donate} className="footer__link" target="_blank" rel="noopener noreferrer">Donate</a>
            </div>
            <div className="footer__col">
              <p className="footer__col-label">Legal</p>
              <Link href="/privacy" className="footer__link">Privacy policy</Link>
              <Link href="/terms" className="footer__link">Terms of use</Link>
            </div>
          </nav>
        </div>

        <div className="footer__bottom">
          <p className="footer__copy">
            © {year} Feyn · Part of <strong>STΛRGZR</strong> · Inspired by Feynman Files
          </p>
          <p className="footer__copy footer__copy--quiet">
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
      <a href={donate} className="btn btn--cert btn--sm" target="_blank" rel="noopener noreferrer">
        <i className="ri-heart-line" aria-hidden="true" /> Support
      </a>
    </div>
  )
}

// ── TeachCallout ───────────────────────────────────────────────────────
// Recruitment banner for the learner feed and course pages. Hidden for
// anyone who already has publishing access — they get /studio in the nav
// instead, so this never nags an existing mentor.
export function TeachCallout({ compact = false }) {
  const { mounted } = useAuth()
  const { perms, loading } = usePermissions()
  if (!mounted || loading || hasStudioAccess(perms)) return null
  return (
    <aside className={`teach-callout${compact ? ' teach-callout--compact' : ''}`}>
      <span className="teach-callout__mark"><i className="ri-quill-pen-line" /></span>
      <div className="teach-callout__body">
        <p className="teach-callout__kicker">Teach on Feyn</p>
        <p className="teach-callout__text">
          Know a topic well enough to explain it from scratch? Publish your own course — as
          yourself, or under your school. Free, no ads, no revenue cut.
        </p>
      </div>
      <Link href="/teach" className="btn btn--cert btn--sm teach-callout__btn">
        Start teaching <i className="ri-arrow-right-line" aria-hidden="true" />
      </Link>
    </aside>
  )
}

// ── CoachChip ──────────────────────────────────────────────────────────
export function CoachChip({ coach }) {
  return (
    <Link href={`/m/${coach.id}`} className="coach-chip">
      <span className="coach-chip__avatar" aria-label={coach.name}>
        {coach.avatar ? <img src={coach.avatar} alt={coach.name} /> : <span aria-hidden="true">{coach.name[0]}</span>}
      </span>
      <span className="coach-chip__name">{coach.name}</span>
    </Link>
  )
}

// ── SourceBadge ────────────────────────────────────────────────────────
// Displays video source attribution (platform + instructor) per lesson.
// This is purely informational — distinct from CoachChip which links to
// Feyn's own instructor profile pages.
export function SourceBadge({ source }) {
  if (!source) return null
  return (
    <a
      href={source.url || '#'}
      target="_blank"
      rel="noopener noreferrer"
      className="source-badge"
      title={`Video by ${source.instructor || source.name} on ${source.name}`}
    >
      <span className="source-badge__platform-icon">
        <i className="ri-youtube-line" />
      </span>
      <span className="source-badge__body">
        <span className="source-badge__label">Video via</span>
        <span className="source-badge__platform">{source.name}</span>
        {source.instructor && (
          <span className="source-badge__instructor">· {source.instructor}</span>
        )}
      </span>
      <i className="ri-external-link-line source-badge__ext" />
    </a>
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
