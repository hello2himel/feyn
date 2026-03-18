// ============================================================
// FEYN — COURSE HELPERS
// Taxonomy:
//   programs  = Classes (type:'class') or Interests (type:'interest')
//   subjects  = Courses
//   topics    = Chapters / Topics
//   lessons   = Video lessons
//
// NEVER overwritten by feyn_import.py or admin panel.
// ============================================================

import data, { coaches } from './courses'

// ── Taxonomy helpers ──────────────────────────────────────────────────

/** All programs of type 'class' (HSC, SSC, JSC, Grade 6-7…) */
export function getClasses() {
  return data.programs.filter(p => p.type === 'class')
}

/** All programs of type 'interest' (Music, Tech, Art…) */
export function getInterests() {
  return data.programs.filter(p => p.type === 'interest')
}

/** Alias for getClasses() + getInterests() grouped */
export function getClassified() {
  return {
    classes:   getClasses(),
    interests: getInterests(),
  }
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
  const program = getProgram(programId)
  if (!program) return null
  return program.subjects.find(s => s.id === subjectId) || null
}

export function getTopic(programId, subjectId, topicId) {
  const subject = getSubject(programId, subjectId)
  if (!subject) return null
  return subject.topics.find(t => t.id === topicId) || null
}

export function getLessonNav(programId, subjectId, topicId, lessonId) {
  const topic = getTopic(programId, subjectId, topicId)
  if (!topic) return { prev: null, next: null }
  const idx = topic.lessons.findIndex(l => l.id === lessonId)
  return {
    prev: idx > 0 ? topic.lessons[idx - 1] : null,
    next: idx < topic.lessons.length - 1 ? topic.lessons[idx + 1] : null,
  }
}

export function getAllPaths() {
  const paths = []
  for (const program of data.programs)
    for (const subject of program.subjects)
      for (const topic of subject.topics)
        for (const lesson of topic.lessons)
          paths.push({
            programId: program.id,
            subjectId: subject.id,
            topicId:   topic.id,
            lessonId:  lesson.id,
          })
  return paths
}

export function getTotalLessons(subject) {
  return subject.topics.reduce((acc, t) => acc + t.lessons.length, 0)
}

export function getSubjectMaterials(subject) {
  const out = []
  for (const m of (subject.materials || []))
    out.push({ ...m, _source: 'course' })
  for (const topic of subject.topics)
    for (const lesson of topic.lessons)
      for (const m of (lesson.materials || []))
        out.push({
          ...m,
          _source:      'lesson',
          _lessonTitle: lesson.title,
          _topicId:     topic.id,
          _lessonId:    lesson.id,
        })
  return out
}

/** classifySubjects — used by AuthFlow and feed logic.
 *  Now reads program.type directly instead of using heuristics.
 *  Returns { classes: [{program,subject}], genres: [{program,subject}] }
 */
export function classifySubjects(programs) {
  const classes = []
  const genres  = []
  for (const program of programs) {
    for (const subject of program.subjects) {
      if (program.type === 'interest' || subject.genre) {
        genres.push({ program, subject })
      } else {
        classes.push({ program, subject })
      }
    }
  }
  return { classes, genres }
}
