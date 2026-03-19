import Head from 'next/head'
import { Nav, Footer } from '../components/Layout'

export default function TermsPage() {
  return (
    <>
      <Head><title>Terms of Use - Feyn</title></Head>
      <Nav />
      <main>
        <div className="container">
          <div className="static-page">
            <header className="static-page__header">
              <p className="static-page__eyebrow">Legal</p>
              <h1 className="static-page__title">Terms of Use</h1>
              <p className="static-page__date">Last updated: January 2025</p>
            </header>
            <div className="static-page__body">
              <p>
                By using Feyn, you agree to these terms. They're written plainly
                because we think legal documents should actually be readable.
              </p>

              <h2>What Feyn is</h2>
              <p>
                Feyn is a free educational platform. You can browse all content without
                an account. Creating an account lets you track progress and earn certificates.
              </p>

              <h2>Your account</h2>
              <p>
                Accounts are local by default, stored only on your device. If you opt into
                cloud sync, your data is stored securely in our database.
                You can delete your account and all associated data at any time from your profile settings.
              </p>

              <h2>Content</h2>
              <p>
                All educational content on Feyn is provided for personal learning only.
                You may not redistribute, sell, or republish any course content without permission.
                Videos are hosted on YouTube and subject to YouTube's terms of service.
              </p>

              <h2>Certificates</h2>
              <p>
                Feyn certificates are recognition of course completion within our platform.
                They are not accredited qualifications. We make no representations
                about their acceptance by employers, universities, or other institutions.
              </p>

              <h2>Conduct</h2>
              <p>
                Be decent. Don't attempt to abuse, scrape, or disrupt the platform.
                Don't impersonate other users or instructors.
              </p>

              <h2>Availability</h2>
              <p>
                We make no guarantees of uptime or continued availability of any specific content.
                Feyn is provided as-is, free of charge.
              </p>

              <h2>Changes</h2>
              <p>
                We may update these terms from time to time. Continued use of Feyn
                after changes constitutes acceptance of the updated terms.
              </p>

              <h2>Contact</h2>
              <p>Questions about these terms? <a href="mailto:hello@stargzr.com">hello@stargzr.com</a></p>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </>
  )
}
