import '../styles/globals.css'
import { AuthProvider, useAuth } from '../components/Layout'
import { useEffect } from 'react'
import dynamic from 'next/dynamic'
import data from '../data/courses'
import { getSupabase, setCurrentToken } from '../lib/supabase'
import { attachAuthListener } from '../lib/userStore'

const AuthFlow = dynamic(() => import('../components/AuthFlow'), { ssr: false })

// ── Module-level listener attachment (synctest pattern) ───────────────
//
// THE BUG THIS FIXES:
//   INITIAL_SESSION fires during getSession() inside getSupabase(), which
//   runs at module import time. If listeners are attached inside useEffect,
//   they miss INITIAL_SESSION entirely — React hasn't mounted yet.
//   Result: no feyn:auth dispatch, no DB pull, UI stays "signed out" until
//   the user manually interacts.
//
// THE FIX:
//   Attach both listeners at module scope (client-side guarded), exactly
//   like synctest does. They're registered before INITIAL_SESSION fires,
//   so they catch it reliably on every page load.
//
// ORDER MATTERS:
//   1. attachAppListener runs first — setCurrentToken() called FIRST,
//      before userStore's listener fires any DB calls.
//   2. attachAuthListener runs second — DB pull uses the real JWT.

if (typeof window !== 'undefined') {
  // App-level listener: sets token + dispatches feyn:auth for UI re-renders
  let _appListenerAttached = false
  function attachAppListener() {
    if (_appListenerAttached) return
    _appListenerAttached = true
    const sb = getSupabase()
    if (!sb) return
    sb.auth.onAuthStateChange((event, session) => {
      // Set token FIRST — before userStore's listener fires DB calls.
      setCurrentToken(session?.access_token ?? null)
      window.dispatchEvent(new CustomEvent('feyn:auth', { detail: { event, session } }))
    })
  }
  attachAppListener()

  // UserStore listener: pulls DB data into localStorage on session restore
  attachAuthListener()
}

function AppInner({ Component, pageProps }) {
  const { showAuth, setShowAuth, refresh, mounted } = useAuth()

  function handleAuthComplete() {
    setShowAuth(false)
    refresh()
  }

  // Re-render when auth changes
  useEffect(() => {
    if (!mounted) return
    const handler = () => refresh()
    window.addEventListener('feyn:auth', handler)
    // Catch INITIAL_SESSION which fires ~1 tick after mount
    const t = setTimeout(() => refresh(), 500)
    return () => {
      window.removeEventListener('feyn:auth', handler)
      clearTimeout(t)
    }
  }, [mounted, refresh])

  // Allow any page to open the auth modal
  useEffect(() => {
    if (typeof window === 'undefined') return
    const handler = () => setShowAuth(true)
    window.addEventListener('feyn:show-auth', handler)
    return () => window.removeEventListener('feyn:show-auth', handler)
  }, [setShowAuth])

  return (
    <>
      <Component {...pageProps} />
      {mounted && showAuth && (
        <AuthFlow
          programs={data.programs}
          onComplete={handleAuthComplete}
          initialMode="auth"
        />
      )}
    </>
  )
}

export default function App({ Component, pageProps }) {
  return (
    <AuthProvider>
      <AppInner Component={Component} pageProps={pageProps} />
    </AuthProvider>
  )
}
