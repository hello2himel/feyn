// ============================================================
// pages/panels/editor.js — real, permission-scoped course editor
//
// REPLACES the `user_preferences` scratch-draft shell. Every change
// here is a direct write to the content tables; there is no local
// draft copy to drift out of sync.
//
// Entry points:
//   /panels/editor?publisher=<uuid>   create a new course
//   /panels/editor?subject=<uuid>     edit an existing course
//
// PERMISSION MODEL
// The UI asks lib/permissions.js what to render, but the authority is
// RLS: `subjects_update` uses can_edit_in_publisher(), and topics /
// skills / lessons / questions inherit it by walking up to the subject.
// A `mentor` role therefore cannot save a course they are not credited
// on even if they reach this URL directly — the write returns zero rows.
//
// Publishing is a status flip on the row itself: `draft` hides a course
// (and any individual lesson) from the public site, `published` makes
// it visible and lets ISR pick it up on the next revalidate.
// ============================================================

import Head from 'next/head'
import Link from 'next/link'
import { useRouter } from 'next/router'
import { useState, useEffect, useCallback } from 'react'
import { Nav, Footer, useAuth } from '../../components/Layout'
import IconPicker from '../../components/IconPicker'
import { usePermissions } from '../../lib/usePermissions'
import { canEditSubject, canCreateSubject, hasPublisherRole } from '../../lib/permissions'
import { authedClient } from '../../lib/api'
import { unmapQuestion, mapQuestion, formatDuration, parseDuration } from '../../data/courseHelpers'

const STATUSES = ['draft', 'published', 'archived']
const Q_KINDS = ['mcq', 'fill', 'tap-correct', 'explain', 'match']

function slugify(str) {
  return String(str || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 60)
}

