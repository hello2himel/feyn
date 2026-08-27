// ============================================================
// components/HandleField.js — handle input with live availability
//
// Debounced ✓/✗ against /api/handles/check (spec §8.3). Validation
// runs locally first so obviously-bad input never costs a round-trip,
// and the local validator is the same rule set the database enforces
// (lib/handles.js mirrors validate_handle()).
//
// Reports state upward via onValidityChange so the submit button can
// stay disabled until the handle is known-good.
// ============================================================

import { useState, useEffect, useRef } from 'react'
import { validateHandle, normalizeHandle } from '../lib/handles'
import { checkHandle } from '../lib/api'

const DEBOUNCE_MS = 400

export default function HandleField({
  namespace,
  value,
  onChange,
  onValidityChange,
  label = 'Handle',
  prefix,
  hint,
  disabled = false,
}) {
  const [state, setState] = useState('idle') // idle | checking | ok | bad
  const [message, setMessage] = useState('')
  const seq = useRef(0)
  const notify = useRef(onValidityChange)
  notify.current = onValidityChange

  useEffect(() => {
    const handle = normalizeHandle(value)
    if (!handle) {
      setState('idle')
      setMessage('')
      notify.current?.(false)
      return
    }

    const localReason = validateHandle(handle)
    if (localReason) {
      setState('bad')
      setMessage(localReason)
      notify.current?.(false)
      return
    }

    setState('checking')
    setMessage('Checking availability…')
    notify.current?.(false)

    const mySeq = ++seq.current
    const t = setTimeout(async () => {
      try {
        const res = await checkHandle(handle, namespace)
        if (mySeq !== seq.current) return // a newer keystroke superseded this
        // available === null means Supabase is not configured yet (fresh
        // clone). Don't block the form on an unanswerable question.
        const ok = res.available === null || res.available === true
        setState(ok ? 'ok' : 'bad')
        setMessage(ok ? (res.available === null ? 'Format looks good.' : 'Available.') : (res.reason || 'Not available.'))
        notify.current?.(ok)
      } catch (e) {
        if (mySeq !== seq.current) return
        setState('bad')
        setMessage(e.message || 'Could not check availability.')
        notify.current?.(false)
      }
    }, DEBOUNCE_MS)

    return () => clearTimeout(t)
  }, [value, namespace])

  const icon = { checking: 'ri-loader-4-line', ok: 'ri-check-line', bad: 'ri-close-line' }[state]
  const color = state === 'ok' ? 'var(--accent)' : state === 'bad' ? 'var(--danger)' : 'var(--text-3)'
  const id = `handle-${namespace}`

  return (
    <div className="auth-field">
      <label className="auth-field__label" htmlFor={id}>
        {label} <span className="auth-field__req">*</span>
      </label>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        {prefix && (
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem', color: 'var(--text-3)' }}>
            {prefix}
          </span>
        )}
        <input
          id={id}
          className={`auth-input${state === 'bad' ? ' auth-input--err' : ''}`}
          value={value}
          disabled={disabled}
          onChange={e => onChange(e.target.value.toLowerCase())}
          placeholder="your-handle"
          autoComplete="off"
          spellCheck={false}
          aria-describedby={`${id}-msg`}
          aria-invalid={state === 'bad'}
          style={{ flex: 1, fontFamily: 'var(--font-mono)' }}
        />
        {icon && <i className={icon} style={{ color }} aria-hidden="true" />}
      </div>
      <p
        id={`${id}-msg`}
        role="status"
        aria-live="polite"
        style={{ fontSize: '0.72rem', marginTop: 6, color }}
      >
        {message || hint || '3–30 characters. Lowercase letters, numbers, hyphens, underscores.'}
      </p>
    </div>
  )
}
