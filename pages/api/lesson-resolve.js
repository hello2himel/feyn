// ============================================================
// pages/api/lesson-resolve.js — resolve a lesson slug path
//
// GET /api/lesson-resolve?programId=hsc&subjectId=physics
//                        &topicId=dynamics&lessonId=displacement-velocity
//
// The "continue watching" card only stores a 4-segment progress key
// (program/subject/topic/lesson) — no skill segment, because that is
// what lib/userStore has always written. Resolving it to a linkable
// URL needs the skill slug, plus the titles for display.
//
// Public, published content only, so the anon client with RLS on is
// exactly the right authority here.
// ============================================================

import { getPublicServerClient, isServerSupabaseConfigured } from '../../lib/supabaseServer'
import { toVideoId, formatDuration } from '../../data/courseHelpers'

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET')
    return res.status(405).json({ error: 'Method not allowed' })
  }
  if (!isServerSupabaseConfigured()) return res.status(200).json({ resolved: null })

  const { programId, subjectId, topicId, lessonId } = req.query
  if (!programId || !subjectId || !topicId || !lessonId) {
    return res.status(400).json({ error: 'programId, subjectId, topicId and lessonId are required' })
  }

  const sb = getPublicServerClient()
  const { data, error } = await sb
    .from('lessons')
    .select(`
      slug, title, video_url, duration_seconds, status,
      skills!inner (
        slug,
        topics!inner (
          slug, name,
          subjects!inner (
            slug, name, status,
            programs!inner ( slug, name )
          )
        )
      )
    `)
    .eq('slug', lessonId)
    .eq('status', 'published')
    .eq('skills.topics.slug', topicId)
    .eq('skills.topics.subjects.slug', subjectId)
    .eq('skills.topics.subjects.programs.slug', programId)
    .maybeSingle()

  if (error) return res.status(500).json({ error: error.message })
  if (!data) return res.status(200).json({ resolved: null })

  const topic = data.skills.topics
  const subject = topic.subjects

  res.setHeader('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=300')
  return res.status(200).json({
    resolved: {
      program: { id: subject.programs.slug, name: subject.programs.name },
      subject: { id: subject.slug, name: subject.name },
      topic: { id: topic.slug, name: topic.name },
      skill: { id: data.skills.slug },
      lesson: {
        id: data.slug,
        title: data.title,
        videoId: toVideoId(data.video_url),
        duration: formatDuration(data.duration_seconds),
      },
    },
  })
}
