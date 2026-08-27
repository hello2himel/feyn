// ============================================================
// data/courseHelpers.js — content layer (v7, Supabase-backed)
//
// Everything below a program is now read from Postgres. The exported
// names and the *shapes they return* are unchanged from v6 on purpose:
// the pages, the ~800-line QAEngine and lib/userStore.js all read the
// old flat field names, and mapping here is far less invasive than
// renaming fields across every component.
//
// ── SHAPE MAPPING (schema → UI) ───────────────────────────────
//   subjects.slug              → subject.id          (URL segment)
//   subjects.has_certificate   → subject.certificate
//   subjects.status != live    → subject.comingSoon
//   subject_mentors join       → subject.coaches[]
//   programs.kind              → program.type ('class' | 'interest')
//   lessons.video_url          → lesson.videoId      (YouTube id extracted)
//   lessons.duration_seconds   → lesson.duration     ("~15:00")
//   questions.kind             → q.type
//   questions.options/answer   → q.options/correct/answer/aliases/
//                                modelAnswer/pairs
//
// ── FETCH vs PURE ─────────────────────────────────────────────
// Fetchers (getProgram, getSubject, …) are async and hit the DB.
// Pure helpers (getTotalLessons, getLessonNav, getSubjectMaterials, …)
// stay synchronous and operate on an already-fetched tree, so they
// still work inside a React render.
//
// Reads go through the anon-key client with RLS on, so an unpublished
// course cannot leak into a statically cached page even by mistake.
// When Supabase is not configured every fetcher returns null/[] and
// the site builds as an empty catalogue instead of failing.
// ============================================================

import { getPublicServerClient } from '../lib/supabaseServer'

// ── Field-level mappers ───────────────────────────────────────────────

// video_url accepts a bare id, a watch URL, a short URL or an embed URL.
// The player (components/SmartPlayer.js) wants the bare id.
export function toVideoId(videoUrl) {
  if (!videoUrl) return null
  const v = String(videoUrl).trim()
  if (!v) return null
  if (!/[/?.]/.test(v)) return v // already an id
  const m =
    /(?:youtu\.be\/|\/embed\/|\/shorts\/|[?&]v=)([A-Za-z0-9_-]{11})/.exec(v)
  return m ? m[1] : v
}

export function formatDuration(seconds) {
  if (!seconds && seconds !== 0) return null
  const s = Math.max(0, Math.round(Number(seconds) || 0))
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const sec = s % 60
  const mm = h > 0 ? String(m).padStart(2, '0') : String(m)
  return `~${h > 0 ? `${h}:` : ''}${mm}:${String(sec).padStart(2, '0')}`
}

export function parseDuration(text) {
  if (!text) return null
  const parts = String(text).replace('~', '').trim().split(':').map(Number)
  if (parts.some(Number.isNaN)) return null
  return parts.reduce((acc, p) => acc * 60 + p, 0)
}

// questions.kind + options/answer jsonb → the flat shape QAEngine reads.
// Option ids are stable in the DB; the engine indexes by position, so
// correctness is translated id → index here and nowhere else.
export function mapQuestion(row) {
  const optionObjs = Array.isArray(row.options) ? row.options : []
  const options = optionObjs.map(o => (typeof o === 'string' ? o : o?.text ?? ''))
  const ids = optionObjs.map((o, i) => (typeof o === 'string' ? String(i) : o?.id ?? String(i)))
  const answer = row.answer && typeof row.answer === 'object' ? row.answer : {}
  const idxOf = id => {
    const i = ids.indexOf(id)
    return i === -1 ? (Number.isInteger(id) ? id : -1) : i
  }

  const q = {
    id: row.id,
    type: row.kind,
    prompt: row.prompt,
    explanation: row.explanation || '',
  }

  switch (row.kind) {
    case 'mcq':
      return { ...q, options, correct: idxOf(answer.correct) }
    case 'tap-correct':
      return { ...q, options, correct: (answer.correct || []).map(idxOf).filter(i => i >= 0) }
    case 'fill':
      return { ...q, answer: answer.value ?? '', aliases: answer.aliases || [] }
    case 'explain':
      return { ...q, modelAnswer: answer.model ?? '' }
    case 'match':
      return { ...q, pairs: answer.pairs || [] }
    default:
      return { ...q, options }
  }
}

