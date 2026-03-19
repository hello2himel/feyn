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
                For all inquiries, use the email below.
              </p>

              <h2>Email</h2>
              <p>
                <a href="mailto:stargzr.science@gmail.com">
                  stargzr.science@gmail.com
                </a>
              </p>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </>
  )
}