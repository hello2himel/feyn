// ============================================================
// components/VideoField.js — paste-a-link video attach control
//
// REPLACES two adjacent text inputs in the old lesson form: a raw
// "Video URL or YouTube ID" box and a hand-typed "Duration (m:ss)"
// box. That design had three problems:
//   · nothing verified the id, so a typo shipped a broken lesson
//   · the mentor had to look up the runtime themselves and type it
//     in a format they had to guess
//   · there was no way to tell, from the editor, which video was
//     actually attached
//
// Now: paste anything YouTube-shaped, and this resolves it through
// /api/video-meta, shows the real thumbnail, title and channel, and
// reads the duration straight off a hidden player so nobody types a
// timestamp again. Duration stays overridable, because a mentor may
// deliberately want a shorter "expected watch time".
//
// Degrades honestly: if the lookup fails the field still holds the
// value and says so, rather than blocking the save.
// ============================================================

import { useState, useEffect, useRef, useCallback } from 'react'
import { fetchVideoMeta } from '../lib/api'
import { formatDuration, parseDuration } from '../data/courseHelpers'

// Loads the YT IFrame API once per page. SmartPlayer has its own copy of
// this because it is code-split and may never mount alongside us.
let ytLoading = false
const ytWaiters = []
function loadYT(cb) {
  if (typeof window === 'undefined') return
  if (window.YT?.Player) return cb()
  ytWaiters.push(cb)
  if (ytLoading) return
  ytLoading = true
  const prev = window.onYouTubeIframeAPIReady
  window.onYouTubeIframeAPIReady = () => {
    if (typeof prev === 'function') prev()
    ytWaiters.splice(0).forEach(fn => fn())
  }
  const tag = document.createElement('script')
  tag.src = 'https://www.youtube.com/iframe_api'
  document.head.appendChild(tag)
}

