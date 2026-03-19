import Head from 'next/head'
import Link from 'next/link'
import { Nav, Footer } from '../components/Layout'

export default function AboutPage() {
  return (
    <>
      <Head>
        <title>About Feyn</title>
        <meta name="description" content="Feyn is the learning platform of STΛRGZR. We teach the way Feynman would." />
      </Head>
      <Nav />
      <main>
        <div className="container">
          <div className="static-page">
            <header className="static-page__header">
              <p className="static-page__eyebrow">About</p>
              <h1 className="static-page__title">What is Feyn?</h1>
            </header>
            <div className="static-page__body">
              <p>
                Feyn is the educational video platform of <strong>STΛRGZR</strong>, a community
                for students who believe learning should be driven by curiosity, not compliance.
              </p>

              <h2>Where it started</h2>
              <p>
                It grew out of <strong>Feynman Files</strong>, a peer teaching series where
                students explained things the way they wished someone had explained them.
                Not the textbook way. The human way. The way where you actually understand
                what you're looking at before being told what to call it.
              </p>
              <p>
                Richard Feynman believed that if you couldn't explain something simply,
                you hadn't really understood it yet. That principle is the foundation of
                everything here. Every lesson on Feyn starts from scratch, assumes nothing,
                and earns your understanding before moving forward.
              </p>

              <h2>What we cover</h2>
              <p>
                The full HSC, SSC and JSC curriculum. Primary grades. And beyond the syllabus
                too, because curiosity does not stop at the exam paper. Music, programming,
                languages, art. If someone in our community can teach it well, it belongs here.
              </p>

              <h2>Who makes this</h2>
              <p>
                STΛRGZR is a network of students, educators and curious people who learn,
                teach and build things together. Feyn is one of our projects. All content
                is created by real instructors who care about teaching, not just covering
                the syllabus.
              </p>
              <p>
                <a href="https://stargzr.netlify.app" target="_blank" rel="noopener noreferrer">
                  Learn more about STΛRGZR
                </a>
              </p>

              <h2>Our principles</h2>
              <ul>
                <li><strong>Start from zero.</strong> Every lesson assumes the student knows nothing about the topic yet.</li>
                <li><strong>Intuition before formulas.</strong> The concept first. The notation second.</li>
                <li><strong>One idea per lesson.</strong> No cramming. No rushing.</li>
                <li><strong>Completely free.</strong> No paywalls, no ads, no hidden costs. Ever.</li>
              </ul>

              <h2>Contact</h2>
              <p>
                Questions, feedback, or want to contribute a course?{' '}
                <Link href="/contact">Get in touch</Link>.
              </p>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </>
  )
}
