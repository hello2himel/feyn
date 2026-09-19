// ============================================================
// lib/library.js — client helpers for the library upload flow
//
// Kept separate from lib/api.js because uploading is a direct
// Storage write (governed by the library_storage_* policies in
// docs/schema.sql Part 6c), not an RPC — the same "direct table/
// storage writes where RLS already governs it" pattern the course
// content tables use. See ARCHITECTURE.md.
// ============================================================

export const LIBRARY_BUCKET = 'library-resources'

// Extension → { kind, mime fallback }. The browser's File#type is
// trusted first; this is only a fallback for the handful of types it
// sometimes leaves blank (notably .html and .md in some browsers).
const EXT_KIND = {
  html: 'html', htm: 'html',
  pdf: 'pdf',
  png: 'image', jpg: 'image', jpeg: 'image', gif: 'image', webp: 'image', svg: 'image',
}

/** Classifies a browser File into one of the library_resources.kind values. */
export function kindFromFile(file) {
  const ext = (file.name.split('.').pop() || '').toLowerCase()
  if (file.type === 'text/html' || EXT_KIND[ext] === 'html') return 'html'
  if (file.type === 'application/pdf' || EXT_KIND[ext] === 'pdf') return 'pdf'
  if (file.type.startsWith('image/') || EXT_KIND[ext] === 'image') return 'image'
  return 'doc'
}

// Kind → the Content-Type to store the file with. file.type is not
// trustworthy enough to upload directly (see kindFromFile's comment
// above), so every upload goes through this instead of the raw File#type.
//
// NOTE: this does NOT make HTML render. Supabase Storage serves any
// text/html object as text/plain regardless of what was stored, so HTML
// is rendered by pages/api/library/file/[resourceId].js, which serves
// the bytes itself with the right Content-Type (and a sandbox CSP).
const KIND_MIME = {
  html: 'text/html; charset=utf-8',
  pdf: 'application/pdf',
}

/** The Content-Type to upload a file with, given its detected kind. */
export function mimeForKind(kind, file) {
  return KIND_MIME[kind] || file.type || 'application/octet-stream'
}

/**
 * Blob URL for previewing already-fetched HTML (e.g. a draft the
 * viewer can only load with their bearer token) in a new tab.
 *
 * The HTML goes into an <iframe sandbox srcdoc> WITHOUT allow-same-origin,
 * so it runs in an opaque origin and cannot touch the app's session —
 * the same isolation pages/api/library/file/[resourceId].js applies via
 * a CSP sandbox header. Never open a raw text/html Blob of untrusted
 * HTML directly: that would run it as the app's own origin.
 */
export function sandboxedHtmlUrl(html, title = 'Preview') {
  const esc = s => String(s).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;')
  const wrapper =
    `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${esc(title)}</title>` +
    `<style>html,body{margin:0;height:100%}iframe{border:0;width:100%;height:100%;display:block}</style></head><body>` +
    `<iframe sandbox="allow-scripts allow-forms allow-modals allow-popups allow-popups-to-escape-sandbox allow-downloads" srcdoc="${esc(html)}"></iframe>` +
    `</body></html>`
  const url = URL.createObjectURL(new Blob([wrapper], { type: 'text/html;charset=utf-8' }))
  setTimeout(() => URL.revokeObjectURL(url), 60_000)
  return url
}

/** Storage object path: {publisher_id}/{resource_id}/{safe filename}. */
export function storagePath(publisherId, resourceId, filename) {
  const safe = String(filename || 'file')
    .replace(/[^a-zA-Z0-9._-]+/g, '-')
    .replace(/-{2,}/g, '-')
    .slice(-120)
  return `${publisherId}/${resourceId}/${safe || 'file'}`
}

export const MAX_UPLOAD_BYTES = 50 * 1024 * 1024 // 50 MB — generous for notes/slides, not for video.