export default function CourseEditor() {
  const router = useRouter()
  const { subject: subjectId, publisher: publisherId } = router.query
  const { signedIn, setShowAuth, mounted } = useAuth()
  const { perms, loading: permsLoading } = usePermissions()

  const [programs, setPrograms] = useState([])
  const [subject, setSubject] = useState(null)
  const [tree, setTree] = useState([])
  const [sel, setSel] = useState({ topic: null, skill: null, lesson: null })
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState('')
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  // ── Loading ────────────────────────────────────────────────────────
  const loadTree = useCallback(async (id) => {
    const sb = await authedClient()
    if (!sb || !id) return
    const { data, error: e } = await sb
      .from('topics')
      .select(`
        id, name, slug, description, icon, sort_order,
        skills ( id, name, slug, description, icon, sort_order,
          lessons ( id, title, slug, video_url, duration_seconds, intro, content_md,
                    status, sort_order,
                    questions ( id, kind, prompt, options, answer, explanation, sort_order ) ) )
      `)
      .eq('subject_id', id)
      .order('sort_order')
    if (e) {
      setError(e.message)
      return
    }
    const sorted = (data || []).map(t => ({
      ...t,
      skills: (t.skills || [])
        .sort((a, b) => a.sort_order - b.sort_order)
        .map(s => ({
          ...s,
          lessons: (s.lessons || []).sort((a, b) => a.sort_order - b.sort_order),
        })),
    }))
    setTree(sorted)
  }, [])

  const load = useCallback(async () => {
    const sb = await authedClient()
    if (!sb) {
      setLoading(false)
      return
    }

    const { data: progs } = await sb.from('programs').select('id, name, slug, kind').order('sort_order')
    setPrograms(progs || [])

    if (subjectId) {
      const { data } = await sb
        .from('subjects')
        .select('id, program_id, publisher_id, name, slug, description, icon, cover_image_url, has_certificate, status, publishers ( name, slug ), programs ( slug )')
        .eq('id', subjectId)
        .maybeSingle()
      setSubject(data || null)
      if (data) await loadTree(data.id)
    } else if (publisherId) {
      // New-course scaffold, unsaved until the first insert.
      setSubject({
        id: null,
        publisher_id: publisherId,
        program_id: progs?.[0]?.id || null,
        name: '',
        slug: '',
        description: '',
        icon: 'ri-book-open-line',
        has_certificate: false,
        status: 'draft',
      })
    }
    setLoading(false)
  }, [subjectId, publisherId, loadTree])

  useEffect(() => {
    if (router.isReady) load()
  }, [router.isReady, load])

  async function run(key, fn, msg) {
    setBusy(key)
    setError('')
    setNotice('')
    try {
      await fn()
      if (msg) setNotice(msg)
    } catch (e) {
      setError(e.message)
    } finally {
      setBusy('')
    }
  }

  // ── Subject-level writes ───────────────────────────────────────────
  async function saveSubject() {
    await run('subject', async () => {
      const sb = await authedClient()
      if (!sb) throw new Error('Sign in to do that.')
      const row = {
        program_id: subject.program_id,
        publisher_id: subject.publisher_id,
        name: subject.name.trim(),
        slug: subject.slug || slugify(subject.name),
        description: subject.description || null,
        icon: subject.icon || null,
        has_certificate: !!subject.has_certificate,
        status: subject.status,
      }
      if (!row.name) throw new Error('The course needs a name.')
      if (!row.program_id) throw new Error('Pick a program.')

      if (subject.id) {
        const { error: e, data } = await sb.from('subjects').update(row).eq('id', subject.id).select('id')
        if (e) throw new Error(e.message)
        // RLS refuses an UPDATE by affecting zero rows rather than raising.
        if (!data || data.length === 0) throw new Error('You do not have permission to edit this course.')
      } else {
        const { data, error: e } = await sb.from('subjects').insert(row).select('id').single()
        if (e) throw new Error(e.message)
        router.replace(`/panels/editor?subject=${data.id}`)
      }
    }, 'Course saved.')
  }

  // ── Generic child helpers ──────────────────────────────────────────
  async function insertRow(table, row, key, msg) {
    await run(key, async () => {
      const sb = await authedClient()
      if (!sb) throw new Error('Sign in to do that.')
      const { error: e } = await sb.from(table).insert(row)
      if (e) throw new Error(e.message)
      await loadTree(subject.id)
    }, msg)
  }

  async function updateRow(table, id, patch, key, msg) {
    await run(key, async () => {
      const sb = await authedClient()
      if (!sb) throw new Error('Sign in to do that.')
      const { data, error: e } = await sb.from(table).update(patch).eq('id', id).select('id')
      if (e) throw new Error(e.message)
      if (!data || data.length === 0) throw new Error('You do not have permission to change that.')
      await loadTree(subject.id)
    }, msg)
  }

  async function deleteRow(table, id, key, msg) {
    await run(key, async () => {
      const sb = await authedClient()
      if (!sb) throw new Error('Sign in to do that.')
      const { error: e } = await sb.from(table).delete().eq('id', id)
      if (e) throw new Error(e.message)
      await loadTree(subject.id)
      setSel({ topic: null, skill: null, lesson: null })
    }, msg)
  }

  // ── Render gates ───────────────────────────────────────────────────
  if (!mounted) return null

  if (!signedIn) {
    return (
      <Shell>
        <p className="empty-state">Sign in to edit courses.</p>
        <button className="btn btn--accent" onClick={() => setShowAuth(true)}>
          <i className="ri-login-circle-line" /> Sign in
        </button>
      </Shell>
    )
  }

  if (loading || permsLoading) return <Shell><p className="empty-state">Loading…</p></Shell>

  if (!subject) {
    return (
      <Shell>
        <p className="empty-state">Pick a course to edit from your publisher dashboard.</p>
        <Link href="/studio" className="btn btn--ghost btn--sm"><i className="ri-dashboard-line" /> My studio</Link>
      </Shell>
    )
  }

  const allowed = subject.id
    ? canEditSubject(perms, subject)
    : canCreateSubject(perms, subject.publisher_id)

  if (!allowed) {
    return (
      <Shell>
        <p className="empty-state">You do not have edit rights on this course.</p>
        <Link href="/studio" className="btn btn--ghost btn--sm"><i className="ri-dashboard-line" /> My studio</Link>
      </Shell>
    )
  }

  const topic = tree.find(t => t.id === sel.topic) || null
  const skill = topic?.skills.find(s => s.id === sel.skill) || null
  const lesson = skill?.lessons.find(l => l.id === sel.lesson) || null
  // Course-level deletion and credits are admin acts (see schema Part 6).
  const isPubAdmin = hasPublisherRole(perms, subject.publisher_id, 'admin')

  return (
    <Shell publisher={subject.publishers}>
      {error && <p className="auth-field__err" style={{ marginBottom: 14 }}><i className="ri-error-warning-line" /> {error}</p>}
      {notice && <p style={{ color: 'var(--accent)', fontSize: '0.82rem', marginBottom: 14 }}><i className="ri-check-line" /> {notice}</p>}

      {/* ── Course fields ───────────────────────────────────── */}
      <section className="panel-card-block" style={{ marginBottom: 20 }}>
        <h2>{subject.id ? 'Course' : 'New course'}</h2>
        <div className="panel-form-grid">
          <Field label="Name" value={subject.name} onChange={v => setSubject(s => ({ ...s, name: v, slug: s.slug || slugify(v) }))} />
          <Field label="URL slug" value={subject.slug} onChange={v => setSubject(s => ({ ...s, slug: slugify(v) }))} mono />
          <Select
            label="Program"
            value={subject.program_id || ''}
            onChange={v => setSubject(s => ({ ...s, program_id: v }))}
            options={programs.map(p => ({ value: p.id, label: `${p.name} (${p.kind})` }))}
          />
          <Select
            label="Status"
            value={subject.status}
            onChange={v => setSubject(s => ({ ...s, status: v }))}
            options={STATUSES.map(v => ({ value: v, label: v }))}
          />
        </div>
        <Field label="Description" value={subject.description || ''} onChange={v => setSubject(s => ({ ...s, description: v }))} textarea />
        <div style={{ marginTop: 12 }}>
          <span className="auth-field__label">Icon</span>
          <IconPicker value={subject.icon} onChange={v => setSubject(s => ({ ...s, icon: v }))} />
        </div>
        <label className="panel-check-row" style={{ marginTop: 12 }}>
          <input
            type="checkbox"
            checked={!!subject.has_certificate}
            onChange={e => setSubject(s => ({ ...s, has_certificate: e.target.checked }))}
          />
          Offers a certificate on completion
        </label>
        <div style={{ display: 'flex', gap: 8, marginTop: 14, flexWrap: 'wrap' }}>
          <button className="btn btn--accent btn--sm" disabled={busy === 'subject'} onClick={saveSubject}>
            <i className="ri-save-line" /> {busy === 'subject' ? 'Saving…' : 'Save course'}
          </button>
          {subject.id && subject.status === 'published' && (
            <Link href={`/${subject.programs?.slug}/${subject.slug}`} className="btn btn--ghost btn--sm">
              <i className="ri-external-link-line" /> View live
            </Link>
          )}
          {subject.id && isPubAdmin && (
            <button
              className="btn btn--danger btn--sm"
              disabled={busy === 'del-subject'}
              onClick={() => {
                if (!window.confirm('Delete this course and everything inside it? This cannot be undone.')) return
                run('del-subject', async () => {
                  const sb = await authedClient()
                  const { error: e } = await sb.from('subjects').delete().eq('id', subject.id)
                  if (e) throw new Error(e.message)
                  router.push('/studio')
                })
              }}
            >
              <i className="ri-delete-bin-line" /> Delete course
            </button>
          )}
        </div>
      </section>

      {!subject.id && (
        <p style={{ color: 'var(--text-3)', fontSize: '0.8rem' }}>
          Save the course first, then add topics, skills and lessons.
        </p>
      )}

      {/* ── Tree ────────────────────────────────────────────── */}
      {subject.id && (
        <div className="panel-form-grid" style={{ alignItems: 'start' }}>
          <TreeColumn
            title="Topics"
            items={tree.map(t => ({ id: t.id, label: t.name, meta: `${t.skills.length} skills` }))}
            selected={sel.topic}
            onSelect={id => setSel({ topic: id, skill: null, lesson: null })}
            onAdd={name => insertRow('topics', {
              subject_id: subject.id,
              name,
              slug: slugify(name),
              sort_order: tree.length,
            }, 'add-topic', 'Topic added.')}
            onDelete={id => deleteRow('topics', id, `del-t-${id}`, 'Topic deleted.')}
            busy={busy}
          />

          <TreeColumn
            title="Skills"
            disabled={!topic}
            items={(topic?.skills || []).map(s => ({ id: s.id, label: s.name, meta: `${s.lessons.length} lessons` }))}
            selected={sel.skill}
            onSelect={id => setSel(v => ({ ...v, skill: id, lesson: null }))}
            onAdd={name => insertRow('skills', {
              topic_id: topic.id,
              name,
              slug: slugify(name),
              sort_order: topic.skills.length,
            }, 'add-skill', 'Skill added.')}
            onDelete={id => deleteRow('skills', id, `del-s-${id}`, 'Skill deleted.')}
            busy={busy}
          />

          <TreeColumn
            title="Lessons"
            disabled={!skill}
            items={(skill?.lessons || []).map(l => ({ id: l.id, label: l.title, meta: l.status }))}
            selected={sel.lesson}
            onSelect={id => setSel(v => ({ ...v, lesson: id }))}
            onAdd={title => insertRow('lessons', {
              skill_id: skill.id,
              title,
              slug: slugify(title),
              sort_order: skill.lessons.length,
              status: 'draft',
            }, 'add-lesson', 'Lesson added.')}
            onDelete={id => deleteRow('lessons', id, `del-l-${id}`, 'Lesson deleted.')}
            busy={busy}
          />
        </div>
      )}

      {topic && !skill && (
        <TopicForm topic={topic} onSave={patch => updateRow('topics', topic.id, patch, `t-${topic.id}`, 'Topic saved.')} busy={busy} />
      )}
      {skill && !lesson && (
        <SkillForm skill={skill} onSave={patch => updateRow('skills', skill.id, patch, `s-${skill.id}`, 'Skill saved.')} busy={busy} />
      )}
      {lesson && (
        <LessonForm
          lesson={lesson}
          busy={busy}
          onSave={patch => updateRow('lessons', lesson.id, patch, `l-${lesson.id}`, 'Lesson saved.')}
          onQuestions={() => loadTree(subject.id)}
          setError={setError}
        />
      )}
    </Shell>
  )
}

