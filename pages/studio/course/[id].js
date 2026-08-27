// ============================================================
// pages/studio/course/[id].js — the course builder
//
// REPLACES /panels/editor, which was a stack of forms: a course block,
// then three side-by-side "topics / skills / lessons" columns you had to
// click through in order, then whichever child form matched the deepest
// selection, then the questions editor — all scrolling down one page.
// Concretely, that meant:
//
//   · no view of the course as a whole; the shape lived in your head
//   · three separate "Save" buttons on one screen, each for a different
//     row, so it was never obvious what an unsaved change belonged to
//   · a `status` dropdown offering "published" with zero checks, so you
//     could ship an empty course and only find out from the live page
//   · adding a lesson meant selecting a topic, then a skill, then typing
//     in a third box, with no feedback about where it landed
//   · video was a raw text input and duration was typed by hand
//
// THIS VERSION
// Two panes. Left: the whole course as a tree you can see and add to at
// any level. Right: an inspector for whatever is selected, with one save
// button and dirty-state tracking. Above both: a publish bar backed by
// lib/courseReadiness.js, so publishing is a decision with visible
// criteria instead of a dropdown.
//
// PERMISSIONS are unchanged and still enforced by RLS: an UPDATE the
// caller may not make affects zero rows, which we surface as a refusal.
// The UI reads lib/permissions.js only to decide what to render.
// ============================================================

import Head from 'next/head'
import Link from 'next/link'
import { useRouter } from 'next/router'
import { useState, useEffect, useCallback, useMemo } from 'react'
import { Nav, Footer, useAuth } from '../../../components/Layout'
import IconPicker from '../../../components/IconPicker'
import VideoField from '../../../components/VideoField'
import { usePermissions } from '../../../lib/usePermissions'
import { canEditSubject, hasPublisherRole } from '../../../lib/permissions'
import { authedClient } from '../../../lib/api'
import { readinessSummary, courseStats } from '../../../lib/courseReadiness'
import { unmapQuestion, mapQuestion } from '../../../data/courseHelpers'

const Q_KINDS = [
  { value: 'mcq', label: 'Multiple choice', hint: 'One right answer among several.' },
  { value: 'tap-correct', label: 'Select all that apply', hint: 'Several right answers.' },
  { value: 'fill', label: 'Fill in the blank', hint: 'Typed answer, matched against accepted spellings.' },
  { value: 'explain', label: 'Short answer', hint: 'Free text compared with a model answer.' },
  { value: 'match', label: 'Match pairs', hint: 'Learners pair left items with their right partners.' },
]

function slugify(str) {
  return String(str || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 60)
}

