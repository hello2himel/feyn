import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/router'
import data from '../data/index.js'

function buildIndex() {
  const items = []
  for (const prog of data.programs) {
    items.push({ type: 'program', title: prog.name, sub: prog.description, icon: prog.icon, href: `/${prog.id}` })
    for (const subj of prog.subjects) {
      items.push({ type: 'subject', title: subj.name, sub: `${prog.name} · ${subj.description}`, icon: subj.icon, href: `/${prog.id}/${subj.id}` })
      for (const topic of subj.topics) {
        items.push({ type: 'topic', title: topic.name, sub: `${prog.name} › ${subj.name} · ${topic.description}`, icon: topic.icon, href: `/${prog.id}/${subj.id}/${topic.id}` })
        for (const skill of topic.skills) {
          items.push({ type: 'skill', title: skill.name, sub: `${subj.name} › ${topic.name} · ${skill.description}`, icon: skill.icon, href: `/${prog.id}/${subj.id}/${topic.id}` })
        }
      }
    }
  }
  return items
}

const INDEX = buildIndex()

export default function SearchPalette({ onClose }) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState(INDEX.slice(0, 8))
  const [cursor, setCursor] = useState(0)
  const router = useRouter()
  const inputRef = useRef(null)

  useEffect(() => { inputRef.current?.focus() }, [])

  useEffect(() => {
    if (!query.trim()) { setResults(INDEX.slice(0, 8)); return }
    const q = query.toLowerCase()
    setResults(INDEX.filter(item => item.title.toLowerCase().includes(q) || item.sub?.toLowerCase().includes(q)).slice(0, 10))
    setCursor(0)
  }, [query])

  function handleSelect(item) { router.push(item.href); onClose() }

  function handleKey(e) {
    if (e.key === 'ArrowDown') { e.preventDefault(); setCursor(c => Math.min(c + 1, results.length - 1)) }
    if (e.key === 'ArrowUp')   { e.preventDefault(); setCursor(c => Math.max(c - 1, 0)) }
    if (e.key === 'Enter')     { if (results[cursor]) handleSelect(results[cursor]) }
    if (e.key === 'Escape')    { onClose() }
  }

  return (
    <div className="search-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="search-modal">
        <div className="search-input-wrap">
          <i className="ri-search-line search-input-icon" />
          <input ref={inputRef} className="search-input" placeholder="Search topics, skills, subjects…" value={query} onChange={e => setQuery(e.target.value)} onKeyDown={handleKey} />
          <button className="search-close" onClick={onClose}><i className="ri-close-line" /></button>
        </div>
        <div className="search-results">
          {results.length === 0 && <p className="search-empty">No results for "{query}"</p>}
          {results.map((item, i) => (
            <button key={`${item.href}-${item.title}-${i}`} className={`search-result ${i === cursor ? 'search-result--active' : ''}`} onClick={() => handleSelect(item)} onMouseEnter={() => setCursor(i)}>
              <span className="search-result__icon"><i className={item.icon} /></span>
              <span className="search-result__body">
                <span className="search-result__title">{item.title}</span>
                <span className="search-result__sub">{item.sub}</span>
              </span>
              <span className="search-result__type">{item.type}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
