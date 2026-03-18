// ============================================================
// SmartPlayer — clean YouTube embed with custom controls
// - No YouTube UI (controls=0, no title, no share, no logo)
// - Custom play/pause/seek/volume/fullscreen overlay
// - Transparent div blocks right-click / context menu
// - Tracks genuine watch % (forward-skip doesn't count)
// - onEligible() fires at 80% real watch time
// ============================================================

import { useEffect, useRef, useState, useCallback } from 'react'

let ytApiLoaded = false
let ytApiCallbacks = []

function loadYTApi(cb) {
  if (typeof window === 'undefined') return
  if (window.YT && window.YT.Player) { cb(); return }
  ytApiCallbacks.push(cb)
  if (!ytApiLoaded) {
    ytApiLoaded = true
    window.onYouTubeIframeAPIReady = () => { ytApiCallbacks.forEach(fn => fn()); ytApiCallbacks = [] }
    const tag = document.createElement('script')
    tag.src = 'https://www.youtube.com/iframe_api'
    document.head.appendChild(tag)
  }
}

function formatTime(s) {
  if (!s || isNaN(s)) return '0:00'
  const m = Math.floor(s / 60)
  const sec = Math.floor(s % 60)
  return `${m}:${sec.toString().padStart(2, '0')}`
}

