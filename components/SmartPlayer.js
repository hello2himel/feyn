// ============================================================
// SmartPlayer — YouTube IFrame API with genuine watch tracking
// Rules:
//  - Tracks total UNIQUE seconds watched (not position)
//  - Scrubbing forward doesn't count unseen time
//  - Small gaps/seeks allowed (≤30s forgiven as navigation)
//  - Fires onEligible() when ≥80% unique seconds watched
//  - Does NOT auto-mark; user still clicks the button
// ============================================================

import { useEffect, useRef, useState, useCallback } from 'react'

// Load YouTube IFrame API once globally
let ytApiLoaded = false
let ytApiCallbacks = []

function loadYTApi(cb) {
  if (typeof window === 'undefined') return
  if (window.YT && window.YT.Player) { cb(); return }
  ytApiCallbacks.push(cb)
  if (!ytApiLoaded) {
    ytApiLoaded = true
    window.onYouTubeIframeAPIReady = () => {
      ytApiCallbacks.forEach(fn => fn())
      ytApiCallbacks = []
    }
    const tag = document.createElement('script')
    tag.src = 'https://www.youtube.com/iframe_api'
    document.head.appendChild(tag)
  }
}

export default function SmartPlayer({ videoId, title, onEligible, alreadyWatched }) {
  const containerRef = useRef(null)
  const playerRef    = useRef(null)
  const tickRef      = useRef(null)          // interval id
  const watchedSegs  = useRef(new Set())     // set of integer seconds watched
  const lastPos      = useRef(0)             // last known position
  const durationRef  = useRef(0)
  const [pct, setPct]           = useState(0)
  const [eligible, setEligible] = useState(alreadyWatched || false)
  const [playerReady, setPlayerReady] = useState(false)
  const [apiError, setApiError]       = useState(false)
  const eligibleFired = useRef(alreadyWatched || false)

  const updatePct = useCallback(() => {
    if (!durationRef.current) return
    const ratio = watchedSegs.current.size / durationRef.current
    const p = Math.min(100, Math.round(ratio * 100))
    setPct(p)
    if (p >= 80 && !eligibleFired.current) {
      eligibleFired.current = true
      setEligible(true)
      onEligible && onEligible()
    }
  }, [onEligible])

  // Tick: called every second while playing
  const tick = useCallback(() => {
    if (!playerRef.current) return
    try {
      const pos = Math.floor(playerRef.current.getCurrentTime())
      // Allow small backward/forward seeks (≤30s gap = normal nav)
      // Only count if within 30s of last known position OR moving forward naturally
      const gap = pos - lastPos.current
      if (gap >= 0 && gap <= 5) {
        // Natural playback — count this second
        watchedSegs.current.add(pos)
      } else if (gap < 0 && Math.abs(gap) <= 30) {
        // Small rewind — fine, count current position
        watchedSegs.current.add(pos)
      }
      // Large forward skip (>5s) or large backward skip (>30s) = don't count
      lastPos.current = pos
      updatePct()
    } catch (_) {}
  }, [updatePct])

  useEffect(() => {
    if (!videoId || videoId === 'YOUTUBE_ID_HERE') return
    if (typeof window === 'undefined') return

    loadYTApi(() => {
      if (!containerRef.current) return
      try {
        playerRef.current = new window.YT.Player(containerRef.current, {
          videoId,
          playerVars: { rel: 0, modestbranding: 1, iv_load_policy: 3 },
          events: {
            onReady: (e) => {
              durationRef.current = e.target.getDuration()
              setPlayerReady(true)
            },
            onStateChange: (e) => {
              const S = window.YT.PlayerState
              if (e.data === S.PLAYING) {
                lastPos.current = Math.floor(e.target.getCurrentTime())
                tickRef.current = setInterval(tick, 1000)
              } else {
                clearInterval(tickRef.current)
                if (e.data === S.ENDED) {
                  // Count last few seconds
                  const dur = Math.floor(durationRef.current)
                  for (let i = Math.max(0, dur - 3); i <= dur; i++) {
                    watchedSegs.current.add(i)
                  }
                  updatePct()
                }
              }
            },
            onError: () => setApiError(true),
          },
        })
      } catch (_) {
        setApiError(true)
      }
    })

    return () => {
      clearInterval(tickRef.current)
      try { playerRef.current?.destroy() } catch (_) {}
    }
  }, [videoId, tick, updatePct])

  const isPlaceholder = !videoId || videoId === 'YOUTUBE_ID_HERE'

  return (
    <div>
      {/* Video container */}
      <div className="video-wrap">
        {isPlaceholder || apiError ? (
          <div className="video-placeholder">
            <i className="ri-play-circle-line" />
            <span>{isPlaceholder ? 'Video coming soon' : 'Video unavailable'}</span>
          </div>
        ) : (
          <div ref={containerRef} style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }} />
        )}
      </div>

      {/* Watch progress */}
      {!isPlaceholder && !apiError && (
        <div className="watch-progress-wrap">
          <div className="watch-progress-bar">
            <div className="watch-progress-bar__fill" style={{ width: `${pct}%` }} />
          </div>
          <div className={`watch-progress-label ${eligible ? 'eligible' : ''}`}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              {eligible
                ? <><i className="ri-checkbox-circle-line" /> Watched enough — you can mark this as complete</>
                : alreadyWatched
                  ? <><i className="ri-checkbox-circle-fill" style={{ color: 'var(--success)' }} /> Already marked as watched</>
                  : <><i className="ri-time-line" /> Watch at least 80% to mark complete</>
              }
            </span>
            <span>{pct}%</span>
          </div>
        </div>
      )}
    </div>
  )
}