// ── Tree column ───────────────────────────────────────────────────────
function TreeColumn({ title, items, selected, onSelect, onAdd, onDelete, disabled, busy }) {
  const [draft, setDraft] = useState('')

  return (
    <div className="panel-card-block">
      <h2>{title}</h2>
      {disabled ? (
        <p style={{ color: 'var(--text-3)', fontSize: '0.78rem' }}>Select a parent first.</p>
      ) : (
        <>
          <div style={{ display: 'grid', gap: 6, marginBottom: 10 }}>
            {items.length === 0 && <p style={{ color: 'var(--text-3)', fontSize: '0.78rem' }}>None yet.</p>}
            {items.map(it => (
              <div key={it.id} style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                <button
                  className={`btn btn--sm ${selected === it.id ? 'btn--accent' : 'btn--ghost'}`}
                  style={{ flex: 1, justifyContent: 'flex-start', textAlign: 'left' }}
                  onClick={() => onSelect(it.id)}
                >
                  {it.label}
                  <span style={{ marginLeft: 'auto', color: 'var(--text-3)', fontSize: '0.58rem' }}>{it.meta}</span>
                </button>
                <button
                  className="btn btn--danger btn--sm"
                  aria-label={`Delete ${it.label}`}
                  disabled={!!busy}
                  onClick={() => {
                    if (window.confirm(`Delete "${it.label}" and everything inside it?`)) onDelete(it.id)
                  }}
                >
                  <i className="ri-delete-bin-line" />
                </button>
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 6 }}>
            <input
              className="auth-input"
              value={draft}
              onChange={e => setDraft(e.target.value)}
              placeholder={`New ${title.slice(0, -1).toLowerCase()} name`}
              aria-label={`New ${title.slice(0, -1).toLowerCase()} name`}
            />
            <button
              className="btn btn--accent btn--sm"
              disabled={!draft.trim() || !!busy}
              onClick={() => {
                onAdd(draft.trim())
                setDraft('')
              }}
            >
              <i className="ri-add-line" />
            </button>
          </div>
        </>
      )}
    </div>
  )
}

// ── Topic / skill forms ───────────────────────────────────────────────
function TopicForm({ topic, onSave, busy }) {
  const [d, setD] = useState(topic)
  // Re-sync only when a different row is selected. Depending on the whole
  // object would discard in-progress typing on every parent re-render.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => setD(topic), [topic.id])
  return (
    <section className="panel-card-block" style={{ marginTop: 20 }}>
      <h2>Topic: {topic.name}</h2>
      <div className="panel-form-grid">
        <Field label="Name" value={d.name || ''} onChange={v => setD(x => ({ ...x, name: v }))} />
        <Field label="Slug" value={d.slug || ''} onChange={v => setD(x => ({ ...x, slug: slugify(v) }))} mono />
      </div>
      <Field label="Description" value={d.description || ''} onChange={v => setD(x => ({ ...x, description: v }))} textarea />
      <button
        className="btn btn--accent btn--sm"
        style={{ marginTop: 12 }}
        disabled={!!busy}
        onClick={() => onSave({ name: d.name, slug: d.slug, description: d.description || null })}
      >
        <i className="ri-save-line" /> Save topic
      </button>
    </section>
  )
}

function SkillForm({ skill, onSave, busy }) {
  const [d, setD] = useState(skill)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => setD(skill), [skill.id])
  return (
    <section className="panel-card-block" style={{ marginTop: 20 }}>
      <h2>Skill: {skill.name}</h2>
      <div className="panel-form-grid">
        <Field label="Name" value={d.name || ''} onChange={v => setD(x => ({ ...x, name: v }))} />
        <Field label="Slug" value={d.slug || ''} onChange={v => setD(x => ({ ...x, slug: slugify(v) }))} mono />
      </div>
      <Field label="Description" value={d.description || ''} onChange={v => setD(x => ({ ...x, description: v }))} textarea />
      <button
        className="btn btn--accent btn--sm"
        style={{ marginTop: 12 }}
        disabled={!!busy}
        onClick={() => onSave({ name: d.name, slug: d.slug, description: d.description || null })}
      >
        <i className="ri-save-line" /> Save skill
      </button>
    </section>
  )
}

