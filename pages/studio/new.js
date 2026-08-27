// ============================================================
// pages/studio/new.js — guided course creation
//
// REPLACES /panels/editor?publisher=<uuid>, which dropped a mentor into
// the full editor with an empty subject scaffold: eleven controls, a
// status dropdown offering "published" before any content existed, and
// no indication of what to do first. Slug and program were required but
// unexplained.
//
// This asks four questions, one screen at a time, in the order a person
// actually decides them, and explains the consequence of each. It
// creates the row only on the final step, so an abandoned wizard leaves
// nothing behind — the old flow could leave an empty draft course.
//
// Deliberately does NOT ask for: status (new courses are always drafts),
// certificates, or cover images. Those belong in the builder once there
// is something to publish.
// ============================================================

import Head from 'next/head'
import Link from 'next/link'
import { useRouter } from 'next/router'
import { useState, useEffect, useCallback } from 'react'
import { Nav, Footer, useAuth } from '../../components/Layout'
import IconPicker from '../../components/IconPicker'
import { usePermissions } from '../../lib/usePermissions'
import { approvedMemberships, canCreateSubject } from '../../lib/permissions'
import { authedClient } from '../../lib/api'

function slugify(str) {
  return String(str || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 60)
}

const STEPS = [
  { key: 'where', label: 'Where it lives' },
  { key: 'what', label: 'What it teaches' },
  { key: 'look', label: 'How it looks' },
  { key: 'review', label: 'Review' },
]

