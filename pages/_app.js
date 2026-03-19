import '../styles/globals.css'
import { AuthProvider, useAuth } from '../components/Layout'
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