// ── Lesson form + questions ───────────────────────────────────────────
function LessonForm({ lesson, onSave, onQuestions, busy, setError }) {
  const [d, setD] = useState(lesson)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => setD(lesson), [lesson.id])

  return (
    <>
      <section className="panel-card-block" style={{ marginTop: 20 }}>
        <h2>Lesson: {lesson.title}</h2>
        <div className="panel-form-grid">
          <Field label="Title" value={d.title || ''} onChange={v => setD(x => ({ ...x, title: v }))} />
          <Field label="Slug" value={d.slug || ''} onChange={v => setD(x => ({ ...x, slug: slugify(v) }))} mono />
          <Field
            label="Video URL or YouTube ID"
            value={d.video_url || ''}
            onChange={v => setD(x => ({ ...x, video_url: v }))}
            mono
          />
          <Field
            label="Duration (m:ss)"
            value={formatDuration(d.duration_seconds)?.replace('~', '') || ''}
            onChange={v => setD(x => ({ ...x, duration_seconds: parseDuration(v) }))}
            mono
          />
          <Select
            label="Status"
            value={d.status}
            onChange={v => setD(x => ({ ...x, status: v }))}
            options={STATUSES.map(s => ({ value: s, label: s }))}
          />
        </div>
        <Field label="Intro" value={d.intro || ''} onChange={v => setD(x => ({ ...x, intro: v }))} textarea />
        <Field label="Body (markdown)" value={d.content_md || ''} onChange={v => setD(x => ({ ...x, content_md: v }))} textarea rows={8} />
        <button
          className="btn btn--accent btn--sm"
          style={{ marginTop: 12 }}
          disabled={!!busy}
          onClick={() => onSave({
            title: d.title,
            slug: d.slug,
            video_url: d.video_url || null,
            duration_seconds: d.duration_seconds ?? null,
            intro: d.intro || null,
            content_md: d.content_md || null,
            status: d.status,
          })}
        >
          <i className="ri-save-line" /> Save lesson
        </button>
      </section>

      <QuestionsEditor
        lessonId={lesson.id}
        rows={lesson.questions || []}
        onChanged={onQuestions}
        setError={setError}
      />
    </>
  )
}

