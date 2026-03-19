// ============================================================
// ExploreDrawer, slide-in panel to browse all classes/interests
// Accessible via Nav button for signed-in users
// ============================================================

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { getClassified, getTotalLessons, getCoachesFor } from '../data/courseHelpers'
import { YTThumb } from './Layout'

export default function ExploreDrawer({ onClose }) {
  const [query, setQuery] = useState('')
  const [tab, setTab]     = useState('all') // 'all' | 'class' | 'interest'
  const { classes, interests } = getClassified()

  const allPrograms = [...classes, ...interests]
  const filtered    = tab === 'all' ? allPrograms
    : tab === 'class'    ? classes
    : interests

  // Flatten all subjects for search
  const searchResults = useMemo(() => {
    if (!query.trim()) return null
    const q = query.toLowerCase()
    const results = []
    for (const program of allPrograms) {
      for (const subject of program.subjects) {
        if (
          subject.name.toLowerCase().includes(q) ||
          subject.description.toLowerCase().includes(q) ||
          program.name.toLowerCase().includes(q)
        ) {
          results.push({ program, subject })
        }
      }
    }
    return results
  }, [query])

  const display = searchResults !== null
    ? searchResults
    : filtered.flatMap(p => p.subjects.map(s => ({ program: p, subject: s })))

  return (
    <>
      <div className="explore-backdrop" onClick={onClose} />
      <aside className="explore-drawer">

        {/* Header */}
        <div className="explore-drawer__header">
          <div className="explore-drawer__header-left">
            <i className="ri-compass-discover-line" />
            <h2 className="explore-drawer__title">Explore</h2>
          </div>
          <button className="nav__icon-btn" onClick={onClose} aria-label="Close">
            <i className="ri-close-line" />
          </button>
        </div>

        {/* Search */}
        <div className="explore-drawer__search">
          <i className="ri-search-line" />
          <input
            className="explore-drawer__search-input"
            placeholder="Search courses…"
            value={query}
            onChange={e => setQuery(e.target.value)}
            autoFocus
          />
          {query && (
            <button onClick={() => setQuery('')} style={{ background: 'none', border: 'none', color: 'var(--text-3)', cursor: 'pointer' }}>
              <i className="ri-close-line" />
            </button>
          )}
        </div>

        {/* Tabs (only when not searching) */}
        {!query && (
          <div className="explore-drawer__tabs">
            {[['all','All'],['class','Classes'],['interest','Interests']].map(([v,l]) => (
              <button
                key={v}
                className={`explore-tab ${tab === v ? 'explore-tab--active' : ''}`}
                onClick={() => setTab(v)}
              >{l}</button>
            ))}
          </div>
        )}

        {/* Results */}
        <div className="explore-drawer__body">
          {query && searchResults !== null && (
            <p className="explore-drawer__result-count">
              {searchResults.length} result{searchResults.length !== 1 ? 's' : ''} for "{query}"
            </p>
          )}

          {!query && (
            // Show grouped by program when not searching
            filtered.map(program => (
              <div key={program.id} className="explore-program-group">
                <Link href={`/${program.id}`} className="explore-program-label" onClick={onClose}>
                  <span className={`explore-program-type explore-program-type--${program.type}`}>
                    {program.type === 'class' ? 'Class' : 'Interest'}
                  </span>
                  <span className="explore-program-name">{program.name}</span>
                  <i className="ri-arrow-right-s-line" />
                </Link>
                <div className="explore-course-list">
                  {program.subjects.map(subject => (
                    <ExploreCard
                      key={subject.id}
                      program={program}
                      subject={subject}
                      onClose={onClose}
                    />
                  ))}
                </div>
              </div>
            ))
          )}

          {query && display.map(({ program, subject }) => (
            <ExploreCard
              key={`${program.id}/${subject.id}`}
              program={program}
              subject={subject}
              onClose={onClose}
            />
          ))}

          {query && display.length === 0 && (
            <p style={{ padding: '32px 0', textAlign: 'center', color: 'var(--text-3)', fontStyle: 'italic' }}>
              No courses found for "{query}"
            </p>
          )}
        </div>
      </aside>
    </>
  )
}

function ExploreCard({ program, subject, onClose }) {
  const firstVid = subject.topics[0]?.lessons[0]?.videoId
  const total    = getTotalLessons(subject)
  const coaches  = getCoachesFor(subject.coachIds || [])

  return (
    <Link
      href={`/${program.id}/${subject.id}`}
      className="explore-card"
      onClick={onClose}
    >
      <div className="explore-card__thumb">
        <YTThumb videoId={firstVid} alt={subject.name} />
      </div>
      <div className="explore-card__body">
        <p className="explore-card__program">{program.name}</p>
        <p className="explore-card__name">{subject.name}</p>
        <p className="explore-card__meta">
          <i className={subject.icon || 'ri-book-open-line'} />
          {total} lesson{total !== 1 ? 's' : ''}
          {coaches.length > 0 && <> · {coaches[0].name}</>}
        </p>
      </div>
    </Link>
  )
}
