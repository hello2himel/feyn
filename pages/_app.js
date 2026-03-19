import '../styles/globals.css'
import { AuthProvider, useAuth } from '../components/Layout'
import { useEffect } from 'react'
import dynamic from 'next/dynamic'
import data from '../data/courses'

const AuthFlow = dynamic(() => import('../components/AuthFlow'), { ssr: false })

function AppInner({ Component, pageProps }) {
  const { showAuth, setShowAuth, refresh, mounted } = useAuth()

  function handleAuthComplete() {
    setShowAuth(false)
    refresh()
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('feyn:auth'))
    }
  }

  // Allow any page (e.g. Settings SyncTab) to open the auth modal
  // by dispatching window.dispatchEvent(new Event('feyn:show-auth'))
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
