// ============================================================
// FEYN — VIDEO MAP
// Maps lesson IDs → YouTube video IDs
// Add real video IDs here as lessons are filmed.
// Lessons with no entry (or 'YOUTUBE_ID_HERE') show a placeholder.
// ============================================================

const VIDEO_MAP = {
  // ── HSC Physics / Dynamics ────────────────────────────────
  'force-intro':       'CQYgIBDFDlo',
  'vectors-intro':     'fNk_zzaMoSs',
  'vectors-components':'wDJmLJkeXEM',
  'newtons-first':     'CQYgIBDFDlo',
  'newtons-second':    'ou9YMWlJgkE',
  'newtons-third':     'By-ggTfeuJU',
  'fbd-intro':         'ou9YMWlJgkE',
  'fbd-ramps':         'By-ggTfeuJU',
  'kinematics-intro':  'GtOt7Os41iE',
  'momentum-intro':    'DRb5PSxJerM',
  'momentum-conservation': 'FOkQszg1-j8',
  'work-energy':       'VYgSXBjEA8I',
  'power-efficiency':  'vqDbMEdLiCs',
  'circular-motion':   'O7zZPqar50g',
  'gravity':           '4i1MUWJoI0U',

  // ── HSC Physics / Waves ───────────────────────────────────
  'wave-properties':   'GtOt7Os41iE',
  'wave-types':        'DRb5PSxJerM',
  'sound-waves':       'FOkQszg1-j8',
  'light-waves':       'VYgSXBjEA8I',
  'interference':      'vqDbMEdLiCs',
  'diffraction':       'O7zZPqar50g',

  // ── HSC Physics / Thermodynamics ─────────────────────────
  'heat-intro':        'vqDbMEdLiCs',
  'temperature':       'O7zZPqar50g',
  'first-law':         '4i1MUWJoI0U',
  'second-law':        'GtOt7Os41iE',

  // ── HSC Physics / Electricity ─────────────────────────────
  'electric-charge':   'DRb5PSxJerM',
  'electric-field':    'FOkQszg1-j8',
  'circuits-intro':    'VYgSXBjEA8I',
  'ohms-law':          'vqDbMEdLiCs',

  // ── HSC Physics / Magnetism ───────────────────────────────
  'magnetic-field':    'O7zZPqar50g',
  'electromagnetism':  '4i1MUWJoI0U',
  'faraday':           'GtOt7Os41iE',

  // ── HSC Physics / Modern Physics ─────────────────────────
  'photoelectric':     'DRb5PSxJerM',
  'quantum-intro':     'FOkQszg1-j8',
  'special-relativity':'VYgSXBjEA8I',
  'nuclear-physics':   'vqDbMEdLiCs',

  // ── Feyn Test Course ──────────────────────────────────────
  'gravity-intro':     'EQL26TkVe7Y',
  'gravity-freefall':  'E43-CfukEgs',
}

/** Look up the video ID for a lesson. Returns null if none mapped. */
export function getVideoId(lessonId) {
  return VIDEO_MAP[lessonId] || null
}

/** Enrich a lessons array — adds videoId field to each lesson */
export function enrichLessons(lessons) {
  return lessons.map(lesson => ({
    ...lesson,
    videoId: lesson.videoId || getVideoId(lesson.id) || null,
  }))
}

/** Deeply enrich a full topic's skills → lessons */
export function enrichTopic(topic) {
  return {
    ...topic,
    skills: (topic.skills || []).map(skill => ({
      ...skill,
      lessons: enrichLessons(skill.lessons || []),
    })),
  }
}

/** Deeply enrich a subject */
export function enrichSubject(subject) {
  return {
    ...subject,
    topics: subject.topics.map(enrichTopic),
  }
}

/** Deeply enrich a program */
export function enrichProgram(program) {
  return {
    ...program,
    subjects: program.subjects.map(enrichSubject),
  }
}

export default VIDEO_MAP