export default function VideoField({
  value,              // current video_url as stored
  durationSeconds,    // current duration_seconds as stored
  onChange,           // (videoUrl) => void
  onDuration,         // (seconds|null) => void
  label = 'Lesson video',
}) {
  const [raw, setRaw] = useState(value || '')
  const [meta, setMeta] = useState(null)
  const [status, setStatus] = useState('idle') // idle | checking | ok | warn
  const [message, setMessage] = useState('')
  const [manualDuration, setManualDuration] = useState(false)
  const probeRef = useRef(null)
  const probeHostRef = useRef(null)

  // Reset when a different lesson is selected.
  useEffect(() => {
    setRaw(value || '')
    setMeta(null)
    setStatus('idle')
    setMessage('')
    setManualDuration(false)
  }, [value])

  // Reads runtime off a muted, never-shown player. This is the only
  // reliable public way to get a duration without an API key.
  const probeDuration = useCallback((videoId) => {
    if (!videoId || !probeHostRef.current) return
    loadYT(() => {
      try {
        probeRef.current?.destroy?.()
        probeRef.current = new window.YT.Player(probeHostRef.current, {
          videoId,
          playerVars: { controls: 0, disablekb: 1 },
          events: {
            onReady: (e) => {
              const secs = Math.round(e.target.getDuration?.() || 0)
              if (secs > 0) {
                onDuration(secs)
                setMessage(m => m || `Runtime detected: ${formatDuration(secs).replace('~', '')}`)
              }
            },
          },
        })
      } catch {
        // Duration stays whatever it was; the manual override remains.
      }
    })
  }, [onDuration])

  useEffect(() => () => { try { probeRef.current?.destroy?.() } catch {} }, [])

  async function verify(next) {
    const v = String(next ?? raw).trim()
    onChange(v || null)
    if (!v) {
      setMeta(null)
      setStatus('idle')
      setMessage('')
      return
    }
    setStatus('checking')
    setMessage('')
    const m = await fetchVideoMeta(v)
    if (m.error) {
      setMeta(m.videoId ? { videoId: m.videoId } : null)
      setStatus('warn')
      setMessage(m.error)
      if (m.videoId) probeDuration(m.videoId)
      return
    }
    setMeta(m)
    setStatus('ok')
    // Store the canonical watch URL so the row is unambiguous later.
    onChange(m.canonicalUrl)
    setRaw(m.canonicalUrl)
    probeDuration(m.videoId)
  }

  const hasDuration = Number(durationSeconds) > 0

  return (
    <div className="vf">
      <label className="vf__label" htmlFor="vf-input">{label}</label>

      <div className="vf__row">
        <input
          id="vf-input"
          className="vf__input"
          value={raw}
          placeholder="Paste a YouTube link — youtube.com/watch?v=…"
          onChange={e => setRaw(e.target.value)}
          onBlur={() => raw.trim() !== (value || '').trim() && verify()}
          onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); verify() } }}
          spellCheck={false}
        />
        <button
          type="button"
          className="vf__verify"
          onClick={() => verify()}
          disabled={!raw.trim() || status === 'checking'}
        >
          {status === 'checking'
            ? <><i className="ri-loader-4-line vf__spin" /> Checking</>
            : <><i className="ri-search-eye-line" /> Check</>}
        </button>
      </div>

      {/* Hidden duration probe. Kept in the DOM so the player has a host. */}
      <div className="vf__probe" aria-hidden="true"><div ref={probeHostRef} /></div>

      {/* Confirmation card — the whole point: see what you attached. */}
      {meta?.videoId && (
        <div className={`vf__preview${status === 'warn' ? ' vf__preview--warn' : ''}`}>
          <span className="vf__thumb">
            <img
              src={meta.thumbnail || `https://i.ytimg.com/vi/${meta.videoId}/mqdefault.jpg`}
              alt=""
            />
            <i className="ri-play-fill vf__thumb-play" />
          </span>
          <div className="vf__preview-body">
            <p className="vf__preview-title">{meta.title || 'Video attached'}</p>
            {meta.author && <p className="vf__preview-author"><i className="ri-user-line" /> {meta.author}</p>}
            <p className="vf__preview-meta">
              <span className="vf__id">{meta.videoId}</span>
              {hasDuration && <span><i className="ri-time-line" /> {formatDuration(durationSeconds).replace('~', '')}</span>}
            </p>
          </div>
          <a
            className="vf__open"
            href={`https://www.youtube.com/watch?v=${meta.videoId}`}
            target="_blank"
            rel="noopener noreferrer"
            title="Open on YouTube"
          >
            <i className="ri-external-link-line" />
          </a>
        </div>
      )}

      {message && (
        <p className={`vf__msg vf__msg--${status}`}>
          <i className={status === 'warn' ? 'ri-alert-line' : 'ri-checkbox-circle-line'} /> {message}
        </p>
      )}

      {/* Duration is derived by default and only editable on request, so
          the common path involves typing nothing at all. */}
      <div className="vf__duration">
        {manualDuration ? (
          <>
            <label className="vf__dur-label" htmlFor="vf-dur">Expected watch time</label>
            <input
              id="vf-dur"
              className="vf__dur-input"
              value={hasDuration ? formatDuration(durationSeconds).replace('~', '') : ''}
              placeholder="m:ss"
              onChange={e => onDuration(parseDuration(e.target.value))}
            />
            <button type="button" className="vf__dur-toggle" onClick={() => setManualDuration(false)}>
              Use the video&rsquo;s runtime
            </button>
          </>
        ) : (
          <p className="vf__dur-note">
            {hasDuration
              ? <><i className="ri-time-line" /> Runtime {formatDuration(durationSeconds).replace('~', '')}, read from the video.</>
              : <><i className="ri-time-line" /> Runtime is read from the video automatically.</>}
            <button type="button" className="vf__dur-toggle" onClick={() => setManualDuration(true)}>
              Set it manually
            </button>
          </p>
        )}
      </div>
    </div>
  )
}
