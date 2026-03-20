// ============================================================
// FEYN — DATA INDEX
//
// Hierarchy:
//   program (class | genre)
//     subject
//       topic
//         skill
//           lesson
//             question[]
//
// DB key formats:
//   skill_key:  "programId/subjectId/topicId/skillId"
//   lesson_key: "programId/subjectId/topicId/skillId/lessonIdx"
//
// To add content:
//   1. Create data/topics/{program}/{subject}/{topic}.js
//   2. Import it in data/subjects/{program}/{subject}.js
//   3. Done — it flows up automatically.
// ============================================================

import hsc       from './programs/hsc.js'
import ssc       from './programs/ssc.js'
import jsc       from './programs/jsc.js'
import interests from './programs/interests.js'

const data = {
  programs: [hsc, ssc, jsc, interests],
}

export default data

// ── Helpers ───────────────────────────────────────────────────────────

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

export function getLesson(programId, subjectId, topicId, skillId, lessonIdx) {
  return getSkill(programId, subjectId, topicId, skillId)?.lessons[lessonIdx] || null
}

// Returns all programs of a given type ('class' | 'genre')
export function getProgramsByType(type) {
  return data.programs.filter(p => p.type === type)
}

// Flattens all topics across a subject
export function getTopicsForSubject(programId, subjectId) {
  return getSubject(programId, subjectId)?.topics || []
}

// Counts total skills in a topic
export function countSkills(topic) {
  return topic?.skills?.length || 0
}

// Counts total lessons in a topic
export function countLessons(topic) {
  return topic?.skills?.reduce((sum, s) => sum + (s.lessons?.length || 0), 0) || 0
}

// Counts total questions in a topic
export function countQuestions(topic) {
  return topic?.skills?.reduce((sum, s) =>
    sum + s.lessons?.reduce((ls, l) => ls + (l.questions?.length || 0), 0)
  , 0) || 0
}

// Build the full skill key
export function skillKey(programId, subjectId, topicId, skillId) {
  return `${programId}/${subjectId}/${topicId}/${skillId}`
}

// Build the full lesson key
export function lessonKey(programId, subjectId, topicId, skillId, lessonIdx) {
  return `${programId}/${subjectId}/${topicId}/${skillId}/${lessonIdx}`
}