// Questions are stored as kind + options/answer jsonb. The editor works
// in the flat shape the player uses and converts on save with
// unmapQuestion(), so the two encodings never diverge by hand.
function QuestionsEditor({ lessonId, rows, onChanged, setError }) {
  const sorted = [...rows].sort((a, b) => a.sort_order - b.sort_order)
  const [busy, setBusy] = useState('')

  async function save(id, q, sortOrder) {
    setBusy(id || 'new')
    setError('')
    try {
      const sb = await authedClient()
      if (!sb) throw new Error('Sign in to do that.')
      const row = { ...unmapQuestion(q), lesson_id: lessonId, sort_order: sortOrder }
      const { error: e } = id
        ? await sb.from('questions').update(row).eq('id', id)
        : await sb.from('questions').insert(row)
      if (e) throw new Error(e.message)
      await onChanged()
    } catch (e) {
      setError(e.message)
    } finally {
      setBusy('')
    }
  }

  async function remove(id) {
    setBusy(id)
    try {
      const sb = await authedClient()
      const { error: e } = await sb.from('questions').delete().eq('id', id)
      if (e) throw new Error(e.message)
      await onChanged()
    } catch (e) {
      setError(e.message)
    } finally {
      setBusy('')
    }
  }

  return (
    <section className="panel-card-block" style={{ marginTop: 20 }}>
      <h2>Questions ({sorted.length})</h2>
      <div style={{ display: 'grid', gap: 14 }}>
        {sorted.map((row, i) => (
          <QuestionRow
            key={row.id}
            initial={mapQuestion(row)}
            index={i}
            busy={busy === row.id}
            onSave={q => save(row.id, q, row.sort_order)}
            onDelete={() => remove(row.id)}
          />
        ))}
        <QuestionRow
          key={`new-${sorted.length}`}
          initial={{ type: 'mcq', prompt: '', options: ['', ''], correct: 0, explanation: '' }}
          index={sorted.length}
          isNew
          busy={busy === 'new'}
          onSave={q => save(null, q, sorted.length)}
        />
      </div>
    </section>
  )
}

