// ============================================================
// data/libraryHelpers.js — library-resource content layer
//
// The library sits next to courses rather than inside them: a
// Publisher-owned shelf of files and links (`library_resources`),
// credited to mentors via `library_resource_mentors` exactly the way
// `subject_mentors` credits a course. See docs/schema.sql Part 3B.
//
// Same conventions as data/courseHelpers.js: fetchers are async and
// read through the anon-key client with RLS on, so a draft resource
// cannot leak into a statically cached page. mapResource() is the one
// place schema columns become the flat shape the UI reads.
// ============================================================

import { getPublicServerClient } from '../lib/supabaseServer'
import { mapMentor, mapPublisher } from './courseHelpers'

const RESOURCE_COLS = `
  id, publisher_id, title, slug, description, kind, mime_type,
  file_size_bytes, icon, status, sort_order, created_at, updated_at,
  publishers ( id, slug, name, type, logo_url, brand_color )
`

export function mapResource(row, { mentors } = {}) {
  if (!row) return null
  return {
    id: row.id,
    title: row.title,
    slug: row.slug,
    description: row.description || '',
    kind: row.kind,
    mimeType: row.mime_type || null,
    fileSizeBytes: row.file_size_bytes || null,
    icon: row.icon || null,
    status: row.status,
    publisher: mapPublisher(row.publishers),
    publisherId: row.publisher_id,
    mentors: (mentors || []).filter(Boolean),
    // The file itself is never read from Storage directly — this URL
    // is the only way in, and it re-checks visibility on every hit.
    fileUrl: row.kind === 'link' ? null : `/api/library/file/${row.id}`,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

/** One resource by id, for /library/[username]/[resourceId]. */
export async function getLibraryResource(resourceId) {
  const sb = getPublicServerClient()
  if (!sb || !resourceId) return null
  const { data, error } = await sb
    .from('library_resources')
    .select(`${RESOURCE_COLS}, external_url, library_resource_mentors ( mentor_id, sort_order, mentors ( id, username, display_name, avatar_url, credentials, bio, socials, status ) )`)
    .eq('id', resourceId)
    .maybeSingle()
  if (error) throw new Error(`getLibraryResource: ${error.message}`)
  if (!data) return null
  const mentors = (data.library_resource_mentors || [])
    .slice()
    .sort((a, b) => a.sort_order - b.sort_order)
    .map(lrm => mapMentor(lrm.mentors))
    .filter(Boolean)
  return { ...mapResource(data, { mentors }), externalUrl: data.external_url || null }
}

/** Every published resource this mentor is credited on, across every publisher. */
export async function getMentorLibraryResources(mentorId) {
  const sb = getPublicServerClient()
  if (!sb || !mentorId) return []
  const { data, error } = await sb
    .from('library_resource_mentors')
    .select(`sort_order, library_resources ( ${RESOURCE_COLS} )`)
    .eq('mentor_id', mentorId)
  if (error) throw new Error(`getMentorLibraryResources: ${error.message}`)
  return (data || [])
    .map(r => r.library_resources)
    .filter(r => r && r.status === 'published')
    .map(r => mapResource(r))
}

/** Every published resource on the platform, newest first, for the /library feed. */
export async function getAllLibraryResources({ limit = 100 } = {}) {
  const sb = getPublicServerClient()
  if (!sb) return []
  const { data, error } = await sb
    .from('library_resources')
    .select(`${RESOURCE_COLS}, library_resource_mentors ( sort_order, mentors ( id, username, display_name, avatar_url, credentials, bio, socials, status ) )`)
    .eq('status', 'published')
    .order('updated_at', { ascending: false })
    .limit(limit)
  if (error) throw new Error(`getAllLibraryResources: ${error.message}`)
  return (data || []).map(row => {
    const mentors = (row.library_resource_mentors || [])
      .slice()
      .sort((a, b) => a.sort_order - b.sort_order)
      .map(lrm => mapMentor(lrm.mentors))
      .filter(Boolean)
    return mapResource(row, { mentors })
  })
}

/**
 * Best segment for a resource's public URL: its first credited mentor's
 * username, falling back to the owning publisher's slug so an uncredited
 * resource (e.g. an editor uploaded it and nobody has admin rights to
 * credit them — see pages/studio/library.js) still has somewhere to live.
 * The viewer at /library/[username]/[resourceId] never validates this
 * segment against credits — the resourceId alone gates access — so any
 * value here is safe, just cosmetic.
 */
export function libraryUrlSegment(resource) {
  return resource.mentors?.[0]?.id || resource.publisher?.slug || resource.publisherId
}

/** Every published resource under one publisher, for a publisher-facing library page. */
export async function getPublisherLibraryResources(publisherUuid) {
  const sb = getPublicServerClient()
  if (!sb || !publisherUuid) return []
  const { data, error } = await sb
    .from('library_resources')
    .select(RESOURCE_COLS)
    .eq('publisher_id', publisherUuid)
    .eq('status', 'published')
    .order('sort_order')
  if (error) throw new Error(`getPublisherLibraryResources: ${error.message}`)
  return (data || []).map(r => mapResource(r))
}

// ── Presentational helpers ──────────────────────────────────────────

export const KIND_META = {
  html: { label: 'Interactive page', icon: 'ri-code-box-line' },
  pdf: { label: 'PDF', icon: 'ri-file-pdf-2-line' },
  image: { label: 'Image', icon: 'ri-image-line' },
  doc: { label: 'File', icon: 'ri-file-line' },
  link: { label: 'Link', icon: 'ri-external-link-line' },
}

/** html/pdf/image render inline; doc/link only ever open/download. */
export function isInlineKind(kind) {
  return kind === 'html' || kind === 'pdf' || kind === 'image'
}

export function formatFileSize(bytes) {
  if (!bytes) return null
  const units = ['B', 'KB', 'MB', 'GB']
  let n = bytes
  let i = 0
  while (n >= 1024 && i < units.length - 1) {
    n /= 1024
    i += 1
  }
  return `${n < 10 && i > 0 ? n.toFixed(1) : Math.round(n)} ${units[i]}`
}
