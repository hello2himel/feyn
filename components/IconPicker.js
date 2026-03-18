// ============================================================
// IconPicker — searchable Remixicon grid for the admin panel
// Categories mapped to subject types for smart suggestions
// ============================================================

import { useState, useMemo } from 'react'

// Curated subject-relevant icons grouped by category
export const ICON_CATEGORIES = {
  'Science': [
    'ri-flask-line', 'ri-microscope-line', 'ri-test-tube-line',
    'ri-dna-line', 'ri-heart-pulse-line', 'ri-planet-line',
    'ri-lightning-line', 'ri-fire-line', 'ri-water-flash-line',
    'ri-leaf-line', 'ri-bug-line', 'ri-brain-line',
  ],
  'Mathematics': [
    'ri-calculator-line', 'ri-function-line', 'ri-percent-line',
    'ri-pie-chart-line', 'ri-bar-chart-line', 'ri-line-chart-line',
    'ri-compass-3-line', 'ri-infinity-line', 'ri-shapes-line',
    'ri-grid-line', 'ri-ruler-line', 'ri-sigma-line',
  ],
  'Language & Literature': [
    'ri-book-open-line', 'ri-quill-pen-line', 'ri-translate-2',
    'ri-chat-quote-line', 'ri-file-text-line', 'ri-newspaper-line',
    'ri-font-size', 'ri-paragraph', 'ri-book-2-line',
    'ri-pen-nib-line', 'ri-edit-line', 'ri-draft-line',
  ],
  'Technology & CS': [
    'ri-code-line', 'ri-terminal-box-line', 'ri-cpu-line',
    'ri-database-line', 'ri-cloud-line', 'ri-robot-line',
    'ri-keyboard-line', 'ri-code-s-slash-line', 'ri-global-line',
    'ri-wifi-line', 'ri-server-line', 'ri-git-branch-line',
  ],
  'Arts & Music': [
    'ri-palette-line', 'ri-music-2-line', 'ri-film-line',
    'ri-camera-line', 'ri-brush-line', 'ri-pencil-ruler-line',
    'ri-image-line', 'ri-headphone-line', 'ri-mic-line',
    'ri-piano-line', 'ri-guitar-line', 'ri-artboard-line',
  ],
  'Social & History': [
    'ri-earth-line', 'ri-map-pin-line', 'ri-ancient-gate-line',
    'ri-flag-line', 'ri-group-line', 'ri-government-line',
    'ri-scales-3-line', 'ri-building-line', 'ri-bank-line',
    'ri-map-2-line', 'ri-compass-line', 'ri-time-line',
  ],
  'Business & Economics': [
    'ri-money-dollar-circle-line', 'ri-line-chart-line', 'ri-briefcase-line',
    'ri-store-line', 'ri-exchange-dollar-line', 'ri-funds-line',
    'ri-coin-line', 'ri-stock-line', 'ri-pie-chart-2-line',
    'ri-hand-coin-line', 'ri-safe-line', 'ri-auction-line',
  ],
  'Health & Sports': [
    'ri-heart-line', 'ri-run-line', 'ri-football-line',
    'ri-mental-health-line', 'ri-lungs-line', 'ri-first-aid-kit-line',
    'ri-hospital-line', 'ri-medicine-bottle-line', 'ri-stethoscope-line',
    'ri-boxing-line', 'ri-riding-line', 'ri-swimming-line',
  ],
  'Learning & General': [
    'ri-graduation-cap-line', 'ri-book-mark-line', 'ri-lightbulb-line',
    'ri-award-line', 'ri-trophy-line', 'ri-medal-line',
    'ri-star-line', 'ri-target-line', 'ri-focus-3-line',
    'ri-bookmark-line', 'ri-task-line', 'ri-survey-line',
  ],
  'Lifestyle & Hobbies': [
    'ri-gamepad-line', 'ri-restaurant-line', 'ri-cup-line',
    'ri-plant-line', 'ri-car-line', 'ri-plane-line',
    'ri-compass-discover-line', 'ri-home-line', 'ri-hammer-line',
    'ri-scissors-line', 'ri-shirt-line', 'ri-seed-line',
  ],
}

// Flatten for search
const ALL_ICONS = Object.entries(ICON_CATEGORIES).flatMap(([cat, icons]) =>
  icons.map(icon => ({ icon, cat }))
)

