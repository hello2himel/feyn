// ============================================================
// FEYN — COURSE HELPERS (v6)
// Taxonomy:
//   programs  = Classes (type:'class') or Interests (type:'interest')
//   subjects  = Courses
//   topics    = Topics/Chapters
//   skills    = Skills (each with lessons)
//   lessons   = Video lesson + questions
//
// ── VIDEO SOURCE MODEL ────────────────────────────────────
// Each lesson carries an optional `source` field:
//   source: { name, instructor, url }
//
// This separates three distinct roles:
//   • coachIds (topic/subject)  → Feyn's own curating instructors
//                                 who structure courses, write questions,
//                                 and sign certificates.
//   • source.instructor (lesson) → The person teaching in the primary video
//                                  (e.g. Ratul Khan)
//   • source.name (lesson)       → The platform that produced the video
//                                  (e.g. OnnoRokom Pathshala)
//
// Feyn coaches are listed below for coach pages and certificates.
// Video source platforms/instructors live only in lesson data and
// are displayed as a read-only attribution badge — they do NOT get
// coach profile pages and do NOT appear on certificates.
// ============================================================

import data from './index.js'

export const coaches = [
  // ── Feyn's own instructors ────────────────────────────────
  {
    id: 'himel',
    name: 'Himel',
    title: 'Founder & Lead Instructor',
    bio: 'Builds every concept from the ground up using the Feynman technique. Curates and structures HSC Physics and Mathematics on Feyn.',
    avatar: null, signature: null,
    socials: { youtube: '', website: 'https://hello2himel.netlify.app' },
  },
  {
    id: 'ashiqur',
    name: 'Md. Ashiqur Rahman',
    title: 'Chemistry Instructor',
    bio: 'Specialist in HSC Chemistry. Known for making organic reactions intuitive and memorable.',
    avatar: null, signature: null,
    socials: { youtube: '', website: '' },
  },
  {
    id: 'nadia',
    name: 'Nadia Islam',
    title: 'Biology & Science Instructor',
    bio: 'Brings biology to life with diagrams, analogies, and real-world examples.',
    avatar: null, signature: null,
    socials: { youtube: '', website: '' },
  },
  {
    id: 'rafiq',
    name: 'Rafiqul Hasan',
    title: 'Mathematics Instructor',
    bio: 'Specialist in SSC and JSC mathematics. Focuses on problem-solving strategies.',
    avatar: null, signature: null,
    socials: { youtube: '', website: '' },
  },
]

// ── Video source helpers ──────────────────────────────────────────────
// getSource returns the source object for a lesson (or null).
// Use this in UI to render attribution badges — never use it for
// coach pages or certificate signing.
export function getSource(lesson) {
  return lesson?.source || null
}

// ── Taxonomy helpers ──────────────────────────────────────────────────

export function getClasses() {
  return data.programs.filter(p => p.type === 'class')
}

export function getInterests() {
  return data.programs.filter(p => p.type === 'genre' || p.type === 'interest')
}

export function classifySubjects(programs) {
  const classes = []
  const genres  = []
  for (const program of programs) {
    for (const subject of program.subjects) {
      if (program.type === 'class') classes.push({ program, subject })
      else genres.push({ program, subject })
    }
  }
  return { classes, genres }
}

// ── Coach helpers ─────────────────────────────────────────────────────

export function getCoach(coachId) {
  return coaches.find(c => c.id === coachId) || null
}

export function getCoachesFor(ids = []) {
  return ids.map(id => coaches.find(c => c.id === id)).filter(Boolean)
}

// ── Navigation helpers ────────────────────────────────────────────────

export function getProgram(programId) {
  return data.programs.find(p => p.id === programId) || null
}

export function getSubject(programId, subjectId) {
  return getProgram(programId)?.subjects.find(s => s.id === subjectId) || null
}

export function getTopic(programId, subjectId, topicId) {
  return getSubject(programId, subjectId)?.topics.find(t => t.id === topicId) || null
}

export function getSkill(programId, subjectId, topicId, skillId) {
  return getTopic(programId, subjectId, topicId)?.skills.find(s => s.id === skillId) || null
}

// ── Flat lesson navigation across all skills in a topic ──────────────
// Returns { prev, next } for a given lesson — crossing skill boundaries
export function getLessonNav(programId, subjectId, topicId, skillId, lessonId) {
  const topic = getTopic(programId, subjectId, topicId)
  if (!topic) return { prev: null, next: null }

  // Build flat list of { skill, lesson } across all skills
  const flat = []
  for (const skill of topic.skills) {
    for (const lesson of (skill.lessons || [])) {
      flat.push({ skill, lesson })
    }
  }

  const idx = flat.findIndex(e => e.skill.id === skillId && e.lesson.id === lessonId)
  return {
    prev: idx > 0 ? flat[idx - 1] : null,
    next: idx < flat.length - 1 ? flat[idx + 1] : null,
  }
}

// ── Count helpers ─────────────────────────────────────────────────────

export function getTotalLessons(subject) {
  let count = 0
  for (const topic of subject.topics)
    for (const skill of (topic.skills || []))
      count += (skill.lessons || []).length
  return count
}

export function getTopicLessonCount(topic) {
  let count = 0
  for (const skill of (topic.skills || []))
    count += (skill.lessons || []).length
  return count
}

// First video in a subject (for thumbnail)
export function getSubjectFirstVideo(subject) {
  for (const topic of subject.topics)
    for (const skill of (topic.skills || []))
      for (const lesson of (skill.lessons || []))
        if (lesson.videoId && lesson.videoId !== 'YOUTUBE_ID_HERE') return lesson.videoId
  return null
}

// First video in a topic
export function getTopicFirstVideo(topic) {
  for (const skill of (topic.skills || []))
    for (const lesson of (skill.lessons || []))
      if (lesson.videoId && lesson.videoId !== 'YOUTUBE_ID_HERE') return lesson.videoId
  return null
}

// ── Materials helpers ─────────────────────────────────────────────────

export function getSubjectMaterials(subject) {
  const out = []
  for (const m of (subject.materials || []))
    out.push({ ...m, _source: 'course' })
  for (const topic of subject.topics)
    for (const skill of (topic.skills || []))
      for (const lesson of (skill.lessons || []))
        for (const m of (lesson.materials || []))
          out.push({
            ...m,
            _source:      'lesson',
            _skillId:     skill.id,
            _skillName:   skill.name,
            _lessonId:    lesson.id,
            _lessonTitle: lesson.title,
          })
  return out
}

// ── Static path helpers ───────────────────────────────────────────────

export function getAllLessonPaths() {
  const paths = []
  for (const program of data.programs)
    for (const subject of program.subjects)
      for (const topic of subject.topics)
        for (const skill of (topic.skills || []))
          for (const lesson of (skill.lessons || []))
            paths.push({
              programId: program.id,
              subjectId: subject.id,
              topicId:   topic.id,
              skillId:   skill.id,
              lessonId:  lesson.id,
            })
  return paths
}

export function getAllTopicPaths() {
  const paths = []
  for (const program of data.programs)
    for (const subject of program.subjects)
      for (const topic of subject.topics)
        paths.push({ programId: program.id, subjectId: subject.id, topicId: topic.id })
  return paths
}

export function getAllSubjectPaths() {
  const paths = []
  for (const program of data.programs)
    for (const subject of program.subjects)
      paths.push({ programId: program.id, subjectId: subject.id })
  return paths
}

// ── Compat alias ──────────────────────────────────────────────────────
export function getClassified() {
  return {
    classes:   getClasses(),
    interests: getInterests(),
  }
}