/** Inverse of mapQuestion — used by the editor before writing back. */
export function unmapQuestion(q) {
  const optionObjs = (q.options || []).map((text, i) => ({ id: `o${i + 1}`, text }))
  let answer = {}
  switch (q.type) {
    case 'mcq':
      answer = { correct: optionObjs[q.correct]?.id ?? null }
      break
    case 'tap-correct':
      answer = { correct: (q.correct || []).map(i => optionObjs[i]?.id).filter(Boolean) }
      break
    case 'fill':
      answer = { value: q.answer ?? '', aliases: q.aliases || [] }
      break
    case 'explain':
      answer = { model: q.modelAnswer ?? '' }
      break
    case 'match':
      answer = { pairs: q.pairs || [] }
      break
    default:
      break
  }
  return {
    kind: q.type,
    prompt: q.prompt,
    options: ['mcq', 'tap-correct'].includes(q.type) ? optionObjs : [],
    answer,
    explanation: q.explanation || null,
  }
}

// mentors row → the object CoachChip / the coach pages expect.
// `id` is the username because that is what /m/[username] routes on.
export function mapMentor(row) {
  if (!row) return null
  return {
    id: row.username || row.id,
    mentorId: row.id,
    name: row.display_name,
    title: row.credentials || '',
    bio: row.bio || '',
    avatar: row.avatar_url || null,
    signature: row.signature_url || null,
    socials: row.socials || {},
  }
}

function mapLesson(row) {
  return {
    id: row.slug,
    uuid: row.id,
    title: row.title,
    videoId: toVideoId(row.video_url),
    duration: formatDuration(row.duration_seconds),
    intro: row.intro || '',
    content: row.content_md || '',
    source: row.source || null,
    materials: row.materials || [],
    status: row.status,
    questions: (row.questions || [])
      .slice()
      .sort((a, b) => a.sort_order - b.sort_order)
      .map(mapQuestion),
  }
}

function mapSkill(row) {
  return {
    id: row.slug,
    uuid: row.id,
    name: row.name,
    description: row.description || '',
    icon: row.icon || null,
    lessons: (row.lessons || [])
      .filter(l => l.status === 'published')
      .sort((a, b) => a.sort_order - b.sort_order)
      .map(mapLesson),
  }
}

function mapTopic(row) {
  return {
    id: row.slug,
    uuid: row.id,
    name: row.name,
    description: row.description || '',
    icon: row.icon || null,
    primarySource: row.primary_source || null,
    skills: (row.skills || []).sort((a, b) => a.sort_order - b.sort_order).map(mapSkill),
  }
}

function mapPublisher(row) {
  if (!row) return null
  return {
    id: row.slug,
    uuid: row.id,
    name: row.name,
    slug: row.slug,
    type: row.type,
    description: row.description || '',
    logo: row.logo_url || null,
    brandColor: row.brand_color || null,
  }
}

function mapSubject(row, { withTopics = true } = {}) {
  const mentors = (row.subject_mentors || [])
    .slice()
    .sort((a, b) => a.sort_order - b.sort_order)
    .map(sm => mapMentor(sm.mentors))
    .filter(Boolean)

  return {
    id: row.slug,
    uuid: row.id,
    name: row.name,
    description: row.description || '',
    icon: row.icon || null,
    cover: row.cover_image_url || null,
    certificate: !!row.has_certificate,
    comingSoon: row.status !== 'published',
    status: row.status,
    publisher: mapPublisher(row.publishers),
    publisherId: row.publisher_id,
    coaches: mentors,
    coachIds: mentors.map(m => m.id),
    materials: [],
    topics: withTopics ? (row.topics || []).sort((a, b) => a.sort_order - b.sort_order).map(mapTopic) : [],
  }
}

