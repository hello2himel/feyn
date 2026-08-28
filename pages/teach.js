// ============================================================
// pages/teach.js — public recruitment page for mentors & platforms
//
// The application forms (/apply/mentor, /apply/platform) were only
// reachable from /studio and /panels, which both require you to
// already be signed in AND already suspect that mentoring exists.
// This page is the front door: a public, indexable pitch that explains
// the two paths (solo mentor vs platform), what you get, and how the
// review flow works — then hands off to the right form.
//
// Auth-aware: an approved mentor sees "open your studio" instead of a
// pitch, and a pending applicant sees their status, so the page never
// asks someone to apply twice.
//
// Stats and the mentor rail are real data via getStaticProps (ISR), not
// invented numbers — an empty platform shows an honest empty state.
// ============================================================

import Head from 'next/head'
import Link from 'next/link'
import { Nav, Footer, useAuth } from '../components/Layout'
import { usePermissions } from '../lib/usePermissions'
import { approvedMemberships, isApprovedMentor } from '../lib/permissions'
import { getMentors, getPublishers, getPrograms, getTotalLessons } from '../data/courseHelpers'

const PATHS = [
  {
    key: 'mentor',
    icon: 'ri-user-star-line',
    kicker: 'For individuals',
    title: 'Teach as yourself',
    body:
      'Apply as a mentor and you get your own publisher the moment you are approved — no organisation needed. Publish courses under your name at /m/your-handle.',
    points: [
      'Your own public profile page',
      'Publish independently, keep the credit',
      'Join platforms later without losing anything',
    ],
    href: '/apply/mentor',
    cta: 'Apply as a mentor',
    primary: true,
  },
  {
    key: 'platform',
    icon: 'ri-building-line',
    kicker: 'For schools, coachings & collectives',
    title: 'Bring a whole team',
    body:
      'Register a platform and get a branded page at /p/your-slug, a member roster with roles, and a shared library of courses your mentors edit together.',
    points: [
      'Branded publisher page and logo',
      'Admin, editor and mentor roles',
      'Open, request-to-join or invite-only',
    ],
    href: '/apply/platform',
    cta: 'Register a platform',
    primary: false,
  },
]

const PERKS = [
  {
    icon: 'ri-edit-box-line',
    title: 'A real course editor',
    body: 'Build topics, skills, lessons and quiz questions in the browser. No spreadsheets, no pull requests.',
  },
  {
    icon: 'ri-medal-line',
    title: 'Certificates that verify',
    body: 'Courses can issue signed certificates with your signature, verifiable by anyone at a public link.',
  },
  {
    icon: 'ri-at-line',
    title: 'A handle that is yours',
    body: 'Your @handle is permanent. Change it and old links keep working — they redirect instead of rotting.',
  },
  {
    icon: 'ri-links-line',
    title: 'Teach in several places',
    body: 'Hold memberships in any number of platforms at once, each with its own role, plus your own solo publisher.',
  },
  {
    icon: 'ri-shield-check-line',
    title: 'Credit is enforced, not decorative',
    body: 'Being credited on a course is what grants edit access to it. Your name on a lesson means you made it.',
  },
  {
    icon: 'ri-price-tag-3-line',
    title: 'No fees, no ads, no cut',
    body: 'Feyn is free for learners and free for teachers. We take nothing, because there is nothing to take.',
  },
]

const STEPS = [
  {
    n: '01',
    title: 'Pick a handle and apply',
    body: 'Name, a short bio, your credentials and the handle you want. Two minutes, behind a normal sign-in.',
  },
  {
    n: '02',
    title: 'A human reviews it',
    body: 'An admin reads every application. Rejections are not permanent — fix the gap and apply again with the same form.',
  },
  {
    n: '03',
    title: 'Your studio opens itself',
    body: 'On approval your solo publisher is created automatically, with you as its admin. Start your first course the same day.',
  },
]

const FAQ = [
  {
    q: 'Do I need to be a teacher by profession?',
    a: 'No. Feyn started as a peer-teaching series. What is reviewed is whether you can explain something from first principles, not your job title.',
  },
  {
    q: 'Can I teach under a school and on my own?',
    a: 'Yes, simultaneously. A mentor is a person; a membership is an affiliation. You can hold several memberships and still publish through your own solo publisher.',
  },
  {
    q: 'What happens to my courses if I leave a platform?',
    a: 'Courses stay with the publisher that owns them, and that publisher must reassign or archive them. Your mentor profile, your handle and your solo publisher are untouched.',
  },
  {
    q: 'Is the content mine?',
    a: 'You keep authorship and credit. Feyn is free and open — nothing is paywalled, and nothing is monetised behind your back.',
  },
  {
    q: 'How do people find my courses?',
    a: 'Every course you are credited on is aggregated on your public profile, listed in the mentor directory, and surfaced in search alongside everything else.',
  },
]

