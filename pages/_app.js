import '../styles/globals.css'
import { AuthProvider, useAuth } from '../components/Layout'
import { useEffect } from 'react'
import dynamic from 'next/dynamic'
import data from '../data/courses'
import { getSupabase, setCurrentToken } from '../lib/supabase'
import { attachAuthListener } from '../lib/userStore'

const AuthFlow = dynamic(() => import('../components/AuthFlow'), { ssr: false })

// ── Module-level listener attachment ─────────────────────────────────
//
// WHY NOT useEffect:
//   INITIAL_SESSION fires during getSession() inside getSupabase(),
//   which runs at module import time — before React mounts, before
//   useEffect runs. Listeners registered in useEffect miss it entirely.
//   Result: no feyn:auth dispatch, no DB pull, UI stays "signed out"
//   on every page load until something else triggers a re-render.
//
// THE FIX (matches synctest pattern):
//   Attach both listeners at module scope, client-side guarded.
//   They're registered before INITIAL_SESSION fires.
//
// ORDER MATTERS:
//   1. App listener first  — setCurrentToken() before any DB call
//   2. userStore listener  — DB pull uses the real JWT

if (typeof window !== 'undefined') {
  let _appListenerAttached = false
  ;(function attachAppListener() {
    if (_appListenerAttached) return
    _appListenerAttached = true
    const sb = getSupabase()
    if (!sb) return
    sb.auth.onAuthStateChange((event, session) => {
      setCurrentToken(session?.access_token ?? null)
      window.dispatchEvent(new CustomEvent('feyn:auth', { detail: { event, session } }))
    })
  })()

  attachAuthListener()
}

function AppInner({ Component, pageProps }) {
  const { showAuth, setShowAuth, refresh, mounted } = useAuth()

  function handleAuthComplete() {
    setShowAuth(false)
    refresh()
  }

  // Re-render when auth changes (sign-in, sign-out, token refresh, page restore)
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

  // Allow any page to open the auth modal via window.dispatchEvent(new Event('feyn:show-auth'))
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
