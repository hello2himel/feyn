// ============================================================
// SearchPalette — command-palette style search modal
// Triggered by nav Search button or Cmd/Ctrl+K
// Replaces the old slide-in ExploreDrawer.
// ============================================================

import { useState, useMemo, useEffect, useRef } from 'react'
import Link from 'next/link'
import { getClassified, getTotalLessons, getCoachesFor } from '../data/courseHelpers'

export default function SearchPalette({ onClose }) {
  const [query, setQuery]       = useState('')
  const [activeIdx, setActiveIdx] = useState(0)
  const inputRef  = useRef(null)
  const listRef   = useRef(null)

  const { classes, interests } = getClassified()
  const allPrograms = [...classes, ...interests]

  // All subjects flat — shown as "browse" when no query
  const allSubjects = useMemo(() =>
    allPrograms.flatMap(p => p.subjects.map(s => ({ program: p, subject: s })))
  , [])

  const results = useMemo(() => {
    if (!query.trim()) return allSubjects
    const q = query.toLowerCase()
    return allSubjects.filter(({ program, subject }) =>
      subject.name.toLowerCase().includes(q) ||
      subject.description?.toLowerCase().includes(q) ||
      program.name.toLowerCase().includes(q)
    )
  }, [query, allSubjects])

  // Reset active index when results change
  useEffect(() => { setActiveIdx(0) }, [query])

  // Focus input on mount
  useEffect(() => { inputRef.current?.focus() }, [])

  // Scroll active item into view
  useEffect(() => {
    const el = listRef.current?.querySelector(`[data-idx="${activeIdx}"]`)
    el?.scrollIntoView({ block: 'nearest' })
  }, [activeIdx])

  function handleKeyDown(e) {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActiveIdx(i => Math.min(i + 1, results.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActiveIdx(i => Math.max(i - 1, 0))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      const hit = results[activeIdx]
      if (hit) {
        window.location.href = `/${hit.program.id}/${hit.subject.id}`
        onClose()
      }
    } else if (e.key === 'Escape') {
      onClose()
    }
  }

  return (
    <>
      {/* Backdrop */}
      <div className="sp-backdrop" onClick={onClose} />

      {/* Palette */}
      <div className="sp-palette" role="dialog" aria-modal="true" aria-label="Search courses">

        {/* Input row */}
        <div className="sp-input-wrap">
          <i className="ri-search-line sp-input-icon" />
          <input
            ref={inputRef}
            className="sp-input"
            placeholder="Search courses, topics, programs…"
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            autoComplete="off"
            spellCheck={false}
          />
          {query && (
            <button className="sp-clear" onClick={() => { setQuery(''); inputRef.current?.focus() }} tabIndex={-1}>
              <i className="ri-close-line" />
            </button>
          )}
          <button className="sp-esc" onClick={onClose} tabIndex={-1}>esc</button>
        </div>

        {/* Results */}
        <div className="sp-body" ref={listRef}>
          {/* Section label */}
          <div className="sp-section-label">
            {query
              ? `${results.length} result${results.length !== 1 ? 's' : ''}`
              : 'All courses'}
          </div>

          {results.length === 0 && (
            <div className="sp-empty">
              <i className="ri-search-line" />
              <p>No courses match <strong>"{query}"</strong></p>
            </div>
          )}

          {results.map(({ program, subject }, i) => {
            const total   = getTotalLessons(subject)
            const coaches = getCoachesFor(subject.coachIds || [])
            const isActive = i === activeIdx
            return (
              <Link
                key={`${program.id}/${subject.id}`}
                href={`/${program.id}/${subject.id}`}
                className={`sp-result ${isActive ? 'sp-result--active' : ''}`}
                data-idx={i}
                onClick={onClose}
                onMouseEnter={() => setActiveIdx(i)}
              >
                <span className="sp-result__icon">
                  <i className={subject.icon || 'ri-book-open-line'} />
                </span>
                <span className="sp-result__body">
                  <span className="sp-result__name">{subject.name}</span>
                  <span className="sp-result__meta">
                    <span className={`sp-result__tag sp-result__tag--${program.type}`}>
                      {program.name}
                    </span>
                    <span className="sp-result__dot">·</span>
                    <span>{total} lesson{total !== 1 ? 's' : ''}</span>
                    {coaches[0] && <>
                      <span className="sp-result__dot">·</span>
                      <span>{coaches[0].name}</span>
                    </>}
                  </span>
                </span>
                {subject.certificate && (
                  <span className="sp-result__cert" title="Certificate available">
                    <i className="ri-medal-line" />
                  </span>
                )}
                <span className="sp-result__arrow">
                  <i className="ri-arrow-right-s-line" />
                </span>
              </Link>
            )
          })}
        </div>

        {/* Footer hints */}
        <div className="sp-footer">
          <span className="sp-hint"><kbd>↑</kbd><kbd>↓</kbd> navigate</span>
          <span className="sp-hint"><kbd>↵</kbd> open</span>
          <span className="sp-hint"><kbd>esc</kbd> close</span>
        </div>
      </div>
    </>
  )
}
