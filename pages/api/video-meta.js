// ============================================================
// pages/api/video-meta.js — YouTube metadata lookup for the builder
//
// WHY THIS EXISTS
// The old lesson form made a mentor paste a raw video URL into a text
// box and then hand-type the duration as "m:ss". Nothing was verified,
// so a typo'd id produced a lesson that looked fine in the editor and
// was broken on the public site.
//
// This route resolves a pasted URL into real metadata (title, author,
// thumbnail) via YouTube's public oEmbed endpoint, so the builder can
// show the mentor exactly which video they just attached before they
// save. Duration is not part of oEmbed — components/VideoField.js
// reads that from the player itself.
//
// SECURITY
//   · Auth-gated. Without this it would be an open URL-fetch proxy
//     anyone could point at our egress.
//   · The URL is never forwarded verbatim: we extract an 11-character
//     YouTube id and rebuild a canonical watch URL from it, so this
//     cannot be used to reach an arbitrary host (SSRF).
//   · Only oEmbed's public fields are returned.
// ============================================================

import { getRequestUser } from '../../lib/supabaseServer'

const OEMBED = 'https://www.youtube.com/oembed'

/** Accepts a bare id, watch/short/embed/shorts URL. Returns the id or null. */
export function extractYouTubeId(input) {
  const v = String(input || '').trim()
  if (!v) return null
  if (/^[A-Za-z0-9_-]{11}$/.test(v)) return v
  const m = /(?:youtu\.be\/|\/embed\/|\/shorts\/|\/live\/|[?&]v=)([A-Za-z0-9_-]{11})/.exec(v)
  return m ? m[1] : null
}

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET')
    return res.status(405).json({ error: 'Method not allowed' })
  }

  // Auth-gated on purpose — see SECURITY above.
  const { user } = await getRequestUser(req)
  if (!user) return res.status(401).json({ error: 'Sign in to do that.' })

  const id = extractYouTubeId(req.query.url)
  if (!id) {
    return res.status(400).json({
      error: 'That does not look like a YouTube link. Paste the full watch URL or the 11-character video id.',
    })
  }

  // Rebuilt from the extracted id, never from user input.
  const target = `https://www.youtube.com/watch?v=${id}`

  try {
    const r = await fetch(`${OEMBED}?format=json&url=${encodeURIComponent(target)}`, {
      headers: { Accept: 'application/json' },
    })

    if (r.status === 404 || r.status === 401) {
      return res.status(404).json({
        error: 'No public video with that id. It may be private, deleted or region-locked.',
        videoId: id,
      })
    }
    if (!r.ok) throw new Error(`oEmbed returned ${r.status}`)

    const j = await r.json()
    return res.status(200).json({
      videoId: id,
      title: j.title || null,
      author: j.author_name || null,
      authorUrl: j.author_url || null,
      // mqdefault always exists; oEmbed's own thumbnail_url can be a
      // letterboxed size we do not want in a 16:9 card.
      thumbnail: `https://i.ytimg.com/vi/${id}/mqdefault.jpg`,
      canonicalUrl: target,
    })
  } catch (e) {
    // A lookup failure must not block saving — the builder degrades to
    // "we could not verify this, you can still save it".
    return res.status(502).json({
      error: 'Could not reach YouTube to verify that video. You can still save the lesson.',
      videoId: id,
    })
  }
}