export default function TeachPage({ stats, mentors }) {
  const { signedIn, setShowAuth, mounted } = useAuth()
  const { perms, loading } = usePermissions()

  const alreadyIn = mounted && signedIn && !loading &&
    (isApprovedMentor(perms) || approvedMemberships(perms).length > 0 || perms.isAppAdmin)
  const pending = mounted && signedIn && !loading && perms.mentorStatus === 'pending'

  return (
    <>
      <Head>
        <title>Teach on Feyn — become a mentor or register a platform</title>
        <meta
          name="description"
          content="Publish courses on Feyn as an independent mentor or as a school, coaching centre or collective. Free, no ads, no revenue cut."
        />
      </Head>
      <Nav />
      <main>

        {/* ══ HERO ══ */}
        <section className="teach-hero plate">
          <div className="teach-hero__inner container">
            <div className="teach-hero__content">
              <span className="teach-hero__badge">
                <i className="ri-quill-pen-line" /> Teach on Feyn
              </span>
              <h1 className="teach-hero__title">
                Someone out there is<br />
                <span className="teach-hero__accent">stuck on the thing you find easy.</span>
              </h1>
              <p className="teach-hero__sub">
                Feyn is looking for people who can explain an idea from nothing — no jargon, no
                hand-waving, no &ldquo;you&rsquo;ll understand this next year&rdquo;. Bring one topic
                or a whole syllabus. Bring yourself or your whole institution.
              </p>

              <div className="teach-hero__actions">
                {alreadyIn ? (
                  <Link href="/studio" className="btn btn--accent teach-btn">
                    <i className="ri-dashboard-line" /> Open your studio
                  </Link>
                ) : pending ? (
                  <Link href="/apply/mentor" className="btn btn--accent teach-btn">
                    <i className="ri-time-line" /> View your application
                  </Link>
                ) : mounted && !signedIn ? (
                  <button className="btn btn--accent teach-btn" onClick={() => setShowAuth(true)}>
                    <i className="ri-user-add-line" /> Sign in to apply
                  </button>
                ) : (
                  <Link href="/apply/mentor" className="btn btn--accent teach-btn">
                    <i className="ri-user-star-line" /> Apply as a mentor
                  </Link>
                )}
                <a href="#paths" className="btn btn--ghost teach-btn">
                  <i className="ri-arrow-down-line" /> See both paths
                </a>
              </div>

              {pending && (
                <p className="teach-hero__note">
                  <i className="ri-time-line" /> Your mentor application is waiting for review.
                </p>
              )}
            </div>

            {/* Live numbers — honest, and hidden when there is nothing to show */}
            <aside className="teach-hero__stats" aria-label="Feyn at a glance">
              {[
                { num: stats.mentors, label: 'Mentors', icon: 'ri-user-star-line' },
                { num: stats.publishers, label: 'Publishers', icon: 'ri-building-line' },
                { num: stats.courses, label: 'Courses', icon: 'ri-book-open-line' },
                { num: stats.lessons, label: 'Lessons', icon: 'ri-play-circle-line' },
              ].map(s => (
                <div key={s.label} className="teach-stat">
                  <span className="teach-stat__num">{s.num}</span>
                  <span className="teach-stat__label"><i className={s.icon} /> {s.label}</span>
                </div>
              ))}
            </aside>
          </div>
        </section>

        {/* ══ TWO PATHS ══ */}
        <section className="teach-section container" id="paths">
          <header className="teach-section__header">
            <p className="teach-section__eyebrow"><i className="ri-git-branch-line" /> Two ways in</p>
            <h2 className="teach-section__title">Pick the one that describes you</h2>
            <p className="teach-section__lede">
              Both end in the same place: a publisher you control, with courses under it. The only
              difference is whether that publisher is you or an organisation.
            </p>
          </header>

          <div className="teach-paths">
            {PATHS.map(p => (
              <article key={p.key} className={`teach-path${p.primary ? ' teach-path--primary' : ''}`}>
                <span className="teach-path__kicker">{p.kicker}</span>
                <span className="teach-path__icon"><i className={p.icon} /></span>
                <h3 className="teach-path__title">{p.title}</h3>
                <p className="teach-path__body">{p.body}</p>
                <ul className="teach-path__points">
                  {p.points.map(pt => (
                    <li key={pt}><i className="ri-check-line" /> {pt}</li>
                  ))}
                </ul>
                <Link href={p.href} className={`btn ${p.primary ? 'btn--accent' : 'btn--ghost'} btn--sm teach-path__cta`}>
                  <i className={p.icon} /> {p.cta}
                </Link>
              </article>
            ))}
          </div>
        </section>

        {/* ══ WHAT YOU GET ══ */}
        <section className="teach-band">
          <div className="teach-section container">
            <header className="teach-section__header">
              <p className="teach-section__eyebrow"><i className="ri-gift-line" /> What you get</p>
              <h2 className="teach-section__title">Tools, not promises</h2>
            </header>
            <div className="teach-perks">
              {PERKS.map(p => (
                <div key={p.title} className="teach-perk">
                  <span className="teach-perk__icon"><i className={p.icon} /></span>
                  <h3 className="teach-perk__title">{p.title}</h3>
                  <p className="teach-perk__body">{p.body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ══ HOW IT WORKS ══ */}
        <section className="teach-section container">
          <header className="teach-section__header">
            <p className="teach-section__eyebrow"><i className="ri-route-line" /> How it works</p>
            <h2 className="teach-section__title">Three steps, one review</h2>
          </header>
          <ol className="teach-steps">
            {STEPS.map(s => (
              <li key={s.n} className="teach-step">
                <span className="teach-step__n">{s.n}</span>
                <div>
                  <h3 className="teach-step__title">{s.title}</h3>
                  <p className="teach-step__body">{s.body}</p>
                </div>
              </li>
            ))}
          </ol>
        </section>

        {/* ══ WHO ALREADY TEACHES ══ */}
        {mentors.length > 0 && (
          <section className="teach-band teach-band--quiet">
            <div className="teach-section container">
              <header className="teach-section__header">
                <p className="teach-section__eyebrow"><i className="ri-team-line" /> Already here</p>
                <h2 className="teach-section__title">You would be in this company</h2>
              </header>
              <div className="teach-rail">
                {mentors.map(m => (
                  <Link key={m.id} href={`/m/${m.id}`} className="teach-rail__card">
                    <span className="teach-rail__avatar">
                      {m.avatar ? <img src={m.avatar} alt={m.name} /> : <span aria-hidden="true">{m.name[0]}</span>}
                    </span>
                    <span className="teach-rail__name">{m.name}</span>
                    {m.title && <span className="teach-rail__title">{m.title}</span>}
                  </Link>
                ))}
              </div>
              <Link href="/coaches" className="teach-rail__more">
                See every mentor <i className="ri-arrow-right-line" />
              </Link>
            </div>
          </section>
        )}

        {/* ══ FAQ ══ */}
        <section className="teach-section container">
          <header className="teach-section__header">
            <p className="teach-section__eyebrow"><i className="ri-question-line" /> Questions</p>
            <h2 className="teach-section__title">Before you apply</h2>
          </header>
          <div className="teach-faq">
            {FAQ.map(f => (
              <details key={f.q} className="teach-faq__item">
                <summary className="teach-faq__q">
                  <span>{f.q}</span>
                  <i className="ri-add-line teach-faq__marker" aria-hidden="true" />
                </summary>
                <p className="teach-faq__a">{f.a}</p>
              </details>
            ))}
          </div>
        </section>

        {/* ══ CLOSING CTA ══ */}
        <section className="teach-close plate plate--close">
          <div className="container teach-close__inner">
            <p className="teach-close__quote">
              <i className="ri-double-quotes-l" /> If you can&rsquo;t explain it simply, you don&rsquo;t
              understand it well enough. <i className="ri-double-quotes-r" />
              <span className="teach-close__attr">Richard Feynman</span>
            </p>
            <h2 className="teach-close__title">So explain it simply. Here.</h2>
            <div className="teach-close__actions">
              <Link href="/apply/mentor" className="btn btn--accent teach-btn">
                <i className="ri-user-star-line" /> Apply as a mentor
              </Link>
              <Link href="/apply/platform" className="btn btn--ghost teach-btn">
                <i className="ri-building-line" /> Register a platform
              </Link>
            </div>
            <p className="teach-close__fine">
              Free forever · No ads · No revenue share · <Link href="/contact">Questions first?</Link>
            </p>
          </div>
        </section>

      </main>
      <Footer />
    </>
  )
}

// Real counts only. If Supabase is unreachable at build time the
// helpers return empty arrays, so the page still renders with zeros
// rather than failing the build.
export async function getStaticProps() {
  const [mentors, publishers, programs] = await Promise.all([
    getMentors().catch(() => []),
    getPublishers().catch(() => []),
    getPrograms().catch(() => []),
  ])

  const subjects = programs.flatMap(p => p.subjects || [])
  const lessons = subjects.reduce((a, s) => a + getTotalLessons(s), 0)

  return {
    props: {
      stats: {
        mentors: mentors.length,
        publishers: publishers.length,
        courses: subjects.length,
        lessons,
      },
      // The rail is a taster, not the directory — /coaches is the full list.
      mentors: mentors.slice(0, 8).map(m => ({
        id: m.id,
        name: m.name,
        title: m.title,
        avatar: m.avatar,
      })),
    },
    revalidate: 300,
  }
}