// ── Card statistics ───────────────────────────────────────────────────
//
// Course *cards* (home feed, program page, mentor and publisher pages)
// show "N topics · M lessons" and a thumbnail from the first video.
// Fetching every subject's full tree just to count its leaves would
// pull the entire catalogue into one page's props.
//
// Instead two flat queries cover any number of subjects: one for topic
// counts, one for lessons (which carries enough ordering to pick the
// first video). The results are attached as lessonCount / topicCount /
// firstVideoId, and getTotalLessons()/getSubjectFirstVideo() fall back
// to them when the tree is absent.
async function attachSubjectStats(subjects) {
  const ids = subjects.map(s => s.uuid).filter(Boolean)
  if (!ids.length) return subjects
  const sb = getPublicServerClient()
  if (!sb) return subjects

  const [topicsRes, lessonsRes] = await Promise.all([
    sb.from('topics').select('id, subject_id, sort_order').in('subject_id', ids),
    sb
      .from('lessons')
      .select('slug, video_url, sort_order, skills!inner ( sort_order, topics!inner ( id, slug, subject_id, sort_order ) )')
      .eq('status', 'published')
      .in('skills.topics.subject_id', ids),
  ])

  const topicCount = {}
  for (const t of topicsRes.data || []) {
    topicCount[t.subject_id] = (topicCount[t.subject_id] || 0) + 1
  }

  const bySubject = {}
  for (const l of lessonsRes.data || []) {
    const sid = l.skills?.topics?.subject_id
    if (!sid) continue
    ;(bySubject[sid] = bySubject[sid] || []).push({
      videoId: toVideoId(l.video_url),
      topic: l.skills.topics.slug,
      lesson: l.slug,
      order: [l.skills.topics.sort_order, l.skills.sort_order, l.sort_order],
    })
  }

  for (const s of subjects) {
    const rows = (bySubject[s.uuid] || []).sort(
      (a, b) => a.order[0] - b.order[0] || a.order[1] - b.order[1] || a.order[2] - b.order[2]
    )
    s.lessonCount = rows.length
    s.topicCount = topicCount[s.uuid] || 0
    s.firstVideoId = rows.find(r => r.videoId)?.videoId || null
    // Progress is keyed by slug path, so a card can compute completion
    // without its topic tree — see lib/userStore#getSubjectProgress.
    s.lessonPaths = rows.map(r => ({ topic: r.topic, lesson: r.lesson }))
  }
  return subjects
}

function mapProgram(row, { withSubjects = true } = {}) {
  return {
    id: row.slug,
    uuid: row.id,
    name: row.name,
    description: row.description || '',
    icon: row.icon || null,
    type: row.kind, // 'class' | 'interest'
    subjects: withSubjects
      ? (row.subjects || []).sort((a, b) => a.sort_order - b.sort_order).map(s => mapSubject(s, { withTopics: false }))
      : [],
  }
}

// ── Select fragments ──────────────────────────────────────────────────

const MENTOR_COLS = 'id, username, display_name, credentials, bio, avatar_url, signature_url, socials'

const SUBJECT_CARD = `
  id, slug, name, description, icon, cover_image_url, has_certificate, status,
  sort_order, publisher_id,
  publishers ( id, slug, name, type, description, logo_url, brand_color ),
  subject_mentors ( sort_order, role_label, mentors ( ${MENTOR_COLS} ) )
`

const SUBJECT_TREE = `
  ${SUBJECT_CARD},
  topics (
    id, slug, name, description, icon, primary_source, sort_order,
    skills (
      id, slug, name, description, icon, sort_order,
      lessons (
        id, slug, title, video_url, duration_seconds, intro, content_md,
        materials, source, sort_order, status,
        questions ( id, kind, prompt, options, answer, explanation, sort_order )
      )
    )
  )
`

// ── Fetchers ──────────────────────────────────────────────────────────

export async function getPrograms() {
  const sb = getPublicServerClient()
  if (!sb) return []
  const { data, error } = await sb
    .from('programs')
    .select(`id, slug, name, description, icon, kind, sort_order, subjects ( ${SUBJECT_CARD} )`)
    .order('sort_order')
  if (error) throw new Error(`getPrograms: ${error.message}`)
  const programs = (data || []).map(p => mapProgram(p))
  await attachSubjectStats(programs.flatMap(p => p.subjects))
  return programs
}

export async function getProgram(programId) {
  const sb = getPublicServerClient()
  if (!sb) return null
  const { data, error } = await sb
    .from('programs')
    .select(`id, slug, name, description, icon, kind, sort_order, subjects ( ${SUBJECT_CARD} )`)
    .eq('slug', programId)
    .maybeSingle()
  if (error) throw new Error(`getProgram: ${error.message}`)
  if (!data) return null
  const program = mapProgram(data)
  await attachSubjectStats(program.subjects)
  return program
}

/** Full tree for one course: topics → skills → lessons → questions. */
export async function getSubject(programId, subjectId) {
  const sb = getPublicServerClient()
  if (!sb) return null
  const { data, error } = await sb
    .from('subjects')
    .select(`${SUBJECT_TREE}, programs!inner ( slug )`)
    .eq('slug', subjectId)
    .eq('programs.slug', programId)
    .maybeSingle()
  if (error) throw new Error(`getSubject: ${error.message}`)
  return data ? mapSubject(data) : null
}

export async function getTopic(programId, subjectId, topicId) {
  const subject = await getSubject(programId, subjectId)
  return subject?.topics.find(t => t.id === topicId) || null
}

export async function getSkill(programId, subjectId, topicId, skillId) {
  const topic = await getTopic(programId, subjectId, topicId)
  return topic?.skills.find(s => s.id === skillId) || null
}