function QuestionRow({ initial, index, onSave, onDelete, isNew, busy }) {
  const [q, setQ] = useState(initial)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => setQ(initial), [initial.id])

  const usesOptions = q.type === 'mcq' || q.type === 'tap-correct'

  return (
    <div style={{ border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: 12 }}>
      <div className="panel-form-grid">
        <Select
          label={`Q${index + 1} type`}
          value={q.type}
          onChange={v => setQ(x => ({ ...x, type: v }))}
          options={Q_KINDS.map(k => ({ value: k, label: k }))}
        />
      </div>
      <Field label="Prompt" value={q.prompt || ''} onChange={v => setQ(x => ({ ...x, prompt: v }))} textarea />

      {usesOptions && (
        <div style={{ marginTop: 10 }}>
          <span className="auth-field__label">Options</span>
          {(q.options || []).map((opt, i) => (
            <div key={i} style={{ display: 'flex', gap: 6, alignItems: 'center', marginTop: 6 }}>
              <input
                type={q.type === 'mcq' ? 'radio' : 'checkbox'}
                name={`correct-${index}`}
                checked={q.type === 'mcq' ? q.correct === i : (q.correct || []).includes(i)}
                onChange={() => setQ(x => q.type === 'mcq'
                  ? { ...x, correct: i }
                  : { ...x, correct: (x.correct || []).includes(i) ? x.correct.filter(c => c !== i) : [...(x.correct || []), i] })}
                aria-label={`Option ${i + 1} is correct`}
              />
              <input
                className="auth-input"
                value={opt}
                onChange={e => setQ(x => ({ ...x, options: x.options.map((o, j) => (j === i ? e.target.value : o)) }))}
                aria-label={`Option ${i + 1}`}
              />
              <button
                className="btn btn--danger btn--sm"
                aria-label={`Remove option ${i + 1}`}
                onClick={() => setQ(x => ({ ...x, options: x.options.filter((_, j) => j !== i) }))}
              >
                <i className="ri-close-line" />
              </button>
            </div>
          ))}
          <button
            className="btn btn--ghost btn--sm"
            style={{ marginTop: 8 }}
            onClick={() => setQ(x => ({ ...x, options: [...(x.options || []), ''] }))}
          >
            <i className="ri-add-line" /> Add option
          </button>
        </div>
      )}

      {q.type === 'fill' && (
        <div className="panel-form-grid">
          <Field label="Answer" value={q.answer || ''} onChange={v => setQ(x => ({ ...x, answer: v }))} />
          <Field
            label="Accepted aliases (comma separated)"
            value={(q.aliases || []).join(', ')}
            onChange={v => setQ(x => ({ ...x, aliases: v.split(',').map(s => s.trim()).filter(Boolean) }))}
          />
        </div>
      )}

      {q.type === 'explain' && (
        <Field label="Model answer" value={q.modelAnswer || ''} onChange={v => setQ(x => ({ ...x, modelAnswer: v }))} textarea />
      )}

      {q.type === 'match' && (
        <div style={{ marginTop: 10 }}>
          <span className="auth-field__label">Pairs</span>
          {(q.pairs || []).map((pair, i) => (
            <div key={i} style={{ display: 'flex', gap: 6, marginTop: 6 }}>
              <input
                className="auth-input"
                value={pair.left || ''}
                placeholder="left"
                aria-label={`Pair ${i + 1} left`}
                onChange={e => setQ(x => ({ ...x, pairs: x.pairs.map((p, j) => (j === i ? { ...p, left: e.target.value } : p)) }))}
              />
              <input
                className="auth-input"
                value={pair.right || ''}
                placeholder="right"
                aria-label={`Pair ${i + 1} right`}
                onChange={e => setQ(x => ({ ...x, pairs: x.pairs.map((p, j) => (j === i ? { ...p, right: e.target.value } : p)) }))}
              />
              <button
                className="btn btn--danger btn--sm"
                aria-label={`Remove pair ${i + 1}`}
                onClick={() => setQ(x => ({ ...x, pairs: x.pairs.filter((_, j) => j !== i) }))}
              >
                <i className="ri-close-line" />
              </button>
            </div>
          ))}
          <button
            className="btn btn--ghost btn--sm"
            style={{ marginTop: 8 }}
            onClick={() => setQ(x => ({ ...x, pairs: [...(x.pairs || []), { left: '', right: '' }] }))}
          >
            <i className="ri-add-line" /> Add pair
          </button>
        </div>
      )}

      <Field label="Explanation" value={q.explanation || ''} onChange={v => setQ(x => ({ ...x, explanation: v }))} textarea />

      <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
        <button className="btn btn--accent btn--sm" disabled={busy || !q.prompt?.trim()} onClick={() => onSave(q)}>
          <i className="ri-save-line" /> {isNew ? 'Add question' : 'Save'}
        </button>
        {!isNew && (
          <button className="btn btn--danger btn--sm" disabled={busy} onClick={onDelete}>
            <i className="ri-delete-bin-line" /> Delete
          </button>
        )}
      </div>
    </div>
  )
}

