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

// Kind → the Content-Type Storage must serve the file as. This is what
// actually controls whether a browser runs an .html file or just shows
// its source as text — file.type is not trustworthy enough to upload
// with directly (see kindFromFile's comment above), so every upload
// goes through this instead of the raw File#type.
const KIND_MIME = {
  html: 'text/html; charset=utf-8',
  pdf: 'application/pdf',
}

/** The Content-Type to upload a file with, given its detected kind. */
export function mimeForKind(kind, file) {
  return KIND_MIME[kind] || file.type || 'application/octet-stream'
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
