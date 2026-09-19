// ============================================================
// pages/studio/library.js — upload & manage library resources
//
// The library sits next to courses: a shelf of files and links
// (PDFs, slides, an interactive HTML page, a plain link out) that
// doesn't need topics/skills/lessons around it to be useful. Public
// at /library/{mentor username} once published — see
// pages/library/[username]/index.js.
//
// Upload is a direct Storage write, not an RPC: docs/schema.sql Part
// 6c's library_storage_* policies already gate it by publisher role,
// the same "direct write where RLS already governs it" pattern the
// course-content tables use (see ARCHITECTURE.md). The row insert
// that follows is the same direct-table pattern pages/studio/new.js
// uses for subjects.
// ============================================================

import Head from 'next/head'
import Link from 'next/link'
import { useState, useEffect, useCallback, useRef } from 'react'
import { Nav, Footer, Plate, useAuth } from '../../components/Layout'
import IconPicker from '../../components/IconPicker'
import { usePermissions } from '../../lib/usePermissions'
import { approvedMemberships, canCreateLibraryResource, canManagePublisher } from '../../lib/permissions'
import { authedClient } from '../../lib/api'
import { getCurrentToken } from '../../lib/supabase'
import { kindFromFile, mimeForKind, storagePath, sandboxedHtmlUrl, LIBRARY_BUCKET, MAX_UPLOAD_BYTES } from '../../lib/library'
import { KIND_META, formatFileSize } from '../../data/libraryHelpers'

function slugify(str) {
  return String(str || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 60)
}

const EMPTY_FORM = {
  publisher_id: '',
  title: '',
  slug: '',
  description: '',
  icon: 'ri-file-text-line',
  mode: 'file', // 'file' | 'link'
  external_url: '',
}

