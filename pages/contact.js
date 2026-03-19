import Head from 'next/head'
import { Nav, Footer } from '../components/Layout'

export default function ContactPage() {
  return (
    <>
      <Head>
        <title>Contact - Feyn</title>
      </Head>
      <Nav />
      <main>
        <div className="container">
          <div className="static-page">
            <header className="static-page__header">
              <p className="static-page__eyebrow">Contact</p>
              <h1 className="static-page__title">Get in touch</h1>
            </header>
            <div className="static-page__body">
              <p>
                We'd love to hear from you. Whether you have a question, spotted something
                broken, want to contribute content, or just want to say hello.
              </p>

              <h2>Email</h2>
              <p>
                <a href="mailto:hello@stargzr.com">hello@stargzr.com</a>
              </p>

              <h2>Community</h2>
              <p>
                The fastest way to reach us is through the STΛRGZR community.
                Join our Discord or Telegram to connect with the team and other students directly.
              </p>
              <ul>
                <li><a href="https://discord.gg/stargzr" target="_blank" rel="noopener noreferrer">Discord</a></li>
                <li><a href="https://t.me/stargzr" target="_blank" rel="noopener noreferrer">Telegram</a></li>
              </ul>

              <h2>Want to teach on Feyn?</h2>
              <p>
                If you're an educator or student who wants to contribute a course or lesson series,
                reach out with a brief outline of what you'd like to teach.
                We're always looking for people who can explain things well.
              </p>

              <h2>Found a bug?</h2>
              <p>
                Open an issue on our{' '}
                <a href="https://github.com/stargzr/feyn" target="_blank" rel="noopener noreferrer">GitHub repository</a>
                {' '}or email us directly.
              </p>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </>
  )
}
