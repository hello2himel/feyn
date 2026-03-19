import Head from 'next/head'
import { Nav, Footer } from '../components/Layout'

export default function PrivacyPage() {
  return (
    <>
      <Head><title>Privacy Policy - Feyn</title></Head>
      <Nav />
      <main>
        <div className="container">
          <div className="static-page">
            <header className="static-page__header">
              <p className="static-page__eyebrow">Legal</p>
              <h1 className="static-page__title">Privacy Policy</h1>
              <p className="static-page__date">Last updated: January 2025</p>
            </header>
            <div className="static-page__body">
              <p>
                The short version: we collect as little data as possible, we don't sell
                it, and you can delete it whenever you want.
              </p>

              <h2>What we collect</h2>
              <p>
                <strong>Without an account:</strong> nothing. No cookies, no tracking,
                no analytics on individual users.
              </p>
              <p>
                <strong>With a local account:</strong> your name, username, watch history,
                enrolled courses, and certificates. All stored locally on your device only.
                We never see this data.
              </p>
              <p>
                <strong>With a global account (cloud sync):</strong> the same data as above,
                plus your session token, stored in our Supabase database. This is used purely
                to sync your progress across devices.
              </p>

              <h2>What we do not collect</h2>
              <ul>
                <li>Email addresses (we don't require them)</li>
                <li>Payment information (everything is free)</li>
                <li>Location data</li>
                <li>Browsing history outside of Feyn</li>
                <li>Any data for advertising purposes</li>
              </ul>

              <h2>Third-party services</h2>
              <p>
                Videos are embedded from YouTube. YouTube may collect data when you watch
                videos, subject to Google's privacy policy.
              </p>
              <p>
                Cloud sync uses Supabase, a Postgres database provider. Data is stored
                in their infrastructure.
              </p>

              <h2>Your rights</h2>
              <p>
                You can delete your account and all stored data at any time from your
                profile page. For global accounts, this removes your data from our
                database as well.
              </p>

              <h2>Contact</h2>
              <p>Privacy questions: <a href="mailto:hello@stargzr.com">hello@stargzr.com</a></p>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </>
  )
}
