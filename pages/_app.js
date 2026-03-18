import '../styles/globals.css'
import { useEffect, useState } from 'react'
import dynamic from 'next/dynamic'
import { AuthProvider, useAuth } from '../components/Layout'
import data from '../data/courses'
import { hasOnboarded } from '../lib/userStore'

// AuthFlow is client-only
const AuthFlow = dynamic(() => import('../components/AuthFlow'), { ssr: false })

// Inner wrapper — has access to AuthProvider context
function AppInner({ Component, pageProps }) {
  const { showAuth, setShowAuth, signedIn, refresh, mounted } = useAuth()
  const [showOnboarding, setShowOnboarding] = useState(false)

  // After sign-in completes, check if onboarding still needed
  function handleAuthComplete() {
    setShowAuth(false)
    refresh()
    // If now signed in and not yet onboarded, trigger onboarding immediately
    if (!hasOnboarded()) {
      setShowOnboarding(true)
    }
  }

  function handleOnboardingComplete() {
    setShowOnboarding(false)
    refresh()
    // Force page re-render by triggering a storage event
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('feyn:auth'))
    }
  }

  return (
    <>
      <Component {...pageProps} />

      {/* Global auth modal */}
      {mounted && showAuth && (
        <AuthFlow
          programs={data.programs}
          onComplete={handleAuthComplete}
          initialMode="auth"
        />
      )}

      {/* Global onboarding modal (post sign-up) */}
      {mounted && showOnboarding && !showAuth && (
        <AuthFlow
          programs={data.programs}
          onComplete={handleOnboardingComplete}
          initialMode="interests"
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
