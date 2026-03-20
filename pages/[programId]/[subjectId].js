// pages/[programId]/[subjectId].js — Subject page: shows all topics
import Head from 'next/head'
import Link from 'next/link'
import { useRouter } from 'next/router'
import { useState, useEffect } from 'react'
import { Nav, Footer, useAuth } from '../../components/Layout'
import { getProgram, getSubject, countSkills, countLessons } from '../../data/index.js'
import { getAllSkillProgress } from '../../lib/userStore'

function TopicCard({ topic, programId, subjectId, skillProgress, mounted }) {
  const totalSkills = countSkills(topic)
  const doneSkills = mounted
    ? topic.skills.filter(s => {
        const sp = skillProgress[`${programId}/${subjectId}/${topic.id}/${s.id}`]
        return sp?.status === 'complete' || sp?.status === 'mastered'
      }).length
    : 0
  const pct = totalSkills ? Math.round(doneSkills / totalSkills * 100) : 0
  const isComingSoon = totalSkills === 0

  return (
    <Link
      href={isComingSoon ? '#' : `/${programId}/${subjectId}/${topic.id}`}
      className={`topic-card ${isComingSoon ? 'topic-card--soon' : ''}`}
      onClick={isComingSoon ? e => e.preventDefault() : undefined}
    >
      <div className="topic-card__icon"><i className={topic.icon} /></div>
      <div className="topic-card__body">
        <p className="topic-card__name">{topic.name}</p>
        <p className="topic-card__desc">{topic.description}</p>
        <div className="topic-card__meta">
          {isComingSoon ? (
            <span className="topic-card__soon-tag">Coming soon</span>
          ) : (
            <>
              <span><i className="ri-node-tree" /> {totalSkills} skills</span>
              <span><i className="ri-question-line" /> {countLessons(topic)} lessons</span>
              {mounted && totalSkills > 0 && (
                <span className="topic-card__pct">{pct}%</span>
              )}
            </>
          )}
        </div>
        {mounted && !isComingSoon && totalSkills > 0 && (
          <div className="topic-card__bar">
            <div className="topic-card__bar-fill" style={{ width: `${pct}%` }} />
          </div>
        )}
      </div>
      {!isComingSoon && <i className="ri-arrow-right-s-line topic-card__arrow" />}
    </Link>
  )
}

export default function SubjectPage() {
  const { query } = useRouter()
  const { mounted } = useAuth()
  const [skillProgress, setSP] = useState({})

  const program = getProgram(query.programId)
  const subject = getSubject(query.programId, query.subjectId)

  useEffect(() => {
    if (mounted) setSP(getAllSkillProgress())
  }, [mounted])

  if (!program || !subject) return null

  return (
    <>
      <Head>
        <title>{subject.name} · {program.name} · Feyn</title>
        <meta name="description" content={subject.description} />
      </Head>
      <Nav />
      <main>
        <div className="page-header">
          <div className="container">
            <p className="page-header__eyebrow">
              <Link href={`/${program.id}`} style={{ color: 'var(--text-3)' }}>{program.name}</Link>
              <span style={{ margin: '0 6px', color: 'var(--border-2)' }}>›</span>
              <i className={subject.icon} /> {subject.name}
            </p>
            <h1 className="page-header__title">{subject.name}</h1>
            <p className="page-header__desc">{subject.description}</p>
          </div>
        </div>
        <div className="container" style={{ padding: '40px 24px 80px' }}>
          <p className="section-label">
            <i className="ri-map-2-line" style={{ marginRight: 6 }} />Topics
          </p>
          {subject.topics.length === 0 ? (
            <div className="coming-soon-block">
              <i className="ri-time-line" />
              <p>Content for {subject.name} is being prepared. Check back soon.</p>
            </div>
          ) : (
            <div className="topic-grid">
              {subject.topics.map(topic => (
                <TopicCard
                  key={topic.id}
                  topic={topic}
                  programId={program.id}
                  subjectId={subject.id}
                  skillProgress={skillProgress}
                  mounted={mounted}
                />
              ))}
            </div>
          )}
        </div>
      </main>
      <Footer />
    </>
  )
}
