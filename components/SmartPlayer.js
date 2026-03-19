// ============================================================
// SmartPlayer, YouTube IFrame API, native player UI
// - Standard YouTube player (no cropping, no custom controls)
// - Tracks genuine unique seconds watched (forward-skip proof)
// - Auto-marks as watched at 80% real watch time
// - Saves progress percentage to userStore every 5 seconds
// - Calls onAutoWatched() when 80% threshold is hit
// - Calls onProgress(pct) every second so parent can show live bar
// ============================================================

import { useEffect, useRef, useCallback } from 'react'
import { saveWatchProgress, setLastVisited } from '../lib/userStore'

// ── YouTube IFrame API loader ─────────────────────────────────────────
// Additive callback list — multiple instances / HMR re-runs never
// overwrite each other's onYouTubeIframeAPIReady handler.
let ytApiLoaded = false
const ytApiCallbacks = []

function loadYTApi(cb) {
  if (typeof window === 'undefined') return
  if (window.YT && window.YT.Player) { cb(); return }
  ytApiCallbacks.push(cb)
  if (!ytApiLoaded) {
    ytApiLoaded = true
    const prev = window.onYouTubeIframeAPIReady
    window.onYouTubeIframeAPIReady = () => {
      if (typeof prev === 'function') prev()
      ytApiCallbacks.splice(0).forEach(fn => fn())
    }
    const tag = document.createElement('script')
    tag.src = 'https://www.youtube.com/iframe_api'
    document.head.appendChild(tag)
  }
}

export default function SmartPlayer({
  videoId,
  lessonKey,        // "programId/subjectId/topicId/lessonId" for saving progress
  savedProgress,    // 0-100, previously saved percentage to resume from
  onAutoWatched,    // called when 80% genuine watch time reached
  onProgress,       // NEW: called with (pct 0-100) every second — for live UI bar
  alreadyWatched,
}) {
  const containerRef  = useRef(null)
  const playerRef     = useRef(null)
  const tickRef       = useRef(null)
  const saveTickRef   = useRef(null)
  const watchedSegs   = useRef(new Set())
  const lastPos       = useRef(0)
  const durationRef   = useRef(0)
  const autoFiredRef  = useRef(alreadyWatched || false)
  const hasStartedRef = useRef(false)

  // Keep autoFired in sync when parent toggles alreadyWatched (mark/unmark)
  useEffect(() => {
    autoFiredRef.current = alreadyWatched || false
  }, [alreadyWatched])

  // Stable refs for every prop-callback so closures are never stale
  const onAutoWatchedRef = useRef(onAutoWatched)
  const onProgressRef    = useRef(onProgress)
  const lessonKeyRef     = useRef(lessonKey)
  useEffect(() => { onAutoWatchedRef.current = onAutoWatched }, [onAutoWatched])
  useEffect(() => { onProgressRef.current    = onProgress    }, [onProgress])
  useEffect(() => { lessonKeyRef.current     = lessonKey     }, [lessonKey])

  const computePct = useCallback(() => {
    if (!durationRef.current) return 0
    return Math.min(100, Math.round(watchedSegs.current.size / durationRef.current * 100))
  }, [])

  const tick = useCallback(() => {
    if (!playerRef.current) return
    try {
      const pos = Math.floor(playerRef.current.getCurrentTime())
      const gap = pos - lastPos.current
      // Count naturally played seconds; forgive small rewinds (<=30s)
      if ((gap >= 0 && gap <= 5) || (gap < 0 && Math.abs(gap) <= 30)) {
        watchedSegs.current.add(pos)
      }
      lastPos.current = pos

      // Push live genuine-watch % to parent every tick
      const pct = computePct()
      onProgressRef.current?.(pct)

      // Auto-mark at 80%
      if (!autoFiredRef.current && pct >= 80) {
        autoFiredRef.current = true
        onAutoWatchedRef.current?.()
      }
    } catch (_) {}
  }, [computePct])

  // Save progress every 5s — uses genuine watch %, not raw scrub position
  const saveTick = useCallback(() => {
    const key = lessonKeyRef.current
    if (!playerRef.current || !key || !durationRef.current) return
    try {
      const pct = computePct()
      const pos = playerRef.current.getCurrentTime()
      saveWatchProgress(key, pct, pos)
    } catch (_) {}
  }, [computePct])

  useEffect(() => {
    const isPlaceholder = !videoId || videoId === 'YOUTUBE_ID_HERE'
    if (isPlaceholder || typeof window === 'undefined') return

    loadYTApi(() => {
      if (!containerRef.current) return
      try {
        playerRef.current = new window.YT.Player(containerRef.current, {
          videoId,
          playerVars: {
            rel:            0,
            modestbranding: 1,
            iv_load_policy: 3,
            playsinline:    1,
            showinfo:       0,
            fs:             1,   // FIXED: was 0, disabled fullscreen with no replacement
            cc_load_policy: 0,
            disablekb:      0,
            controls:       1,
            origin: window.location.origin,
          },
          events: {
            onReady: (e) => {
              durationRef.current = e.target.getDuration()
              if (savedProgress && savedProgress > 0 && savedProgress < 95 && !alreadyWatched) {
                const seekTo = (savedProgress / 100) * durationRef.current
                e.target.seekTo(seekTo, true)
                e.target.pauseVideo()
              }
            },
            onStateChange: (e) => {
              const S = window.YT.PlayerState
              if (e.data === S.PLAYING) {
                lastPos.current     = Math.floor(e.target.getCurrentTime())
                tickRef.current     = setInterval(tick, 1000)
                saveTickRef.current = setInterval(saveTick, 5000)
                if (!hasStartedRef.current && lessonKeyRef.current) {
                  hasStartedRef.current = true
                  const parts = lessonKeyRef.current.split('/')
                  if (parts.length === 4) setLastVisited(...parts)
                }
              } else {
                clearInterval(tickRef.current)
                clearInterval(saveTickRef.current)
                if (e.data === S.ENDED && !autoFiredRef.current) {
                  const dur = Math.floor(durationRef.current)
                  for (let i = Math.max(0, dur - 3); i <= dur; i++) watchedSegs.current.add(i)
                  const pct = computePct()
                  onProgressRef.current?.(pct)
                  if (pct >= 80) {
                    autoFiredRef.current = true
                    onAutoWatchedRef.current?.()
                  }
                }
                saveTick()
              }
            },
          },
        })
      } catch (_) {}
    })

    return () => {
      clearInterval(tickRef.current)
      clearInterval(saveTickRef.current)
      saveTick()
      try { playerRef.current?.destroy() } catch (_) {}
    }
  }, [videoId]) // eslint-disable-line react-hooks/exhaustive-deps
  // videoId is the correct dep — player rebuilds only on video change.
  // All other changing values are accessed via stable refs.

  const isPlaceholder = !videoId || videoId === 'YOUTUBE_ID_HERE'

  return (
    <div className="video-wrap" role="region" aria-label="Video player">
      {isPlaceholder ? (
        <div className="video-placeholder">
          <i className="ri-play-circle-line" aria-hidden="true" />
          <span>Video coming soon</span>
        </div>
      ) : (
        <div
          ref={containerRef}
          style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }}
        />
      )}
    </div>
  )
}
