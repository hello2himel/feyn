// pages/[programId].js — Program page: shows all subjects
import Head from 'next/head'
import Link from 'next/link'
import { useRouter } from 'next/router'
import { Nav, Footer } from '../components/Layout'
import data, { getProgram } from '../data/index.js'

export default function ProgramPage() {
  const { query } = useRouter()
  const program = getProgram(query.programId)
  if (!program) return null

  return (
    <>
      <Head>
        <title>{program.name} · Feyn</title>
        <meta name="description" content={program.description} />
      </Head>
      <Nav />
      <main>
        <div className="page-header">
          <div className="container">
            <p className="page-header__eyebrow">
              <i className={program.icon} /> {program.type === 'class' ? 'Academic programme' : 'Interest area'}
            </p>
            <h1 className="page-header__title">{program.name}</h1>
            <p className="page-header__desc">{program.description}</p>
          </div>
        </div>
        <div className="container" style={{ padding: '40px 24px 80px' }}>
          <p className="section-label"><i className="ri-stack-line" style={{ marginRight: 6 }} />Subjects</p>
          <div className="subject-grid-new">
            {program.subjects.map(subject => (
              <Link key={subject.id} href={`/${program.id}/${subject.id}`} className="subject-card-new">
                <div className="subject-card-new__icon"><i className={subject.icon} /></div>
                <div className="subject-card-new__body">
                  <p className="subject-card-new__name">{subject.name}</p>
                  <p className="subject-card-new__desc">{subject.description}</p>
                  <p className="subject-card-new__meta">
                    {subject.topics.length} topics
                    {subject.topics.length === 0 && <span className="subject-card-new__soon"> · Coming soon</span>}
                  </p>
                </div>
                <i className="ri-arrow-right-s-line subject-card-new__arrow" />
              </Link>
            ))}
          </div>
        </div>
      </main>
      <Footer />
    </>
  )
}