// ── Small form primitives ─────────────────────────────────────────────
function Field({ label, value, onChange, textarea, rows = 3, mono }) {
  const id = `f-${label.replace(/\W+/g, '-').toLowerCase()}`
  const style = mono ? { fontFamily: 'var(--font-mono)' } : undefined
  return (
    <div className="auth-field" style={{ marginTop: 10 }}>
      <label className="auth-field__label" htmlFor={id}>{label}</label>
      {textarea ? (
        <textarea id={id} className="auth-input" rows={rows} value={value} onChange={e => onChange(e.target.value)} style={{ resize: 'vertical', ...style }} />
      ) : (
        <input id={id} className="auth-input" value={value} onChange={e => onChange(e.target.value)} style={style} />
      )}
    </div>
  )
}

function Select({ label, value, onChange, options }) {
  const id = `s-${label.replace(/\W+/g, '-').toLowerCase()}`
  return (
    <div className="auth-field" style={{ marginTop: 10 }}>
      <label className="auth-field__label" htmlFor={id}>{label}</label>
      <select id={id} className="auth-input" value={value} onChange={e => onChange(e.target.value)}>
        {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </div>
  )
}

function Shell({ publisher, children }) {
  return (
    <>
      <Head><title>Course editor · Feyn</title></Head>
      <Nav />
      <main>
        <div className="container panel-page">
          <h1 className="panel-page__title">Course editor</h1>
          <p style={{ color: 'var(--text-2)', margin: 0 }}>
            {publisher ? <>Publishing under <Link href={`/p/${publisher.slug}`} style={{ color: 'var(--accent)' }}>{publisher.name}</Link>.</> : 'Edit content directly. Drafts stay hidden from learners.'}
          </p>
          <div>{children}</div>
        </div>
      </main>
      <Footer />
    </>
  )
}