export default function NewCourse() {
  const router = useRouter()
  const { signedIn, setShowAuth, mounted } = useAuth()
  const { perms, loading } = usePermissions()

  const [step, setStep] = useState(0)
  const [publishers, setPublishers] = useState([])
  const [programs, setPrograms] = useState([])
  const [slugTaken, setSlugTaken] = useState(false)

  const [form, setForm] = useState({
    publisher_id: '',
    program_id: '',
    name: '',
    slug: '',
    description: '',
    icon: 'ri-book-open-line',
    has_certificate: false,
  })
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const set = (patch) => setForm(f => ({ ...f, ...patch }))

  // Publishers this caller may actually create under.
  useEffect(() => {
    if (loading) return
    let alive = true
    ;(async () => {
      const sb = await authedClient()
      if (!sb) return

      const { data: progs } = await sb.from('programs').select('id, name, slug, kind').order('sort_order')
      if (!alive) return
      setPrograms(progs || [])

      if (perms.isAppAdmin) {
        const { data } = await sb
          .from('publishers')
          .select('id, name, slug, type')
          .eq('status', 'approved')
          .order('name')
        if (alive) setPublishers(data || [])
      } else {
        setPublishers(
          approvedMemberships(perms)
            .filter(m => canCreateSubject(perms, m.publisher_id))
            .map(m => ({
              id: m.publisher_id,
              name: m.publishers?.name,
              slug: m.publishers?.slug,
              type: m.publishers?.type,
            }))
        )
      }
    })()
    return () => { alive = false }
  }, [perms, loading])

  // Preselect the only option, and skip the step entirely when there is
  // no choice to make — a solo mentor should never see a picker with one
  // item in it.
  useEffect(() => {
    if (publishers.length === 1 && !form.publisher_id) {
      set({ publisher_id: publishers[0].id })
    }
  }, [publishers]) // eslint-disable-line react-hooks/exhaustive-deps

  // Slug uniqueness is (program_id, slug) in the schema, so the check
  // must include the program. Doing it here turns a raw Postgres
  // constraint error into a sentence before submission.
  const checkSlug = useCallback(async () => {
    if (!form.program_id || !form.slug) return setSlugTaken(false)
    const sb = await authedClient()
    if (!sb) return
    const { data } = await sb
      .from('subjects')
      .select('id')
      .eq('program_id', form.program_id)
      .eq('slug', form.slug)
      .maybeSingle()
    setSlugTaken(!!data)
  }, [form.program_id, form.slug])

  useEffect(() => {
    const t = setTimeout(checkSlug, 350)
    return () => clearTimeout(t)
  }, [checkSlug])

  async function create() {
    setBusy(true)
    setError('')
    try {
      const sb = await authedClient()
      if (!sb) throw new Error('Sign in to do that.')
      const { data, error: e } = await sb
        .from('subjects')
        .insert({
          publisher_id: form.publisher_id,
          program_id: form.program_id,
          name: form.name.trim(),
          slug: form.slug || slugify(form.name),
          description: form.description.trim() || null,
          icon: form.icon || null,
          has_certificate: !!form.has_certificate,
          status: 'draft', // never anything else at creation
        })
        .select('id')
        .single()
      if (e) throw new Error(e.message)
      router.replace(`/studio/course/${data.id}?created=1`)
    } catch (e) {
      setError(e.message)
      setBusy(false)
    }
  }

  if (!mounted) return null
  if (!signedIn) {
    return (
      <Shell>
        <p className="empty-state">Sign in to create a course.</p>
        <button className="btn btn--accent" onClick={() => setShowAuth(true)}>
          <i className="ri-login-circle-line" /> Sign in
        </button>
      </Shell>
    )
  }
  if (loading) return <Shell><p className="empty-state">Loading…</p></Shell>

  if (publishers.length === 0) {
    return (
      <Shell>
        <div className="studio-gate">
          <i className="ri-lock-line studio-gate__icon" />
          <p className="studio-gate__text">You cannot create courses anywhere yet.</p>
          <p className="studio-gate__sub">
            You need to be an editor or admin in at least one publisher. Approved mentors always
            get their own.
          </p>
          <Link href="/studio" className="btn btn--ghost btn--sm"><i className="ri-arrow-left-line" /> Back to studio</Link>
        </div>
      </Shell>
    )
  }

  // With one publisher there is no "where" decision to make.
  const steps = publishers.length > 1 ? STEPS : STEPS.slice(1)
  const current = steps[step]

  const canAdvance = {
    where: !!form.publisher_id,
    what: !!form.name.trim() && !!form.program_id && !!form.slug && !slugTaken,
    look: true,
    review: !!form.name.trim() && !!form.program_id && !!form.publisher_id,
  }[current.key]

  const publisher = publishers.find(p => p.id === form.publisher_id)
  const program = programs.find(p => p.id === form.program_id)

  return (
    <Shell>
      {/* Step rail */}
      <ol className="wiz-rail">
        {steps.map((s, i) => (
          <li key={s.key} className={`wiz-rail__step${i === step ? ' is-current' : ''}${i < step ? ' is-done' : ''}`}>
            <span className="wiz-rail__dot">{i < step ? <i className="ri-check-line" /> : i + 1}</span>
            <span className="wiz-rail__label">{s.label}</span>
          </li>
        ))}
      </ol>

      {error && <p className="auth-field__err" style={{ marginBottom: 16 }}><i className="ri-error-warning-line" /> {error}</p>}

      <div className="wiz-panel">
        {current.key === 'where' && (
          <>
            <h2 className="wiz-panel__title">Who publishes this course?</h2>
            <p className="wiz-panel__lede">
              This decides whose name is on it and who else can edit it. It cannot be changed later
              without an admin moving the course.
            </p>
            <div className="wiz-options">
              {publishers.map(p => (
                <button
                  key={p.id}
                  type="button"
                  className={`wiz-option${form.publisher_id === p.id ? ' is-selected' : ''}`}
                  onClick={() => set({ publisher_id: p.id })}
                >
                  <i className={p.type === 'solo' ? 'ri-user-star-line' : 'ri-building-line'} />
                  <span className="wiz-option__body">
                    <span className="wiz-option__name">{p.name}</span>
                    <span className="wiz-option__meta">
                      {p.type === 'solo' ? 'Your own space — only you' : 'Shared with that team'} · /p/{p.slug}
                    </span>
                  </span>
                  {form.publisher_id === p.id && <i className="ri-check-line wiz-option__tick" />}
                </button>
              ))}
            </div>
          </>
        )}

        {current.key === 'what' && (
          <>
            <h2 className="wiz-panel__title">What does it teach?</h2>
            <p className="wiz-panel__lede">
              Name it the way a student would search for it. The description is the text on every
              course card, so one clear sentence beats a paragraph.
            </p>

            <div className="wiz-field">
              <label className="wiz-field__label" htmlFor="c-name">Course name</label>
              <input
                id="c-name"
                className="wiz-input"
                value={form.name}
                placeholder="Physics 1st Paper"
                onChange={e => set({ name: e.target.value, slug: slugify(e.target.value) })}
                autoFocus
              />
            </div>

            <div className="wiz-field">
              <label className="wiz-field__label" htmlFor="c-prog">Program</label>
              <select
                id="c-prog"
                className="wiz-input"
                value={form.program_id}
                onChange={e => set({ program_id: e.target.value })}
              >
                <option value="">Choose a program…</option>
                {programs.map(p => (
                  <option key={p.id} value={p.id}>{p.name} ({p.kind})</option>
                ))}
              </select>
              <p className="wiz-field__hint">
                The syllabus or interest area this belongs to. It sets the first part of the URL.
              </p>
            </div>

            <div className="wiz-field">
              <label className="wiz-field__label" htmlFor="c-desc">Description</label>
              <textarea
                id="c-desc"
                className="wiz-input"
                rows={3}
                value={form.description}
                placeholder="Mechanics, waves and thermodynamics, built from first principles."
                onChange={e => set({ description: e.target.value })}
              />
            </div>

            {/* The URL is shown, not asked for. It only becomes an input
                if someone actually wants to change it. */}
            <div className="wiz-url">
              <span className="wiz-url__label">Public address</span>
              <code className="wiz-url__value">
                /{program?.slug || '…'}/
                <input
                  className="wiz-url__slug"
                  value={form.slug}
                  onChange={e => set({ slug: slugify(e.target.value) })}
                  aria-label="URL slug"
                  size={Math.max(8, form.slug.length)}
                />
              </code>
              {slugTaken && (
                <p className="wiz-url__err">
                  <i className="ri-error-warning-line" /> Another course already uses this address in
                  that program. Pick a different one.
                </p>
              )}
            </div>
          </>
        )}

        {current.key === 'look' && (
          <>
            <h2 className="wiz-panel__title">Pick an icon</h2>
            <p className="wiz-panel__lede">
              Shown on cards and in navigation. You can change it whenever.
            </p>
        <IconPicker value={form.icon} onChange={v => set({ icon: v })} label="Course icon" />

            <label className="wiz-check">
              <input
                type="checkbox"
                checked={form.has_certificate}
                onChange={e => set({ has_certificate: e.target.checked })}
              />
              <span>
                <strong>Issue a certificate on completion</strong>
                <em>Learners who finish every lesson can download a verifiable certificate.</em>
              </span>
            </label>
          </>
        )}

        {current.key === 'review' && (
          <>
            <h2 className="wiz-panel__title">Ready to start building</h2>
            <p className="wiz-panel__lede">
              This creates the course as a <strong>draft</strong>. Nothing is public until you
              publish it, and the builder will tell you when it is ready.
            </p>
            <dl className="wiz-review">
              <div><dt>Name</dt><dd>{form.name || <em>unnamed</em>}</dd></div>
              <div><dt>Publisher</dt><dd>{publisher?.name || '—'}</dd></div>
              <div><dt>Program</dt><dd>{program?.name || '—'}</dd></div>
              <div><dt>Address</dt><dd><code>/{program?.slug}/{form.slug}</code></dd></div>
              <div><dt>Certificate</dt><dd>{form.has_certificate ? 'Yes' : 'No'}</dd></div>
            </dl>
            <p className="wiz-next">
              Next you&rsquo;ll add a topic, a skill inside it, and your first lesson — paste a
              YouTube link and it fills in the rest.
            </p>
          </>
        )}
      </div>

      <div className="wiz-actions">
        {step > 0 ? (
          <button className="btn btn--ghost btn--sm" onClick={() => setStep(s => s - 1)}>
            <i className="ri-arrow-left-line" /> Back
          </button>
        ) : (
          <Link href="/studio" className="btn btn--ghost btn--sm"><i className="ri-close-line" /> Cancel</Link>
        )}

        {step < steps.length - 1 ? (
          <button className="btn btn--accent btn--sm" disabled={!canAdvance} onClick={() => setStep(s => s + 1)}>
            Continue <i className="ri-arrow-right-line" />
          </button>
        ) : (
          <button className="btn btn--accent btn--sm" disabled={!canAdvance || busy} onClick={create}>
            <i className="ri-add-line" /> {busy ? 'Creating…' : 'Create course'}
          </button>
        )}
      </div>
    </Shell>
  )
}

function Shell({ children }) {
  return (
    <>
      <Head><title>New course · Feyn</title></Head>
      <Nav />
      <main>
        <div className="container wiz">
          <header className="wiz-head">
            <Link href="/studio" className="wiz-head__back"><i className="ri-arrow-left-line" /> Studio</Link>
            <h1 className="wiz-head__title">Create a course</h1>
          </header>
          {children}
        </div>
      </main>
      <Footer />
    </>
  )
}