export async function getClasses() {
  return (await getPrograms()).filter(p => p.type === 'class')
}

export async function getInterests() {
  return (await getPrograms()).filter(p => p.type === 'interest')
}

export async function getClassified() {
  const programs = await getPrograms()
  return {
    classes: programs.filter(p => p.type === 'class'),
    interests: programs.filter(p => p.type !== 'class'),
  }
}

/** Every course a mentor is credited on, across every publisher (spec §7). */
export async function getMentorByUsername(username) {
  const sb = getPublicServerClient()
  if (!sb) return null
  const { data, error } = await sb
    .from('mentors')
    .select(`${MENTOR_COLS}, status`)
    .eq('username', String(username || '').toLowerCase())
    .maybeSingle()
  if (error) throw new Error(`getMentorByUsername: ${error.message}`)
  if (!data || data.status !== 'approved') return null
  return mapMentor(data)
}

export async function getMentorCourses(mentorId) {
  const sb = getPublicServerClient()
  if (!sb) return []
  const { data, error } = await sb
    .from('subject_mentors')
    .select(`role_label, subjects ( ${SUBJECT_CARD}, programs ( slug, name, kind ) )`)
    .eq('mentor_id', mentorId)
  if (error) throw new Error(`getMentorCourses: ${error.message}`)
  return (data || [])
    .map(r => r.subjects)
    .filter(s => s && s.status === 'published')
    .map(s => ({
      program: { id: s.programs?.slug, name: s.programs?.name, type: s.programs?.kind },
      subject: mapSubject(s, { withTopics: false }),
    }))
}

export async function getMentors() {
  const sb = getPublicServerClient()
  if (!sb) return []
  const { data, error } = await sb
    .from('mentors')
    .select(MENTOR_COLS)
    .eq('status', 'approved')
    .order('display_name')
  if (error) throw new Error(`getMentors: ${error.message}`)
  return (data || []).map(mapMentor)
}

export async function getPublisherBySlug(slug) {
  const sb = getPublicServerClient()
  if (!sb) return null
  const { data, error } = await sb
    .from('publishers')
    .select('id, slug, name, type, description, logo_url, brand_color, status, join_policy, created_at')
    .eq('slug', String(slug || '').toLowerCase())
    .maybeSingle()
  if (error) throw new Error(`getPublisherBySlug: ${error.message}`)
  if (!data || data.status !== 'approved') return null
  return { ...mapPublisher(data), joinPolicy: data.join_policy }
}

export async function getPublisherCourses(publisherUuid) {
  const sb = getPublicServerClient()
  if (!sb) return []
  const { data, error } = await sb
    .from('subjects')
    .select(`${SUBJECT_CARD}, programs ( slug, name, kind )`)
    .eq('publisher_id', publisherUuid)
    .eq('status', 'published')
    .order('sort_order')
  if (error) throw new Error(`getPublisherCourses: ${error.message}`)
  return (data || []).map(s => ({
    program: { id: s.programs?.slug, name: s.programs?.name, type: s.programs?.kind },
    subject: mapSubject(s, { withTopics: false }),
  }))
}

/** Public member list for /p/[slug] — approved memberships only. */
export async function getPublisherMembers(publisherUuid) {
  const sb = getPublicServerClient()
  if (!sb) return []
  const { data, error } = await sb
    .from('publisher_memberships')
    .select(`role, mentors ( ${MENTOR_COLS} )`)
    .eq('publisher_id', publisherUuid)
    .eq('status', 'approved')
  if (error) return [] // membership visibility is intentionally restricted
  return (data || [])
    .filter(m => m.mentors)
    .map(m => ({ role: m.role, mentor: mapMentor(m.mentors) }))
}

export async function getPublishers() {
  const sb = getPublicServerClient()
  if (!sb) return []
  const { data, error } = await sb
    .from('publishers')
    .select('id, slug, name, type, description, logo_url, brand_color, join_policy')
    .eq('status', 'approved')
    .order('name')
  if (error) throw new Error(`getPublishers: ${error.message}`)
  return (data || []).map(p => ({ ...mapPublisher(p), joinPolicy: p.join_policy }))
}

// ── Pure tree helpers (unchanged semantics) ───────────────────────────

export function getSource(lesson) {
  return lesson?.source || null
}

export function classifySubjects(programs) {
  const classes = []
  const genres = []
  for (const program of programs) {
    for (const subject of program.subjects) {
      if (program.type === 'class') classes.push({ program, subject })
      else genres.push({ program, subject })
    }
  }
  return { classes, genres }
}

export function getCoachesFor(subject) {
  return subject?.coaches || []
}