export default function SmartPlayer({ videoId, title, onEligible, alreadyWatched }) {
  const containerRef  = useRef(null)
  const wrapRef       = useRef(null)
  const playerRef     = useRef(null)
  const tickRef       = useRef(null)
  const watchedSegs   = useRef(new Set())
  const lastPos       = useRef(0)
  const durationRef   = useRef(0)
  const seekingRef    = useRef(false)
  const hideTimer     = useRef(null)

  const [playing, setPlaying]       = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration]     = useState(0)
  const [volume, setVolume]         = useState(100)
  const [muted, setMuted]           = useState(false)
  const [pct, setPct]               = useState(0)
  const [eligible, setEligible]     = useState(alreadyWatched || false)
  const [showControls, setShowControls] = useState(true)
  const [apiError, setApiError]     = useState(false)
  const [buffering, setBuffering]   = useState(false)
  const [started, setStarted]       = useState(false)   // has user clicked play at least once
  const eligibleFired = useRef(alreadyWatched || false)

  const isPlaceholder = !videoId || videoId === 'YOUTUBE_ID_HERE'

  // ── Watch % tracking ──────────────────────────────────────────────
  const updatePct = useCallback(() => {
    if (!durationRef.current) return
    const p = Math.min(100, Math.round(watchedSegs.current.size / durationRef.current * 100))
    setPct(p)
    if (p >= 80 && !eligibleFired.current) {
      eligibleFired.current = true
      setEligible(true)
      onEligible?.()
    }
  }, [onEligible])

  const tick = useCallback(() => {
    if (!playerRef.current) return
    try {
      const pos  = Math.floor(playerRef.current.getCurrentTime())
      const gap  = pos - lastPos.current
      if ((gap >= 0 && gap <= 5) || (gap < 0 && Math.abs(gap) <= 30)) {
        watchedSegs.current.add(pos)
      }
      lastPos.current = pos
      setCurrentTime(pos)
      updatePct()
    } catch (_) {}
  }, [updatePct])

  // ── Controls auto-hide ────────────────────────────────────────────
  function showControlsTemporarily() {
    setShowControls(true)
    clearTimeout(hideTimer.current)
    hideTimer.current = setTimeout(() => {
      if (playing) setShowControls(false)
    }, 3000)
  }

  // ── Player init ───────────────────────────────────────────────────
  useEffect(() => {
    if (isPlaceholder || typeof window === 'undefined') return
    loadYTApi(() => {
      if (!containerRef.current) return
      try {
        playerRef.current = new window.YT.Player(containerRef.current, {
          videoId,
          playerVars: {
            controls:         0,   // hide YouTube controls
            disablekb:        1,   // disable keyboard shortcuts (we handle them)
            rel:              0,   // no related videos
            modestbranding:   1,
            iv_load_policy:   3,   // no annotations
            fs:               0,   // disable YouTube fullscreen button (we have our own)
            playsinline:      1,
            cc_load_policy:   0,
            origin:           typeof window !== 'undefined' ? window.location.origin : '',
          },
          events: {
            onReady: (e) => {
              durationRef.current = e.target.getDuration()
              setDuration(e.target.getDuration())
              setVolume(e.target.getVolume())
            },
            onStateChange: (e) => {
              const S = window.YT.PlayerState
              if (e.data === S.PLAYING) {
                setPlaying(true); setBuffering(false); setStarted(true)
                lastPos.current = Math.floor(e.target.getCurrentTime())
                tickRef.current = setInterval(tick, 1000)
                showControlsTemporarily()
              } else if (e.data === S.BUFFERING) {
                setBuffering(true)
              } else {
                setPlaying(false); setBuffering(false)
                clearInterval(tickRef.current)
                setShowControls(true)
                if (e.data === S.ENDED) {
                  const dur = Math.floor(durationRef.current)
                  for (let i = Math.max(0, dur - 3); i <= dur; i++) watchedSegs.current.add(i)
                  updatePct()
                  setCurrentTime(dur)
                }
              }
            },
            onError: () => setApiError(true),
          },
        })
      } catch (_) { setApiError(true) }
    })
    return () => { clearInterval(tickRef.current); clearTimeout(hideTimer.current); try { playerRef.current?.destroy() } catch (_) {} }
  }, [videoId])

  // ── Controls handlers ─────────────────────────────────────────────
  function togglePlay() {
    if (!playerRef.current) return
    if (playing) playerRef.current.pauseVideo()
    else playerRef.current.playVideo()
    showControlsTemporarily()
  }

  function seek(e) {
    if (!playerRef.current || !durationRef.current) return
    const rect  = e.currentTarget.getBoundingClientRect()
    const ratio = (e.clientX - rect.left) / rect.width
    const t     = ratio * durationRef.current
    playerRef.current.seekTo(t, true)
    setCurrentTime(t)
    showControlsTemporarily()
  }

  function handleVolume(e) {
    const v = Number(e.target.value)
    setVolume(v); setMuted(v === 0)
    playerRef.current?.setVolume(v)
    if (v > 0) playerRef.current?.unMute()
    else playerRef.current?.mute()
    showControlsTemporarily()
  }

  function toggleMute() {
    if (!playerRef.current) return
    if (muted) { playerRef.current.unMute(); playerRef.current.setVolume(volume || 80); setMuted(false) }
    else { playerRef.current.mute(); setMuted(true) }
    showControlsTemporarily()
  }

  function toggleFullscreen() {
    if (!wrapRef.current) return
    if (!document.fullscreenElement) wrapRef.current.requestFullscreen?.()
    else document.exitFullscreen?.()
    showControlsTemporarily()
  }

  function skip(secs) {
    if (!playerRef.current) return
    const t = Math.max(0, Math.min(playerRef.current.getCurrentTime() + secs, durationRef.current))
    playerRef.current.seekTo(t, true)
    showControlsTemporarily()
  }

  // Keyboard shortcuts when player is focused
  function handleKeyDown(e) {
    const key = e.key
    if (key === ' ' || key === 'k') { e.preventDefault(); togglePlay() }
    if (key === 'ArrowRight') { e.preventDefault(); skip(10) }
    if (key === 'ArrowLeft')  { e.preventDefault(); skip(-10) }
    if (key === 'm') toggleMute()
    if (key === 'f') toggleFullscreen()
  }

  const seenPct = durationRef.current > 0 ? (currentTime / durationRef.current) * 100 : 0
  const watchedPct = durationRef.current > 0 ? (watchedSegs.current.size / durationRef.current) * 100 : 0

  return (
    <div style={{ marginBottom: 0 }}>
      {/* ── Player wrap ── */}
      <div
        ref={wrapRef}
        className={`sp-wrap ${showControls || !playing ? 'sp-wrap--controls' : ''}`}
        style={{ position: 'relative', width: '100%', paddingBottom: '56.25%', background: '#000', borderRadius: 'var(--radius-md)', overflow: 'hidden', cursor: 'pointer', outline: 'none' }}
        onMouseMove={showControlsTemporarily}
        onMouseLeave={() => playing && setShowControls(false)}
        onClick={togglePlay}
        onKeyDown={handleKeyDown}
        tabIndex={0}
        role="region"
        aria-label={`Video player: ${title || 'Lesson'}`}
      >
        {/* YouTube iframe container */}
        {!isPlaceholder && !apiError && (
          <div
            ref={containerRef}
            style={{ position: 'absolute', top: '-5%', left: '-5%', width: '110%', height: '110%', pointerEvents: 'none' }}
          />
        )}

        {/* Placeholder / error */}
        {(isPlaceholder || apiError) && (
          <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-3)', color: 'var(--text-3)', gap: 10 }}>
            <i className="ri-play-circle-line" style={{ fontSize: '3rem', opacity: 0.4 }} />
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.72rem', letterSpacing: '0.1em' }}>
              {isPlaceholder ? 'VIDEO COMING SOON' : 'VIDEO UNAVAILABLE'}
            </span>
          </div>
        )}

        {/* Transparent click-interceptor (blocks right-click, YT logo clicks etc) */}
        {!isPlaceholder && !apiError && (
          <div
            style={{ position: 'absolute', inset: 0, zIndex: 1 }}
            onContextMenu={e => e.preventDefault()}
          />
        )}

        {/* Big play button overlay (before first play) */}
        {!isPlaceholder && !apiError && !started && (
          <div style={{ position: 'absolute', inset: 0, zIndex: 2, display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
            <div style={{ width: 72, height: 72, borderRadius: '50%', background: 'rgba(200,169,110,0.92)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 24px rgba(0,0,0,0.5)' }}>
              <i className="ri-play-fill" style={{ fontSize: '2rem', color: '#000', marginLeft: 4 }} />
            </div>
          </div>
        )}

        {/* Buffering spinner */}
        {buffering && (
          <div style={{ position: 'absolute', inset: 0, zIndex: 3, display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
            <i className="ri-loader-4-line" style={{ fontSize: '2.2rem', color: 'var(--accent)', animation: 'spin 1s linear infinite' }} />
          </div>
        )}

        {/* ── Custom controls bar ── */}
        {!isPlaceholder && !apiError && (
          <div
            className={`sp-controls ${showControls || !playing ? 'sp-controls--visible' : ''}`}
            onClick={e => e.stopPropagation()}
          >
            {/* Progress bar */}
            <div className="sp-progress" onClick={seek} title="Seek">
              {/* Watched segments (green) */}
              <div className="sp-progress__watched" style={{ width: `${Math.min(watchedPct, 100)}%` }} />
              {/* Playback position (accent) */}
              <div className="sp-progress__position" style={{ width: `${Math.min(seenPct, 100)}%` }} />
              {/* Thumb */}
              <div className="sp-progress__thumb" style={{ left: `${Math.min(seenPct, 100)}%` }} />
            </div>

            <div className="sp-controls__row">
              {/* Left: play, skip, time */}
              <div className="sp-controls__left">
                <button className="sp-btn" onClick={togglePlay} aria-label={playing ? 'Pause' : 'Play'}>
                  <i className={playing ? 'ri-pause-fill' : 'ri-play-fill'} />
                </button>
                <button className="sp-btn sp-btn--sm" onClick={() => skip(-10)} aria-label="Back 10s" title="−10s">
                  <i className="ri-replay-10-line" />
                </button>
                <button className="sp-btn sp-btn--sm" onClick={() => skip(10)} aria-label="Forward 10s" title="+10s">
                  <i className="ri-forward-10-line" />
                </button>
                <span className="sp-time">{formatTime(currentTime)} / {formatTime(duration)}</span>
              </div>

              {/* Right: volume, fullscreen */}
              <div className="sp-controls__right">
                <button className="sp-btn sp-btn--sm" onClick={toggleMute} aria-label="Toggle mute">
                  <i className={muted || volume === 0 ? 'ri-volume-mute-fill' : volume < 50 ? 'ri-volume-down-fill' : 'ri-volume-up-fill'} />
                </button>
                <input
                  className="sp-volume"
                  type="range" min="0" max="100" value={muted ? 0 : volume}
                  onChange={handleVolume}
                  aria-label="Volume"
                />
                <button className="sp-btn sp-btn--sm" onClick={toggleFullscreen} aria-label="Fullscreen">
                  <i className="ri-fullscreen-line" />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── Watch progress indicator ── */}
      {!isPlaceholder && !apiError && (
        <div className="watch-progress-wrap">
          <div className="watch-progress-bar">
            <div className="watch-progress-bar__fill" style={{ width: `${pct}%` }} />
          </div>
          <div className={`watch-progress-label ${eligible ? 'eligible' : ''}`}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              {eligible
                ? <><i className="ri-checkbox-circle-line" /> Ready to mark complete</>
                : alreadyWatched
                  ? <><i className="ri-checkbox-circle-fill" style={{ color: 'var(--success)' }} /> Already watched</>
                  : <><i className="ri-time-line" /> Watch 80% to mark complete</>
              }
            </span>
            <span>{pct}%</span>
          </div>
        </div>
      )}
    </div>
  )
}
