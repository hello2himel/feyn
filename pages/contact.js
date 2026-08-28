import Head from 'next/head'
import Link from 'next/link'
import { Nav, Footer, Plate } from '../components/Layout'

// One inbox, a few routes into it. The old page was a bare mailto in a
// paragraph; this gives each reason to write its own row, so a mentor
// applicant and a bug report do not read as the same errand.
const ROUTES = [
  {
    icon: 'ri-mail-line',
    label: 'General',
    title: 'Anything at all',
    desc: 'Questions, feedback, corrections to a lesson, or just saying hello.',
    href: 'mailto:stargzr.science@gmail.com',
    action: 'stargzr.science@gmail.com',
  },
  {
    icon: 'ri-user-star-line',
    label: 'Teaching',
    title: 'Publish a course',
    desc: 'Apply as a mentor, or register a school or coaching centre as a platform.',
    href: '/teach',
    action: 'See how teaching works',
    internal: true,
  },
  {
    icon: 'ri-heart-line',
    label: 'Support',
    title: 'Keep it free',
    desc: 'Feyn takes no cut and runs no ads. Donations cover hosting and nothing else.',
    href: '/about',
    action: 'About the project',
    internal: true,
  },
]

export default function ContactPage() {
  return (
    <>
      <Head>
        <title>Contact · Feyn</title>
        <meta name="description" content="Get in touch with the Feyn team." />
      </Head>
      <Nav />
      <main>
        <Plate>
          <header className="static-page__header">
            <p className="static-page__eyebrow">Contact</p>
            <h1 className="static-page__title">Get in touch</h1>
            <p className="static-page__lede">
              Feyn is run by a small group of students and educators. There is one
              inbox, and a person reads it.
            </p>
          </header>
        </Plate>

        <div className="container">
          <div className="static-page__body-wrap">
            <div className="contact-routes">
              {ROUTES.map(r => (
                <div key={r.label} className="contact-route">
                  <span className="contact-route__icon" aria-hidden="true">
                    <i className={r.icon} />
                  </span>
                  <div className="contact-route__body">
                    <p className="contact-route__label">{r.label}</p>
                    <h2 className="contact-route__title">{r.title}</h2>
                    <p className="contact-route__desc">{r.desc}</p>
                    {r.internal ? (
                      <Link href={r.href} className="contact-route__action">
                        {r.action} <i className="ri-arrow-right-line" aria-hidden="true" />
                      </Link>
                    ) : (
                      <a href={r.href} className="contact-route__action">
                        {r.action} <i className="ri-arrow-right-line" aria-hidden="true" />
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </>
  )
}