export function getLessonNav(subject, topicId, skillId, lessonId) {
  const topic = subject?.topics?.find(t => t.id === topicId)
  if (!topic) return { prev: null, next: null }

  const flat = []
  for (const skill of topic.skills) for (const lesson of skill.lessons || []) flat.push({ skill, lesson })

  const idx = flat.findIndex(e => e.skill.id === skillId && e.lesson.id === lessonId)
  return {
    prev: idx > 0 ? flat[idx - 1] : null,
    next: idx >= 0 && idx < flat.length - 1 ? flat[idx + 1] : null,
  }
}

export function getTotalLessons(subject) {
  if (!subject?.topics?.length && typeof subject?.lessonCount === 'number') return subject.lessonCount
  let count = 0
  for (const topic of subject?.topics || [])
    for (const skill of topic.skills || []) count += (skill.lessons || []).length
  return count
}

export function getTopicCount(subject) {
  if (subject?.topics?.length) return subject.topics.length
  return subject?.topicCount || 0
}

export function getTopicLessonCount(topic) {
  let count = 0
  for (const skill of topic?.skills || []) count += (skill.lessons || []).length
  return count
}

export function getSubjectFirstVideo(subject) {
  for (const topic of subject?.topics || [])
    for (const skill of topic.skills || [])
      for (const lesson of skill.lessons || []) if (lesson.videoId) return lesson.videoId
  return subject?.firstVideoId || null
}

export function getTopicFirstVideo(topic) {
  for (const skill of topic?.skills || [])
    for (const lesson of skill.lessons || []) if (lesson.videoId) return lesson.videoId
  return null
}

export function getSubjectMaterials(subject) {
  const out = []
  for (const m of subject?.materials || []) out.push({ ...m, _source: 'course' })
  for (const topic of subject?.topics || [])
    for (const skill of topic.skills || [])
      for (const lesson of skill.lessons || [])
        for (const m of lesson.materials || [])
          out.push({
            ...m,
            _source: 'lesson',
            _skillId: skill.id,
            _skillName: skill.name,
            _lessonId: lesson.id,
            _lessonTitle: lesson.title,
          })
  return out
}

// ── Static path helpers (ISR: a miss is rendered on demand) ───────────
//
// These pre-render the published catalogue at build time. Anything
// added later is served by fallback:'blocking' and then cached, which
// is the whole reason for moving off fallback:false.

export async function getAllProgramPaths() {
  const sb = getPublicServerClient()
  if (!sb) return []
  const { data } = await sb.from('programs').select('slug')
  return (data || []).map(p => ({ programId: p.slug }))
}

export async function getAllSubjectPaths() {
  const sb = getPublicServerClient()
  if (!sb) return []
  const { data } = await sb
    .from('subjects')
    .select('slug, programs!inner ( slug )')
    .eq('status', 'published')
  return (data || []).map(s => ({ programId: s.programs.slug, subjectId: s.slug }))
}

export async function getAllTopicPaths() {
  const sb = getPublicServerClient()
  if (!sb) return []
  const { data } = await sb
    .from('topics')
    .select('slug, subjects!inner ( slug, status, programs!inner ( slug ) )')
    .eq('subjects.status', 'published')
  return (data || []).map(t => ({
    programId: t.subjects.programs.slug,
    subjectId: t.subjects.slug,
    topicId: t.slug,
  }))
}

export async function getAllLessonPaths() {
  const sb = getPublicServerClient()
  if (!sb) return []
  const { data } = await sb
    .from('lessons')
    .select(
      'slug, status, skills!inner ( slug, topics!inner ( slug, subjects!inner ( slug, status, programs!inner ( slug ) ) ) )'
    )
    .eq('status', 'published')
    .eq('skills.topics.subjects.status', 'published')
  return (data || []).map(l => {
    const skill = l.skills
    const topic = skill.topics
    const subject = topic.subjects
    return {
      programId: subject.programs.slug,
      subjectId: subject.slug,
      topicId: topic.slug,
      skillId: skill.slug,
      lessonId: l.slug,
    }
  })
}

export async function getAllMentorPaths() {
  const sb = getPublicServerClient()
  if (!sb) return []
  const { data } = await sb.from('mentors').select('username').eq('status', 'approved')
  return (data || []).filter(m => m.username).map(m => ({ username: m.username }))
}

export async function getAllPublisherPaths() {
  const sb = getPublicServerClient()
  if (!sb) return []
  const { data } = await sb.from('publishers').select('slug').eq('status', 'approved')
  return (data || []).map(p => ({ slug: p.slug }))
}
