// ============================================================
// SmartPlayer, YouTube IFrame API, native player UI
// - Standard YouTube player (no cropping, no custom controls)
// - Tracks genuine unique seconds watched (forward-skip proof)
// - Auto-marks as watched at 80% real watch time
// - Saves progress percentage to userStore every 5 seconds
// - Calls onAutoWatched() when 80% threshold is hit
// ============================================================

import { useEffect, useRef, useCallback } from 'react'
import { saveWatchProgress, setLastVisited } from '../lib/userStore'

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

export default function SmartPlayer({
  videoId,
  lessonKey,        // "programId/subjectId/topicId/lessonId" for saving progress
  savedProgress,    // 0-100, previously saved percentage to resume from
  onAutoWatched,    // called when 80% genuine watch time reached
  alreadyWatched,
}) {
  const containerRef  = useRef(null)
  const playerRef     = useRef(null)
  const tickRef       = useRef(null)
  const saveTickRef   = useRef(null)
  const watchedSegs   = useRef(new Set())
  const lastPos       = useRef(0)
  const durationRef   = useRef(0)
  const autoFired     = useRef(alreadyWatched || false)

  const hasStartedRef = useRef(false)

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

      // Auto-mark at 80%
      if (!autoFired.current) {
        const pct = computePct()
        if (pct >= 80) {
          autoFired.current = true
          onAutoWatched?.()
        }
      }
    } catch (_) {}
  }, [computePct, onAutoWatched])

  // Save progress percentage to store every 5 seconds
  const saveTick = useCallback(() => {
    if (!playerRef.current || !lessonKey || !durationRef.current) return
    try {
      const pos = playerRef.current.getCurrentTime()
      const pct = Math.round((pos / durationRef.current) * 100)
      saveWatchProgress(lessonKey, pct, pos)
    } catch (_) {}
  }, [lessonKey])

  useEffect(() => {
    const isPlaceholder = !videoId || videoId === 'YOUTUBE_ID_HERE'
    if (isPlaceholder || typeof window === 'undefined') return

    loadYTApi(() => {
      if (!containerRef.current) return
      try {
        playerRef.current = new window.YT.Player(containerRef.current, {
          videoId,
          playerVars: {
            rel:            0,   // no related videos at end
            modestbranding: 1,   // minimal YouTube logo
            iv_load_policy: 3,   // no annotations
            playsinline:    1,   // inline on iOS
            showinfo:       0,   // hide video title bar (deprecated but still works)
            fs:             0,   // hide fullscreen button — we provide our own layout
            cc_load_policy: 0,   // captions off by default
            disablekb:      0,   // keep keyboard shortcuts (seek, space)
            controls:       1,   // show native controls (play/pause/seek/volume only)
            origin: window.location.origin,
          },
          events: {
            onReady: (e) => {
              durationRef.current = e.target.getDuration()

              // Resume from saved position if available and not already fully watched
              if (savedProgress && savedProgress > 0 && savedProgress < 95 && !alreadyWatched) {
                const seekTo = (savedProgress / 100) * durationRef.current
                e.target.seekTo(seekTo, true)
                e.target.pauseVideo()
              }
            },
            onStateChange: (e) => {
              const S = window.YT.PlayerState
              if (e.data === S.PLAYING) {
                lastPos.current = Math.floor(e.target.getCurrentTime())
                tickRef.current     = setInterval(tick, 1000)
                saveTickRef.current = setInterval(saveTick, 5000)
                // Mark this lesson as the last visited immediately on first play
                if (!hasStartedRef.current && lessonKey) {
                  hasStartedRef.current = true
                  const parts = lessonKey.split('/')
                  if (parts.length === 4) setLastVisited(...parts)
                }
              } else {
                clearInterval(tickRef.current)
                clearInterval(saveTickRef.current)
                if (e.data === S.ENDED && !autoFired.current) {
                  // Mark the last few seconds
                  const dur = Math.floor(durationRef.current)
                  for (let i = Math.max(0, dur - 3); i <= dur; i++) watchedSegs.current.add(i)
                  if (computePct() >= 80) {
                    autoFired.current = true
                    onAutoWatched?.()
                  }
                }
                saveTick() // Save position on pause/end
              }
            },
          },
        })
      } catch (_) {}
    })

    return () => {
      clearInterval(tickRef.current)
      clearInterval(saveTickRef.current)
      saveTick() // Save on unmount (navigation)
      try { playerRef.current?.destroy() } catch (_) {}
    }
  }, [videoId])

  const isPlaceholder = !videoId || videoId === 'YOUTUBE_ID_HERE'

  return (
    <div className="video-wrap">
      {isPlaceholder ? (
        <div className="video-placeholder">
          <i className="ri-play-circle-line" />
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