export default function CourseBuilder() {
  const router = useRouter()
  const { id, created } = router.query
  const { signedIn, setShowAuth, mounted } = useAuth()
  const { perms, loading: permsLoading } = usePermissions()

  const [subject, setSubject] = useState(null)
  const [tree, setTree] = useState([])
  const [programs, setPrograms] = useState([])
  const [loading, setLoading] = useState(true)
  const [sel, setSel] = useState({ kind: 'course', id: null })
  const [busy, setBusy] = useState('')
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [showChecklist, setShowChecklist] = useState(!!created)
  const [collapsed, setCollapsed] = useState({})

  // ── Loading ─────────────────────────────────────────────────────────
  const loadTree = useCallback(async (subjectId) => {
    const sb = await authedClient()
    if (!sb || !subjectId) return
    const { data, error: e } = await sb
      .from('topics')
      .select(`
        id, name, slug, description, icon, sort_order,
        skills ( id, name, slug, description, icon, sort_order,
          lessons ( id, title, slug, video_url, duration_seconds, intro, content_md,
                    status, sort_order,
                    questions ( id, kind, prompt, options, answer, explanation, sort_order ) ) )
      `)
      .eq('subject_id', subjectId)
      .order('sort_order')
    if (e) return setError(e.message)
    setTree((data || []).map(t => ({
      ...t,
      skills: (t.skills || [])
        .sort((a, b) => a.sort_order - b.sort_order)
        .map(s => ({ ...s, lessons: (s.lessons || []).sort((a, b) => a.sort_order - b.sort_order) })),
    })))
  }, [])

  const load = useCallback(async () => {
    const sb = await authedClient()
    if (!sb || !id) return setLoading(false)

    const [{ data: progs }, { data: subj }] = await Promise.all([
      sb.from('programs').select('id, name, slug, kind').order('sort_order'),
      sb
        .from('subjects')
        .select('id, program_id, publisher_id, name, slug, description, icon, has_certificate, status, publishers ( id, name, slug, type ), programs ( slug, name )')
        .eq('id', id)
        .maybeSingle(),
    ])
    setPrograms(progs || [])
    setSubject(subj || null)
    if (subj) await loadTree(subj.id)
    setLoading(false)
  }, [id, loadTree])

  useEffect(() => { if (router.isReady) load() }, [router.isReady, load])

  // Notices are transient; a permanent "saved" line trains people to
  // ignore it.
  useEffect(() => {
    if (!notice) return
    const t = setTimeout(() => setNotice(''), 3000)
    return () => clearTimeout(t)
  }, [notice])

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

  // ── Writes ──────────────────────────────────────────────────────────
  async function saveSubject(patch) {
    await run('course', async () => {
      const sb = await authedClient()
      if (!sb) throw new Error('Sign in to do that.')
      const { data, error: e } = await sb.from('subjects').update(patch).eq('id', subject.id).select('id')
      if (e) throw new Error(e.message)
      // RLS refuses an UPDATE by matching zero rows rather than raising.
      if (!data?.length) throw new Error('You do not have permission to edit this course.')
      setSubject(s => ({ ...s, ...patch }))
    }, 'Saved.')
  }

  async function insertRow(table, row, key, msg, onDone) {
    await run(key, async () => {
      const sb = await authedClient()
      if (!sb) throw new Error('Sign in to do that.')
      const { data, error: e } = await sb.from(table).insert(row).select('id').single()
      if (e) throw new Error(e.message)
      await loadTree(subject.id)
      onDone?.(data?.id)
    }, msg)
  }

  async function updateRow(table, rowId, patch, key, msg) {
    await run(key, async () => {
      const sb = await authedClient()
      if (!sb) throw new Error('Sign in to do that.')
      const { data, error: e } = await sb.from(table).update(patch).eq('id', rowId).select('id')
      if (e) throw new Error(e.message)
      if (!data?.length) throw new Error('You do not have permission to change that.')
      await loadTree(subject.id)
    }, msg)
  }

  async function deleteRow(table, rowId, key, msg) {
    await run(key, async () => {
      const sb = await authedClient()
      if (!sb) throw new Error('Sign in to do that.')
      const { error: e } = await sb.from(table).delete().eq('id', rowId)
      if (e) throw new Error(e.message)
      await loadTree(subject.id)
      setSel({ kind: 'course', id: null })
    }, msg)
  }

  // Reordering by swap: sort_order is a plain integer, and two updates
  // are cheaper and safer than renumbering a whole level.
  async function move(table, rows, index, dir) {
    const target = index + dir
    if (target < 0 || target >= rows.length) return
    const a = rows[index], b = rows[target]
    await run(`mv-${a.id}`, async () => {
      const sb = await authedClient()
      if (!sb) throw new Error('Sign in to do that.')
      await sb.from(table).update({ sort_order: b.sort_order }).eq('id', a.id)
      await sb.from(table).update({ sort_order: a.sort_order }).eq('id', b.id)
      await loadTree(subject.id)
    })
  }

  // ── Gates ───────────────────────────────────────────────────────────
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
  if (loading || permsLoading) return <Shell><p className="empty-state">Loading course…</p></Shell>
  if (!subject) {
    return (
      <Shell>
        <p className="empty-state">That course does not exist, or you cannot see it.</p>
        <Link href="/studio" className="btn btn--ghost btn--sm"><i className="ri-arrow-left-line" /> Back to studio</Link>
      </Shell>
    )
  }
  if (!canEditSubject(perms, subject)) {
    return (
      <Shell>
        <div className="studio-gate">
          <i className="ri-lock-line studio-gate__icon" />
          <p className="studio-gate__text">You don&rsquo;t have edit rights on this course.</p>
          <p className="studio-gate__sub">
            Publisher admins grant editing by crediting you on a course.
          </p>
          <Link href="/studio" className="btn btn--ghost btn--sm"><i className="ri-arrow-left-line" /> Back to studio</Link>
        </div>
      </Shell>
    )
  }

  const isPubAdmin = hasPublisherRole(perms, subject.publisher_id, 'admin')
  const readiness = readinessSummary(subject, tree)
  const stats = courseStats(subject, tree)

  // Resolve the selection into concrete rows.
  let selTopic = null, selSkill = null, selLesson = null
  for (const t of tree) {
    if (sel.kind === 'topic' && t.id === sel.id) selTopic = t
    for (const s of t.skills || []) {
      if (sel.kind === 'skill' && s.id === sel.id) { selTopic = t; selSkill = s }
      for (const l of s.lessons || []) {
        if (sel.kind === 'lesson' && l.id === sel.id) { selTopic = t; selSkill = s; selLesson = l }
      }
    }
  }

  return (
    <Shell wide>
      {/* ── Header + publish bar ───────────────────────────────── */}
      <header className="bld-head">
        <div className="bld-head__left">
          <Link href="/studio" className="bld-head__back"><i className="ri-arrow-left-line" /> Studio</Link>
          <h1 className="bld-head__title">{subject.name || 'Untitled course'}</h1>
          <p className="bld-head__meta">
            <span className={`studio-tag ${subject.status === 'published' ? 'is-live' : subject.status === 'archived' ? 'is-archived' : 'is-draft'}`}>
              <i className={subject.status === 'published' ? 'ri-broadcast-line' : 'ri-draft-line'} />
              {subject.status === 'published' ? 'Live' : subject.status}
            </span>
            <span>{subject.publishers?.name}</span>
            <span>{subject.programs?.name}</span>
            <span>{stats.topics} topics · {stats.lessons} lessons</span>
          </p>
        </div>

        <div className="bld-head__right">
          {subject.status === 'published' && (
            <a
              href={`/${subject.programs?.slug}/${subject.slug}`}
              className="btn btn--ghost btn--sm"
              target="_blank"
              rel="noopener noreferrer"
            >
              <i className="ri-external-link-line" /> View live
            </a>
          )}
          <button
            className={`bld-ready${readiness.canPublish ? ' is-ready' : ''}`}
            onClick={() => setShowChecklist(o => !o)}
            aria-expanded={showChecklist}
          >
            <span className="bld-ready__ring">{readiness.pct}%</span>
            <span className="bld-ready__body">
              <span className="bld-ready__label">
                {readiness.canPublish ? 'Ready to publish' : `${readiness.blockers.length} thing${readiness.blockers.length === 1 ? '' : 's'} left`}
              </span>
              <span className="bld-ready__sub">{readiness.passed} of {readiness.total} checks</span>
            </span>
            <i className={`ri-arrow-down-s-line bld-ready__chev${showChecklist ? ' is-open' : ''}`} />
          </button>

          {subject.status === 'published' ? (
            <button
              className="btn btn--ghost btn--sm"
              disabled={busy === 'course'}
              onClick={() => {
                if (!window.confirm('Unpublish? The course disappears from the public site at the next revalidate.')) return
                saveSubject({ status: 'draft' })
              }}
            >
              <i className="ri-eye-off-line" /> Unpublish
            </button>
          ) : (
            <button
              className="btn btn--accent btn--sm"
              disabled={!readiness.canPublish || busy === 'course'}
              title={readiness.canPublish ? 'Make this course public' : 'Finish the required checks first'}
              onClick={() => saveSubject({ status: 'published' })}
            >
              <i className="ri-broadcast-line" /> Publish
            </button>
          )}
        </div>
      </header>

      {showChecklist && (
        <div className="bld-checklist">
          {created && (
            <p className="bld-checklist__welcome">
              <i className="ri-sparkling-line" /> Course created. Add a topic on the left, then a
              skill, then your first lesson — you can publish as soon as the required checks pass.
            </p>
          )}
          <ul className="bld-checks">
            {readiness.checks.map(c => (
              <li key={c.key} className={`bld-check${c.done ? ' is-done' : ''}${c.blocking ? ' is-blocking' : ''}`}>
                <i className={c.done ? 'ri-checkbox-circle-fill' : c.blocking ? 'ri-error-warning-line' : 'ri-checkbox-blank-circle-line'} />
                <span className="bld-check__body">
                  <span className="bld-check__label">
                    {c.label}
                    {c.blocking && !c.done && <em className="bld-check__req">required</em>}
                  </span>
                  {!c.done && <span className="bld-check__hint">{c.hint}</span>}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {error && <p className="bld-alert bld-alert--err"><i className="ri-error-warning-line" /> {error}</p>}
      {notice && <p className="bld-alert bld-alert--ok"><i className="ri-check-line" /> {notice}</p>}

      {/* ── Two panes ──────────────────────────────────────────── */}
      <div className="bld">
        {/* Outline */}
        <aside className="bld-outline">
          <div className="bld-outline__head">
            <span><i className="ri-node-tree" /> Outline</span>
            <span className="bld-outline__count">{stats.lessons} lessons</span>
          </div>

          <button
            className={`bld-node bld-node--course${sel.kind === 'course' ? ' is-sel' : ''}`}
            onClick={() => setSel({ kind: 'course', id: null })}
          >
            <i className={subject.icon || 'ri-book-open-line'} />
            <span className="bld-node__label">Course settings</span>
          </button>

          {tree.length === 0 && (
            <p className="bld-outline__empty">
              Nothing here yet. A <strong>topic</strong> is a chapter; a <strong>skill</strong> is one
              idea inside it; a <strong>lesson</strong> is one video plus its questions.
            </p>
          )}

          {tree.map((t, ti) => {
            const isOpen = !collapsed[t.id]
            return (
              <div key={t.id} className="bld-branch">
                <div className={`bld-node bld-node--topic${sel.kind === 'topic' && sel.id === t.id ? ' is-sel' : ''}`}>
                  <button
                    className="bld-node__twist"
                    onClick={() => setCollapsed(c => ({ ...c, [t.id]: !c[t.id] }))}
                    aria-label={isOpen ? 'Collapse' : 'Expand'}
                  >
                    <i className={isOpen ? 'ri-arrow-down-s-line' : 'ri-arrow-right-s-line'} />
                  </button>
                  <button className="bld-node__hit" onClick={() => setSel({ kind: 'topic', id: t.id })}>
                    <i className={t.icon || 'ri-folder-line'} />
                    <span className="bld-node__label">{t.name}</span>
                    <span className="bld-node__count">{(t.skills || []).length}</span>
                  </button>
                  <span className="bld-node__tools">
                    <button onClick={() => move('topics', tree, ti, -1)} disabled={ti === 0} aria-label="Move up"><i className="ri-arrow-up-s-line" /></button>
                    <button onClick={() => move('topics', tree, ti, 1)} disabled={ti === tree.length - 1} aria-label="Move down"><i className="ri-arrow-down-s-line" /></button>
                  </span>
                </div>

                {isOpen && (
                  <>
                    {(t.skills || []).map((s, si) => {
                      const sOpen = !collapsed[s.id]
                      return (
                        <div key={s.id}>
                          <div className={`bld-node bld-node--skill${sel.kind === 'skill' && sel.id === s.id ? ' is-sel' : ''}`}>
                            <button
                              className="bld-node__twist"
                              onClick={() => setCollapsed(c => ({ ...c, [s.id]: !c[s.id] }))}
                              aria-label={sOpen ? 'Collapse' : 'Expand'}
                            >
                              <i className={sOpen ? 'ri-arrow-down-s-line' : 'ri-arrow-right-s-line'} />
                            </button>
                            <button className="bld-node__hit" onClick={() => setSel({ kind: 'skill', id: s.id })}>
                              <i className={s.icon || 'ri-shapes-line'} />
                              <span className="bld-node__label">{s.name}</span>
                              <span className="bld-node__count">{(s.lessons || []).length}</span>
                            </button>
                            <span className="bld-node__tools">
                              <button onClick={() => move('skills', t.skills, si, -1)} disabled={si === 0} aria-label="Move up"><i className="ri-arrow-up-s-line" /></button>
                              <button onClick={() => move('skills', t.skills, si, 1)} disabled={si === t.skills.length - 1} aria-label="Move down"><i className="ri-arrow-down-s-line" /></button>
                            </span>
                          </div>

                          {sOpen && (
                            <>
                              {(s.lessons || []).map((l, li) => (
                                <div key={l.id} className={`bld-node bld-node--lesson${sel.kind === 'lesson' && sel.id === l.id ? ' is-sel' : ''}`}>
                                  <button className="bld-node__hit" onClick={() => setSel({ kind: 'lesson', id: l.id })}>
                                    <i className={l.status === 'published' ? 'ri-play-circle-fill' : 'ri-play-circle-line'} />
                                    <span className="bld-node__label">{l.title}</span>
                                    {!l.video_url && <i className="ri-alert-line bld-node__flag" title="No video attached" />}
                                    {(l.questions || []).length === 0 && <i className="ri-question-line bld-node__flag" title="No questions yet" />}
                                  </button>
                                  <span className="bld-node__tools">
                                    <button onClick={() => move('lessons', s.lessons, li, -1)} disabled={li === 0} aria-label="Move up"><i className="ri-arrow-up-s-line" /></button>
                                    <button onClick={() => move('lessons', s.lessons, li, 1)} disabled={li === s.lessons.length - 1} aria-label="Move down"><i className="ri-arrow-down-s-line" /></button>
                                  </span>
                                </div>
                              ))}
                              <QuickAdd
                                placeholder="Add a lesson"
                                icon="ri-play-circle-line"
                                depth={3}
                                busy={busy === `add-l-${s.id}`}
                                onAdd={title => insertRow('lessons', {
                                  skill_id: s.id,
                                  title,
                                  slug: slugify(title),
                                  sort_order: (s.lessons || []).length,
                                  status: 'draft',
                                }, `add-l-${s.id}`, 'Lesson added.', newId => newId && setSel({ kind: 'lesson', id: newId }))}
                              />
                            </>
                          )}
                        </div>
                      )
                    })}
                    <QuickAdd
                      placeholder="Add a skill"
                      icon="ri-shapes-line"
                      depth={2}
                      busy={busy === `add-s-${t.id}`}
                      onAdd={name => insertRow('skills', {
                        topic_id: t.id,
                        name,
                        slug: slugify(name),
                        sort_order: (t.skills || []).length,
                      }, `add-s-${t.id}`, 'Skill added.', newId => newId && setSel({ kind: 'skill', id: newId }))}
                    />
                  </>
                )}
              </div>
            )
          })}

          <QuickAdd
            placeholder="Add a topic"
            icon="ri-folder-line"
            depth={1}
            busy={busy === 'add-t'}
            onAdd={name => insertRow('topics', {
              subject_id: subject.id,
              name,
              slug: slugify(name),
              sort_order: tree.length,
            }, 'add-t', 'Topic added.', newId => newId && setSel({ kind: 'topic', id: newId }))}
          />
        </aside>

        {/* Inspector */}
        <section className="bld-inspector">
          {sel.kind === 'course' && (
            <CourseForm
              subject={subject}
              programs={programs}
              busy={busy === 'course'}
              isPubAdmin={isPubAdmin}
              onSave={saveSubject}
              onDelete={() => {
                if (!window.confirm(`Delete "${subject.name}" and every topic, lesson and question inside it? This cannot be undone.`)) return
                run('del-course', async () => {
                  const sb = await authedClient()
                  const { error: e } = await sb.from('subjects').delete().eq('id', subject.id)
                  if (e) throw new Error(e.message)
                  router.push('/studio')
                })
              }}
            />
          )}

          {sel.kind === 'topic' && selTopic && (
            <NodeForm
              key={selTopic.id}
              kind="Topic"
              row={selTopic}
              breadcrumb={[subject.name]}
              busy={!!busy}
              onSave={patch => updateRow('topics', selTopic.id, patch, `t-${selTopic.id}`, 'Topic saved.')}
              onDelete={() => {
                if (!window.confirm(`Delete "${selTopic.name}" and everything inside it?`)) return
                deleteRow('topics', selTopic.id, 'del-t', 'Topic deleted.')
              }}
            />
          )}

          {sel.kind === 'skill' && selSkill && (
            <NodeForm
              key={selSkill.id}
              kind="Skill"
              row={selSkill}
              breadcrumb={[subject.name, selTopic?.name]}
              busy={!!busy}
              onSave={patch => updateRow('skills', selSkill.id, patch, `s-${selSkill.id}`, 'Skill saved.')}
              onDelete={() => {
                if (!window.confirm(`Delete "${selSkill.name}" and its lessons?`)) return
                deleteRow('skills', selSkill.id, 'del-s', 'Skill deleted.')
              }}
            />
          )}

          {sel.kind === 'lesson' && selLesson && (
            <LessonForm
              key={selLesson.id}
              lesson={selLesson}
              breadcrumb={[subject.name, selTopic?.name, selSkill?.name]}
              busy={!!busy}
              onSave={patch => updateRow('lessons', selLesson.id, patch, `l-${selLesson.id}`, 'Lesson saved.')}
              onDelete={() => {
                if (!window.confirm(`Delete "${selLesson.title}" and its questions?`)) return
                deleteRow('lessons', selLesson.id, 'del-l', 'Lesson deleted.')
              }}
              onQuestionsChanged={() => loadTree(subject.id)}
              setError={setError}
            />
          )}
        </section>
      </div>
    </Shell>
  )
}

// ── Inline "add" affordance, one per level ────────────────────────────
// The old editor had a single shared "New X name" input per column, far
// from the item it would be added under. This sits exactly where the new
// row will appear.
function QuickAdd({ placeholder, icon, depth, onAdd, busy }) {
  const [open, setOpen] = useState(false)
  const [draft, setDraft] = useState('')

  function submit() {
    const v = draft.trim()
    if (!v) return
    onAdd(v)
    setDraft('')
    setOpen(false)
  }

  if (!open) {
    return (
      <button className={`bld-add bld-add--d${depth}`} onClick={() => setOpen(true)}>
        <i className="ri-add-line" /> {placeholder}
      </button>
    )
  }
  return (
    <div className={`bld-add bld-add--d${depth} is-open`}>
      <i className={icon} />
      <input
        autoFocus
        value={draft}
        placeholder={placeholder}
        aria-label={placeholder}
        onChange={e => setDraft(e.target.value)}
        onKeyDown={e => {
          if (e.key === 'Enter') submit()
          if (e.key === 'Escape') { setDraft(''); setOpen(false) }
        }}
        onBlur={() => { if (!draft.trim()) setOpen(false) }}
      />
      <button onClick={submit} disabled={!draft.trim() || busy} aria-label="Add">
        <i className="ri-check-line" />
      </button>
    </div>
  )
}

// ── Dirty-tracking wrapper ────────────────────────────────────────────
// One save button per inspector, enabled only when something changed, so
// "did that save?" is answerable by looking at it.
function useDraft(row, toDraft) {
  const initial = useMemo(() => toDraft(row), [row]) // eslint-disable-line react-hooks/exhaustive-deps
  const [draft, setDraft] = useState(initial)
  useEffect(() => setDraft(initial), [initial])
  const dirty = JSON.stringify(draft) !== JSON.stringify(initial)
  return { draft, setDraft, dirty }
}

function InspectorHead({ eyebrow, breadcrumb, title, dirty, busy, onSave, onDelete, deleteLabel }) {
  const crumbs = (breadcrumb || []).filter(Boolean)
  return (
    <header className="bld-insp__head">
      <div className="bld-insp__ident">
        <p className="bld-insp__eyebrow">{eyebrow}</p>
        {crumbs.length > 0 && <p className="bld-insp__crumbs">{crumbs.join(' › ')}</p>}
        <h2 className="bld-insp__title">{title}</h2>
      </div>
      <div className="bld-insp__actions">
        {dirty && <span className="bld-insp__dirty"><i className="ri-record-circle-line" /> Unsaved</span>}
        <button className="btn btn--accent btn--sm" disabled={!dirty || busy} onClick={onSave}>
          <i className="ri-save-line" /> {busy ? 'Saving…' : 'Save'}
        </button>
        {onDelete && (
          <button className="bld-insp__del" onClick={onDelete} title={deleteLabel} aria-label={deleteLabel}>
            <i className="ri-delete-bin-line" />
          </button>
        )}
      </div>
    </header>
  )
}

// ── Course settings ───────────────────────────────────────────────────
function CourseForm({ subject, programs, busy, isPubAdmin, onSave, onDelete }) {
  const { draft, setDraft, dirty } = useDraft(subject, s => ({
    name: s.name || '',
    slug: s.slug || '',
    description: s.description || '',
    icon: s.icon || '',
    program_id: s.program_id || '',
    has_certificate: !!s.has_certificate,
  }))
  const set = p => setDraft(d => ({ ...d, ...p }))
  const program = programs.find(p => p.id === draft.program_id)

  return (
    <>
      <InspectorHead
        eyebrow="Course settings"
        title={draft.name || 'Untitled course'}
        dirty={dirty}
        busy={busy}
        onSave={() => onSave({
          name: draft.name.trim(),
          slug: draft.slug || slugify(draft.name),
          description: draft.description.trim() || null,
          icon: draft.icon || null,
          program_id: draft.program_id,
          has_certificate: draft.has_certificate,
        })}
        onDelete={isPubAdmin ? onDelete : null}
        deleteLabel="Delete course"
      />

      <Field label="Name" value={draft.name} onChange={v => set({ name: v })} />
      <Field
        label="Description"
        value={draft.description}
        onChange={v => set({ description: v })}
        textarea
        hint="The sentence learners read on every card. Keep it concrete."
      />
      <Field
        label="Program"
        select
        value={draft.program_id}
        onChange={v => set({ program_id: v })}
        options={programs.map(p => ({ value: p.id, label: `${p.name} (${p.kind})` }))}
      />
      <Field
        label="URL slug"
        value={draft.slug}
        onChange={v => set({ slug: slugify(v) })}
        mono
        hint={`Public address: /${program?.slug || '…'}/${draft.slug || '…'}. Changing it breaks existing links and orphans saved progress.`}
      />

      <div className="bld-field">
        <span className="bld-field__label">Icon</span>
        <IconPicker value={draft.icon} onChange={v => set({ icon: v })} />
      </div>

      <label className="bld-check-row">
        <input
          type="checkbox"
          checked={draft.has_certificate}
          onChange={e => set({ has_certificate: e.target.checked })}
        />
        <span>
          <strong>Issue a certificate on completion</strong>
          <em>Learners who finish every lesson can download a verifiable certificate.</em>
        </span>
      </label>
    </>
  )
}

// ── Topic / skill inspector ───────────────────────────────────────────
function NodeForm({ kind, row, breadcrumb, busy, onSave, onDelete }) {
  const { draft, setDraft, dirty } = useDraft(row, r => ({
    name: r.name || '',
    slug: r.slug || '',
    description: r.description || '',
    icon: r.icon || '',
  }))
  const set = p => setDraft(d => ({ ...d, ...p }))

  return (
    <>
      <InspectorHead
        eyebrow={kind}
        breadcrumb={breadcrumb}
        title={draft.name || `Untitled ${kind.toLowerCase()}`}
        dirty={dirty}
        busy={busy}
        onSave={() => onSave({
          name: draft.name.trim(),
          slug: draft.slug || slugify(draft.name),
          description: draft.description.trim() || null,
          icon: draft.icon || null,
        })}
        onDelete={onDelete}
        deleteLabel={`Delete ${kind.toLowerCase()}`}
      />
      <Field label="Name" value={draft.name} onChange={v => set({ name: v, slug: draft.slug || slugify(v) })} />
      <Field
        label="Description"
        value={draft.description}
        onChange={v => set({ description: v })}
        textarea
        hint={kind === 'Topic'
          ? 'Shown on the topic card. What can a learner do after this chapter?'
          : 'One idea, stated plainly.'}
      />
      <Field label="URL slug" value={draft.slug} onChange={v => set({ slug: slugify(v) })} mono />
      <div className="bld-field">
        <span className="bld-field__label">Icon</span>
        <IconPicker value={draft.icon} onChange={v => set({ icon: v })} />
      </div>
    </>
  )
}

// ── Lesson inspector ──────────────────────────────────────────────────
function LessonForm({ lesson, breadcrumb, busy, onSave, onDelete, onQuestionsChanged, setError }) {
  const { draft, setDraft, dirty } = useDraft(lesson, l => ({
    title: l.title || '',
    slug: l.slug || '',
    video_url: l.video_url || '',
    duration_seconds: l.duration_seconds ?? null,
    intro: l.intro || '',
    content_md: l.content_md || '',
    status: l.status || 'draft',
  }))
  const set = p => setDraft(d => ({ ...d, ...p }))
  const questions = lesson.questions || []

  return (
    <>
      <InspectorHead
        eyebrow="Lesson"
        breadcrumb={breadcrumb}
        title={draft.title || 'Untitled lesson'}
        dirty={dirty}
        busy={busy}
        onSave={() => onSave({
          title: draft.title.trim(),
          slug: draft.slug || slugify(draft.title),
          video_url: draft.video_url || null,
          duration_seconds: draft.duration_seconds ?? null,
          intro: draft.intro.trim() || null,
          content_md: draft.content_md.trim() || null,
          status: draft.status,
        })}
        onDelete={onDelete}
        deleteLabel="Delete lesson"
      />

      {/* Visibility as a two-state switch rather than a dropdown that
          also contains 'archived' — archiving one lesson mid-edit was
          never what anyone wanted. */}
      <div className="bld-visibility">
        <button
          type="button"
          className={`bld-vis${draft.status === 'draft' ? ' is-on' : ''}`}
          onClick={() => set({ status: 'draft' })}
        >
          <i className="ri-draft-line" />
          <span><strong>Draft</strong><em>Hidden from learners</em></span>
        </button>
        <button
          type="button"
          className={`bld-vis${draft.status === 'published' ? ' is-on' : ''}`}
          onClick={() => set({ status: 'published' })}
          disabled={!draft.video_url}
          title={draft.video_url ? undefined : 'Attach a video first'}
        >
          <i className="ri-broadcast-line" />
          <span><strong>Published</strong><em>Visible once the course is live</em></span>
        </button>
      </div>

      <Field label="Title" value={draft.title} onChange={v => set({ title: v, slug: draft.slug || slugify(v) })} />

      <VideoField
        value={draft.video_url}
        durationSeconds={draft.duration_seconds}
        onChange={v => set({ video_url: v })}
        onDuration={secs => set({ duration_seconds: secs })}
      />

      <Field
        label="Intro"
        value={draft.intro}
        onChange={v => set({ intro: v })}
        textarea
        hint="One or two sentences above the video, setting up what the learner is about to see."
      />
      <Field
        label="Notes (markdown)"
        value={draft.content_md}
        onChange={v => set({ content_md: v })}
        textarea
        rows={8}
        hint="Optional written version, shown under the video."
      />
      <Field label="URL slug" value={draft.slug} onChange={v => set({ slug: slugify(v) })} mono />

      <QuestionsEditor
        lessonId={lesson.id}
        rows={questions}
        onChanged={onQuestionsChanged}
        setError={setError}
      />
    </>
  )
}

// ── Questions ─────────────────────────────────────────────────────────
// Same storage contract as before (kind + options/answer jsonb, converted
// by unmapQuestion), but presented as collapsed cards with an explicit
// "add" affordance instead of a permanently-open blank form pretending to
// be a real question.
function QuestionsEditor({ lessonId, rows, onChanged, setError }) {
  const sorted = [...rows].sort((a, b) => a.sort_order - b.sort_order)
  const [busy, setBusy] = useState('')
  const [adding, setAdding] = useState(false)
  const [openId, setOpenId] = useState(null)

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
      setAdding(false)
      setOpenId(null)
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
    <section className="bld-questions">
      <header className="bld-questions__head">
        <h3><i className="ri-question-answer-line" /> Questions <span>{sorted.length}</span></h3>
        {!adding && (
          <button className="btn btn--ghost btn--sm" onClick={() => { setAdding(true); setOpenId(null) }}>
            <i className="ri-add-line" /> Add question
          </button>
        )}
      </header>

      {sorted.length === 0 && !adding && (
        <p className="bld-questions__empty">
          No questions yet. A lesson without one can be watched but never checked — that check is
          what separates Feyn from a playlist.
        </p>
      )}

      <div className="bld-qlist">
        {sorted.map((row, i) => {
          const q = mapQuestion(row)
          const isOpen = openId === row.id
          return (
            <div key={row.id} className={`bld-qcard${isOpen ? ' is-open' : ''}`}>
              <button className="bld-qcard__head" onClick={() => setOpenId(isOpen ? null : row.id)}>
                <span className="bld-qcard__n">Q{i + 1}</span>
                <span className="bld-qcard__prompt">{q.prompt || <em>No prompt</em>}</span>
                <span className="bld-qcard__kind">{Q_KINDS.find(k => k.value === q.type)?.label || q.type}</span>
                <i className={`ri-arrow-down-s-line bld-qcard__chev${isOpen ? ' is-open' : ''}`} />
              </button>
              {isOpen && (
                <div className="bld-qcard__body">
                  <QuestionEditor
                    initial={q}
                    busy={busy === row.id}
                    onSave={next => save(row.id, next, row.sort_order)}
                    onDelete={() => {
                      if (window.confirm('Delete this question?')) remove(row.id)
                    }}
                  />
                </div>
              )}
            </div>
          )
        })}

        {adding && (
          <div className="bld-qcard is-open">
            <div className="bld-qcard__head bld-qcard__head--static">
              <span className="bld-qcard__n">Q{sorted.length + 1}</span>
              <span className="bld-qcard__prompt"><em>New question</em></span>
            </div>
            <div className="bld-qcard__body">
              <QuestionEditor
                initial={{ type: 'mcq', prompt: '', options: ['', ''], correct: 0, explanation: '' }}
                isNew
                busy={busy === 'new'}
                onSave={next => save(null, next, sorted.length)}
                onDelete={() => setAdding(false)}
              />
            </div>
          </div>
        )}
      </div>
    </section>
  )
}

function QuestionEditor({ initial, onSave, onDelete, isNew, busy }) {
  const [q, setQ] = useState(initial)
  const set = p => setQ(x => ({ ...x, ...p }))
  const kind = Q_KINDS.find(k => k.value === q.type)
  const usesOptions = q.type === 'mcq' || q.type === 'tap-correct'

  return (
    <>
      {/* Types as labelled choices, not an opaque select of slugs. */}
      <div className="bld-qtypes">
        {Q_KINDS.map(k => (
          <button
            key={k.value}
            type="button"
            className={`bld-qtype${q.type === k.value ? ' is-on' : ''}`}
            onClick={() => set({ type: k.value })}
          >
            {k.label}
          </button>
        ))}
      </div>
      {kind && <p className="bld-qtype__hint">{kind.hint}</p>}

      <Field label="Question" value={q.prompt || ''} onChange={v => set({ prompt: v })} textarea />

      {usesOptions && (
        <div className="bld-field">
          <span className="bld-field__label">
            Options
            <em>{q.type === 'mcq' ? 'Tick the one correct answer' : 'Tick every correct answer'}</em>
          </span>
          {(q.options || []).map((opt, i) => (
            <div key={i} className="bld-opt">
              <input
                type={q.type === 'mcq' ? 'radio' : 'checkbox'}
                name={`correct-${isNew ? 'new' : initial.id}`}
                checked={q.type === 'mcq' ? q.correct === i : (q.correct || []).includes(i)}
                onChange={() => set(q.type === 'mcq'
                  ? { correct: i }
                  : { correct: (q.correct || []).includes(i) ? q.correct.filter(c => c !== i) : [...(q.correct || []), i] })}
                aria-label={`Option ${i + 1} is correct`}
              />
              <input
                className="bld-input"
                value={opt}
                placeholder={`Option ${i + 1}`}
                onChange={e => set({ options: q.options.map((o, j) => (j === i ? e.target.value : o)) })}
                aria-label={`Option ${i + 1}`}
              />
              <button
                type="button"
                className="bld-opt__del"
                aria-label={`Remove option ${i + 1}`}
                onClick={() => set({ options: q.options.filter((_, j) => j !== i) })}
              >
                <i className="ri-close-line" />
              </button>
            </div>
          ))}
          <button type="button" className="bld-addline" onClick={() => set({ options: [...(q.options || []), ''] })}>
            <i className="ri-add-line" /> Add option
          </button>
        </div>
      )}

      {q.type === 'fill' && (
        <>
          <Field label="Correct answer" value={q.answer || ''} onChange={v => set({ answer: v })} />
          <Field
            label="Also accept"
            value={(q.aliases || []).join(', ')}
            onChange={v => set({ aliases: v.split(',').map(s => s.trim()).filter(Boolean) })}
            hint="Comma separated. Add spellings, units and abbreviations you would mark correct."
          />
        </>
      )}

      {q.type === 'explain' && (
        <Field
          label="Model answer"
          value={q.modelAnswer || ''}
          onChange={v => set({ modelAnswer: v })}
          textarea
          hint="Shown after the learner answers, so they can compare."
        />
      )}

      {q.type === 'match' && (
        <div className="bld-field">
          <span className="bld-field__label">Pairs</span>
          {(q.pairs || []).map((pair, i) => (
            <div key={i} className="bld-pair">
              <input
                className="bld-input"
                value={pair.left || ''}
                placeholder="Term"
                aria-label={`Pair ${i + 1} left`}
                onChange={e => set({ pairs: q.pairs.map((p, j) => (j === i ? { ...p, left: e.target.value } : p)) })}
              />
              <i className="ri-arrow-right-line" />
              <input
                className="bld-input"
                value={pair.right || ''}
                placeholder="Match"
                aria-label={`Pair ${i + 1} right`}
                onChange={e => set({ pairs: q.pairs.map((p, j) => (j === i ? { ...p, right: e.target.value } : p)) })}
              />
              <button
                type="button"
                className="bld-opt__del"
                aria-label={`Remove pair ${i + 1}`}
                onClick={() => set({ pairs: q.pairs.filter((_, j) => j !== i) })}
              >
                <i className="ri-close-line" />
              </button>
            </div>
          ))}
          <button type="button" className="bld-addline" onClick={() => set({ pairs: [...(q.pairs || []), { left: '', right: '' }] })}>
            <i className="ri-add-line" /> Add pair
          </button>
        </div>
      )}

      <Field
        label="Explanation"
        value={q.explanation || ''}
        onChange={v => set({ explanation: v })}
        textarea
        hint="Shown after answering, right or wrong. This is where the teaching happens."
      />

      <div className="bld-qactions">
        <button className="btn btn--accent btn--sm" disabled={busy || !q.prompt?.trim()} onClick={() => onSave(q)}>
          <i className="ri-save-line" /> {busy ? 'Saving…' : isNew ? 'Add question' : 'Save question'}
        </button>
        <button className="bld-insp__del" onClick={onDelete} aria-label={isNew ? 'Discard' : 'Delete question'}>
          <i className={isNew ? 'ri-close-line' : 'ri-delete-bin-line'} />
        </button>
      </div>
    </>
  )
}

// ── Field primitive ───────────────────────────────────────────────────
function Field({ label, value, onChange, textarea, rows = 3, mono, hint, select, options }) {
  const id = `f-${String(label).replace(/\W+/g, '-').toLowerCase()}`
  const cls = `bld-input${mono ? ' is-mono' : ''}`
  return (
    <div className="bld-field">
      <label className="bld-field__label" htmlFor={id}>{label}</label>
      {select ? (
        <select id={id} className={cls} value={value} onChange={e => onChange(e.target.value)}>
          <option value="">Choose…</option>
          {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      ) : textarea ? (
        <textarea id={id} className={cls} rows={rows} value={value} onChange={e => onChange(e.target.value)} />
      ) : (
        <input id={id} className={cls} value={value} onChange={e => onChange(e.target.value)} />
      )}
      {hint && <p className="bld-field__hint">{hint}</p>}
    </div>
  )
}

function Shell({ wide, children }) {
  return (
    <>
      <Head><title>Course builder · Feyn</title></Head>
      <Nav />
      <main>
        <div className={`${wide ? 'container--wide' : 'container'} bld-page`}>{children}</div>
      </main>
      <Footer />
    </>
  )
}