// ── Component ──────────────────────────────────────────────────────────
export default function IconPicker({ value, onChange }) {
  const [query, setQuery]   = useState('')
  const [open, setOpen]     = useState(false)
  const [activeCat, setActiveCat] = useState('all')

  const filtered = useMemo(() => {
    let list = ALL_ICONS
    if (activeCat !== 'all') list = list.filter(x => x.cat === activeCat)
    if (query.trim()) {
      const q = query.toLowerCase()
      list = list.filter(x => x.icon.includes(q) || x.cat.toLowerCase().includes(q))
    }
    return list
  }, [query, activeCat])

  return (
    <div style={{ marginBottom: 14 }}>
      <label style={s.label}>Subject Icon</label>

      {/* Trigger button */}
      <button type="button" style={s.trigger} onClick={() => setOpen(o => !o)}>
        {value
          ? <><i className={value} style={{ fontSize: 18, marginRight: 8 }} />{value}</>
          : <span style={{ color: '#5c5852' }}>Choose icon…</span>}
        <i className={`ri-arrow-${open ? 'up' : 'down'}-s-line`} style={{ marginLeft: 'auto', color: '#5c5852' }} />
      </button>

      {open && (
        <div style={s.panel}>
          {/* Search */}
          <div style={s.searchRow}>
            <i className="ri-search-line" style={{ color: '#5c5852', flexShrink: 0 }} />
            <input
              style={s.search}
              placeholder="Search icons…"
              value={query}
              onChange={e => setQuery(e.target.value)}
              autoFocus
            />
            {query && (
              <button style={s.clearBtn} onClick={() => setQuery('')}>
                <i className="ri-close-line" />
              </button>
            )}
          </div>

          {/* Category tabs */}
          <div style={s.cats}>
            <button
              style={{ ...s.catBtn, ...(activeCat === 'all' ? s.catActive : {}) }}
              onClick={() => setActiveCat('all')}
            >All</button>
            {Object.keys(ICON_CATEGORIES).map(cat => (
              <button
                key={cat}
                style={{ ...s.catBtn, ...(activeCat === cat ? s.catActive : {}) }}
                onClick={() => setActiveCat(cat)}
              >{cat}</button>
            ))}
          </div>

          {/* Icon grid */}
          <div style={s.grid}>
            {filtered.map(({ icon }) => (
              <button
                key={icon}
                type="button"
                title={icon.replace('ri-', '').replace(/-line$/, '').replace(/-/g, ' ')}
                style={{
                  ...s.iconBtn,
                  ...(value === icon ? s.iconBtnActive : {}),
                }}
                onClick={() => { onChange(icon); setOpen(false); setQuery('') }}
              >
                <i className={icon} style={{ fontSize: 20 }} />
              </button>
            ))}
            {filtered.length === 0 && (
              <p style={{ padding: '16px', color: '#5c5852', fontSize: 12, gridColumn: '1/-1' }}>
                No icons found for "{query}"
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

const s = {
  label:    { display: 'block', fontFamily: 'monospace', fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#5c5852', marginBottom: 6 },
  trigger:  { display: 'flex', alignItems: 'center', width: '100%', background: '#0d0d0d', border: '1px solid #2a2a2a', color: '#e8e3d8', padding: '8px 12px', fontSize: 13, borderRadius: 2, cursor: 'pointer', fontFamily: 'inherit', boxSizing: 'border-box', gap: 4 },
  panel:    { background: '#111', border: '1px solid #2a2a2a', borderTop: 'none', borderRadius: '0 0 4px 4px', overflow: 'hidden' },
  searchRow:{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 12px', borderBottom: '1px solid #1e1e1e' },
  search:   { flex: 1, background: 'none', border: 'none', outline: 'none', color: '#e8e3d8', fontSize: 13, fontFamily: 'inherit' },
  clearBtn: { background: 'none', border: 'none', color: '#5c5852', cursor: 'pointer', padding: 2, display: 'flex', alignItems: 'center' },
  cats:     { display: 'flex', overflowX: 'auto', gap: 2, padding: '8px 10px', borderBottom: '1px solid #1e1e1e', scrollbarWidth: 'none' },
  catBtn:   { background: 'none', border: '1px solid transparent', borderRadius: 2, padding: '3px 10px', fontSize: 11, color: '#5c5852', cursor: 'pointer', whiteSpace: 'nowrap', fontFamily: 'monospace' },
  catActive:{ background: '#1a1308', border: '1px solid #8b6f3e', color: '#c8a96e' },
  grid:     { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(40px, 1fr))', gap: 2, padding: 10, maxHeight: 240, overflowY: 'auto' },
  iconBtn:  { display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', aspectRatio: '1', background: '#0d0d0d', border: '1px solid #1e1e1e', borderRadius: 2, cursor: 'pointer', color: '#9a9488', transition: 'all 120ms' },
  iconBtnActive: { background: '#1a1308', border: '1px solid #c8a96e', color: '#c8a96e' },
}