export default function LibraryStudio() {
  const { signedIn, setShowAuth, mounted } = useAuth()
  const { perms, loading } = usePermissions()

  const [mentor, setMentor] = useState(null)
  const [publishers, setPublishers] = useState([])
  const [resources, setResources] = useState([])
  const [dataLoading, setDataLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState(EMPTY_FORM)
  const [file, setFile] = useState(null)
  const [slugTaken, setSlugTaken] = useState(false)
  const [busy, setBusy] = useState('')
  const [error, setError] = useState('')
  const fileInputRef = useRef(null)

  const set = (patch) => setForm(f => ({ ...f, ...patch }))

  const loadMentor = useCallback(async () => {
    const sb = await authedClient()
    if (!sb || !perms.mentorId) return
    const { data } = await sb.from('mentors').select('id, username, display_name').eq('id', perms.mentorId).maybeSingle()
    setMentor(data || null)
  }, [perms.mentorId])

  const loadResources = useCallback(async () => {
    const sb = await authedClient()
    if (!sb) return setDataLoading(false)
    const pubIds = approvedMemberships(perms).map(m => m.publisher_id)
    let q = sb
      .from('library_resources')
      .select('id, title, slug, description, kind, icon, status, mime_type, file_size_bytes, publisher_id, updated_at, publishers ( id, name, slug, type )')
      .order('updated_at', { ascending: false })
    if (!perms.isAppAdmin) {
      if (!pubIds.length) { setResources([]); setDataLoading(false); return }
      q = q.in('publisher_id', pubIds)
    }
    const { data, error: e } = await q
    if (e) setError(e.message)
    setResources(data || [])
    setDataLoading(false)
  }, [perms])

  useEffect(() => { if (!loading) { loadMentor(); loadResources() } }, [loading, loadMentor, loadResources])

  useEffect(() => {
    if (loading) return
    if (perms.isAppAdmin) {
      authedClient().then(async sb => {
        if (!sb) return
        const { data } = await sb.from('publishers').select('id, name, slug, type').eq('status', 'approved').order('name')
        setPublishers(data || [])
      })
    } else {
      setPublishers(
        approvedMemberships(perms)
          .filter(m => canCreateLibraryResource(perms, m.publisher_id))
          .map(m => ({ id: m.publisher_id, name: m.publishers?.name, slug: m.publishers?.slug, type: m.publishers?.type }))
      )
    }
  }, [perms, loading])

  useEffect(() => {
    if (publishers.length === 1 && !form.publisher_id) set({ publisher_id: publishers[0].id })
  }, [publishers]) // eslint-disable-line react-hooks/exhaustive-deps

  const checkSlug = useCallback(async () => {
    if (!form.publisher_id || !form.slug) return setSlugTaken(false)
    const sb = await authedClient()
    if (!sb) return
    const { data } = await sb
      .from('library_resources')
      .select('id')
      .eq('publisher_id', form.publisher_id)
      .eq('slug', form.slug)
      .maybeSingle()
    setSlugTaken(!!data)
  }, [form.publisher_id, form.slug])

  useEffect(() => {
    const t = setTimeout(checkSlug, 350)
    return () => clearTimeout(t)
  }, [checkSlug])

  function pickFile(f) {
    if (!f) return
    if (f.size > MAX_UPLOAD_BYTES) {
      setError(`That file is too large — ${formatFileSize(MAX_UPLOAD_BYTES)} max.`)
      return
    }
    setError('')
    setFile(f)
    const kind = kindFromFile(f)
    const meta = KIND_META[kind]
    set({
      icon: meta?.icon || form.icon,
      title: form.title || f.name.replace(/\.[^.]+$/, ''),
      slug: form.slug || slugify(f.name.replace(/\.[^.]+$/, '')),
    })
  }

  async function upload() {
    setBusy('upload')
    setError('')
    try {
      const sb = await authedClient()
      if (!sb) throw new Error('Sign in to do that.')
      if (!form.publisher_id) throw new Error('Choose where this belongs.')
      if (!form.title.trim()) throw new Error('Give it a title.')
      if (form.mode === 'file' && !file) throw new Error('Choose a file to upload.')
      if (form.mode === 'link' && !form.external_url.trim()) throw new Error('Add the link.')

      const resourceId = crypto.randomUUID()
      const slug = form.slug || slugify(form.title)
      let kind, insertRow

      if (form.mode === 'link') {
        kind = 'link'
        insertRow = { external_url: form.external_url.trim(), storage_path: null, mime_type: null, file_size_bytes: null }
      } else {
        kind = kindFromFile(file)
        const mime = mimeForKind(kind, file)
        const path = storagePath(form.publisher_id, resourceId, file.name)
        const { error: upErr } = await sb.storage.from(LIBRARY_BUCKET).upload(path, file, {
          contentType: mime,
          upsert: false,
        })
        if (upErr) throw new Error(upErr.message)
        insertRow = { external_url: null, storage_path: path, mime_type: mime, file_size_bytes: file.size }
      }

      const { error: insErr } = await sb
        .from('library_resources')
        .insert({
          id: resourceId,
          publisher_id: form.publisher_id,
          title: form.title.trim(),
          slug,
          description: form.description.trim() || null,
          icon: form.icon || null,
          kind,
          status: 'draft',
          created_by_mentor_id: perms.mentorId,
          ...insertRow,
        })
      if (insErr) throw new Error(insErr.message)

      // Best-effort self-credit so it shows up at /library/{you} once
      // published. Only a publisher admin may write library_resource_
      // mentors (docs/schema.sql), so this silently does nothing for
      // an editor at a platform they don't administer — same as the
      // course-crediting flow, see pages/panels/publisher.js.
      if (perms.mentorId) {
        await sb.from('library_resource_mentors').insert({ resource_id: resourceId, mentor_id: perms.mentorId }).then(
          () => {}, () => {}
        )
      }

      setForm(EMPTY_FORM)
      setFile(null)
      if (fileInputRef.current) fileInputRef.current.value = ''
      setShowForm(false)
      await loadResources()
    } catch (e) {
      setError(e.message)
    } finally {
      setBusy('')
    }
  }

  async function preview(resource) {
    setBusy(`preview-${resource.id}`)
    setError('')
    try {
      const token = getCurrentToken()
      const res = await fetch(`/api/library/file/${resource.id}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      })
      if (!res.ok) {
        const json = await res.json().catch(() => ({}))
        throw new Error(json.error || `Could not open that (${res.status}).`)
      }
      if (resource.kind === 'html') {
        // HTML is served straight from the API route (no redirect), so
        // res.url has no token and a draft would 401 in a fresh tab.
        // Show the bytes we already fetched inside a sandboxed frame
        // instead: same no-same-origin isolation the API route applies.
        const html = await res.text()
        window.open(sandboxedHtmlUrl(html, resource.title), '_blank', 'noopener,noreferrer')
      } else {
        window.open(res.url, '_blank', 'noopener,noreferrer')
      }
    } catch (e) {
      setError(e.message)
    } finally {
      setBusy('')
    }
  }

  async function toggleStatus(resource) {
    setBusy(`status-${resource.id}`)
    setError('')
    try {
      const sb = await authedClient()
      if (!sb) throw new Error('Sign in to do that.')
      const next = resource.status === 'published' ? 'draft' : 'published'
      const { error: e } = await sb
        .from('library_resources')
        .update({ status: next, published_at: next === 'published' ? new Date().toISOString() : null })
        .eq('id', resource.id)
      if (e) throw new Error(e.message)
      await loadResources()
    } catch (e) {
      setError(e.message)
    } finally {
      setBusy('')
    }
  }

  async function remove(resource) {
    if (!window.confirm(`Delete "${resource.title}"? This can't be undone.`)) return
    setBusy(`del-${resource.id}`)
    setError('')
    try {
      const sb = await authedClient()
      if (!sb) throw new Error('Sign in to do that.')
      const { error: e } = await sb.from('library_resources').delete().eq('id', resource.id)
      if (e) throw new Error(e.message)
      await loadResources()
    } catch (e) {
      setError(e.message)
    } finally {
      setBusy('')
    }
  }

  if (!mounted) return null
  if (!signedIn) {
    return (
      <Shell>
        <div className="studio-gate">
          <i className="ri-lock-line studio-gate__icon" />
          <p className="studio-gate__text">Sign in to open your library.</p>
          <button className="btn btn--accent" onClick={() => setShowAuth(true)}>
            <i className="ri-login-circle-line" /> Sign in
          </button>
        </div>
      </Shell>
    )
  }
  if (loading) return <Shell><p className="empty-state">Loading…</p></Shell>

  if (publishers.length === 0) {
    return (
      <Shell>
        <div className="studio-gate">
          <i className="ri-lock-line studio-gate__icon" />
          <p className="studio-gate__text">You cannot add library resources anywhere yet.</p>
          <p className="studio-gate__sub">
            You need to be an editor or admin in at least one publisher. Approved mentors always
            get their own.
          </p>
          <Link href="/studio" className="btn btn--ghost btn--sm"><i className="ri-arrow-left-line" /> Back to studio</Link>
        </div>
      </Shell>
    )
  }

  const drafts = resources.filter(r => r.status === 'draft')
  const live = resources.filter(r => r.status === 'published')
  const multiPub = publishers.length > 1 || perms.isAppAdmin
  const publisher = publishers.find(p => p.id === form.publisher_id)

  return (
    <Shell
      right={
        <button className="btn btn--accent studio-head__cta" onClick={() => setShowForm(s => !s)}>
          <i className={showForm ? 'ri-close-line' : 'ri-upload-2-line'} /> {showForm ? 'Cancel' : 'Add resource'}
        </button>
      }
    >
      {error && <p className="auth-field__err" style={{ marginBottom: 20 }}><i className="ri-error-warning-line" /> {error}</p>}

      {showForm && (
        <section className="studio-section wiz-panel" style={{ marginBottom: 40 }}>
          <h2 className="wiz-panel__title">Add a resource</h2>
          <p className="wiz-panel__lede">
            Upload an HTML page and it opens directly, no download — great for interactive
            explainers. PDFs and images open inline too. Anything else opens or downloads as-is.
          </p>

          {publishers.length > 1 && (
            <div className="wiz-field">
              <label className="wiz-field__label" htmlFor="lr-pub">Publisher</label>
              <select id="lr-pub" className="wiz-input" value={form.publisher_id} onChange={e => set({ publisher_id: e.target.value })}>
                <option value="">Choose…</option>
                {publishers.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
          )}

          <div className="wiz-check" style={{ marginBottom: 18 }}>
            <label style={{ display: 'flex', gap: 8, alignItems: 'center', cursor: 'pointer' }}>
              <input type="radio" checked={form.mode === 'file'} onChange={() => set({ mode: 'file' })} />
              <span>Upload a file</span>
            </label>
            <label style={{ display: 'flex', gap: 8, alignItems: 'center', cursor: 'pointer', marginTop: 6 }}>
              <input type="radio" checked={form.mode === 'link'} onChange={() => set({ mode: 'link' })} />
              <span>Link to a URL</span>
            </label>
          </div>

          {form.mode === 'file' ? (
            <div className="wiz-field">
              <label className="wiz-field__label" htmlFor="lr-file">File</label>
              <input
                id="lr-file"
                ref={fileInputRef}
                className="wiz-input"
                type="file"
                onChange={e => pickFile(e.target.files?.[0])}
              />
              {file && (
                <p className="wiz-field__hint">
                  <i className={KIND_META[kindFromFile(file)]?.icon} /> {KIND_META[kindFromFile(file)]?.label} · {formatFileSize(file.size)}
                </p>
              )}
            </div>
          ) : (
            <div className="wiz-field">
              <label className="wiz-field__label" htmlFor="lr-url">URL</label>
              <input
                id="lr-url"
                className="wiz-input"
                type="url"
                placeholder="https://…"
                value={form.external_url}
                onChange={e => set({ external_url: e.target.value })}
              />
            </div>
          )}

          <div className="wiz-field">
            <label className="wiz-field__label" htmlFor="lr-title">Title</label>
            <input
              id="lr-title"
              className="wiz-input"
              value={form.title}
              onChange={e => set({ title: e.target.value, slug: form.slug || slugify(e.target.value) })}
            />
          </div>

          <div className="wiz-field">
            <label className="wiz-field__label" htmlFor="lr-desc">Description</label>
            <textarea
              id="lr-desc"
              className="wiz-input"
              rows={2}
              value={form.description}
              onChange={e => set({ description: e.target.value })}
            />
          </div>

          <div className="wiz-url">
            <span className="wiz-url__label">Public address</span>
            <code className="wiz-url__value">
              /library/{mentor?.username || '…'}/
              <input
                className="wiz-url__slug"
                value={form.slug}
                onChange={e => set({ slug: slugify(e.target.value) })}
                aria-label="URL slug"
                size={Math.max(8, form.slug.length)}
              />
            </code>
            {slugTaken && (
              <p className="wiz-url__err"><i className="ri-error-warning-line" /> Another resource under {publisher?.name || 'this publisher'} already uses this address.</p>
            )}
          </div>

          <IconPicker value={form.icon} onChange={v => set({ icon: v })} label="Icon" />

          <div className="wiz-actions" style={{ marginTop: 20 }}>
            <button
              className="btn btn--accent btn--sm"
              disabled={busy === 'upload' || slugTaken}
              onClick={upload}
            >
              <i className="ri-upload-2-line" /> {busy === 'upload' ? 'Uploading…' : 'Add as draft'}
            </button>
          </div>
        </section>
      )}

      <section className="studio-section">
        <header className="studio-section__head">
          <h2 className="studio-section__title"><i className="ri-book-shelf-line" /> Your library</h2>
          <span className="studio-section__count">{resources.length}</span>
        </header>

        {dataLoading ? (
          <p className="empty-state">Loading…</p>
        ) : resources.length === 0 ? (
          <div className="studio-empty">
            <i className="ri-book-shelf-line studio-empty__icon" />
            <p className="studio-empty__title">Nothing in your library yet</p>
            <p className="studio-empty__body">
              Notes, slides, an interactive page, a worksheet — anything a learner might want
              outside a course.
            </p>
            <button className="btn btn--accent btn--sm" onClick={() => setShowForm(true)}>
              <i className="ri-upload-2-line" /> Add your first resource
            </button>
          </div>
        ) : (
          <>
            {drafts.length > 0 && (
              <ResourceGroup label="Draft" resources={drafts} multiPub={multiPub} mentor={mentor} perms={perms} busy={busy}
                onToggle={toggleStatus} onDelete={remove} onPreview={preview} />
            )}
            {live.length > 0 && (
              <ResourceGroup label="Published" resources={live} multiPub={multiPub} mentor={mentor} perms={perms} busy={busy}
                onToggle={toggleStatus} onDelete={remove} onPreview={preview} />
            )}
          </>
        )}
      </section>
    </Shell>
  )
}

function ResourceGroup({ label, resources, multiPub, mentor, perms, busy, onToggle, onDelete, onPreview }) {
  return (
    <div className="studio-group">
      <p className="studio-group__label">{label} <span>{resources.length}</span></p>
      <div className="studio-list">
        {resources.map(r => {
          const meta = KIND_META[r.kind] || KIND_META.doc
          const canDelete = perms.isAppAdmin || canManagePublisher(perms, r.publisher_id)
          return (
            <div key={r.id} className="studio-row">
              <span className="studio-row__icon"><i className={r.icon || meta.icon} /></span>
              <div className="studio-row__body">
                <p className="studio-row__title">
                  {r.title}
                  <span className="studio-chip" style={{ marginLeft: 8 }}>{meta.label}</span>
                </p>
                <p className="studio-row__meta">
                  {formatFileSize(r.file_size_bytes) ? `${formatFileSize(r.file_size_bytes)} · ` : ''}
                  {multiPub && r.publishers?.name ? `${r.publishers.name} · ` : ''}
                  {r.status === 'published' && mentor?.username ? (
                    <Link href={`/library/${mentor.username}/${r.id}`}>/library/{mentor.username}/{r.id}</Link>
                  ) : 'not public yet'}
                </p>
              </div>
              <div className="studio-row__actions">
                <button
                  className="btn btn--ghost btn--sm"
                  disabled={busy === `preview-${r.id}`}
                  onClick={() => onPreview(r)}
                >
                  <i className="ri-eye-line" /> Preview
                </button>
                <button
                  className="btn btn--ghost btn--sm"
                  disabled={busy === `status-${r.id}`}
                  onClick={() => onToggle(r)}
                >
                  <i className={r.status === 'published' ? 'ri-eye-off-line' : 'ri-broadcast-line'} />{' '}
                  {r.status === 'published' ? 'Unpublish' : 'Publish'}
                </button>
                {canDelete && (
                  <button
                    className="btn btn--ghost btn--sm"
                    disabled={busy === `del-${r.id}`}
                    onClick={() => onDelete(r)}
                  >
                    <i className="ri-delete-bin-line" />
                  </button>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function Shell({ right, children }) {
  return (
    <>
      <Head><title>Library · Studio · Feyn</title></Head>
      <Nav />
      <main>
        <Plate>
          <header className="studio-head">
            <div>
              <p className="studio-head__eyebrow"><i className="ri-book-shelf-line" /> Library</p>
              <h1 className="studio-head__title">Files & links for your learners</h1>
              <p className="studio-head__sub">
                Lives outside any course. HTML pages open directly, PDFs and images preview inline.
              </p>
            </div>
            {right}
          </header>
        </Plate>
        <div className="container studio">
          <p style={{ marginBottom: 24 }}>
            <Link href="/studio" className="btn btn--ghost btn--sm"><i className="ri-arrow-left-line" /> Back to studio</Link>
          </p>
          {children}
        </div>
      </main>
      <Footer />
    </>
  )
}
