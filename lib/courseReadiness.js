// ============================================================
// lib/courseReadiness.js — "is this course actually publishable?"
//
// The old editor exposed `status` as a bare dropdown containing
// draft/published/archived. A mentor could therefore publish a course
// with no topics, no video on any lesson and no description, and the
// only feedback was a live page that looked broken.
//
// This module turns that into an explicit checklist the builder shows
// while you work and the publish button reads before it lets you flip
// the status. It is pure and synchronous so both the builder and the
// studio home can call it on already-loaded rows.
//
// It operates on the *editor* shape (snake_case rows straight from
// Supabase), not the public mapped shape, because the builder is the
// only caller that has unpublished rows at all.
// ============================================================

/** Flattens the editor tree into lessons with their parents attached. */
export function flattenLessons(tree = []) {
  const out = []
  for (const topic of tree)
    for (const skill of topic.skills || [])
      for (const lesson of skill.lessons || [])
        out.push({ ...lesson, _topic: topic, _skill: skill })
  return out
}

export function courseStats(subject, tree = []) {
  const lessons = flattenLessons(tree)
  const skills = tree.flatMap(t => t.skills || [])
  return {
    topics: tree.length,
    skills: skills.length,
    lessons: lessons.length,
    published: lessons.filter(l => l.status === 'published').length,
    withVideo: lessons.filter(l => l.video_url).length,
    withQuestions: lessons.filter(l => (l.questions || []).length > 0).length,
    emptySkills: skills.filter(s => (s.lessons || []).length === 0),
    emptyTopics: tree.filter(t => (t.skills || []).length === 0),
    videoless: lessons.filter(l => !l.video_url),
    questionless: lessons.filter(l => (l.questions || []).length === 0),
  }
}

/**
 * Returns an ordered checklist. `blocking: true` items must pass before
 * a course may be published; the rest are quality nudges that are
 * shown but never prevent shipping — a mentor with one perfect lesson
 * should not be held hostage to a linter.
 */
export function readinessChecks(subject, tree = []) {
  const s = courseStats(subject, tree)

  return [
    {
      key: 'name',
      label: 'The course has a name',
      blocking: true,
      done: !!subject?.name?.trim(),
      hint: 'Give it a name learners will recognise.',
    },
    {
      key: 'description',
      label: 'It has a description',
      blocking: true,
      done: !!subject?.description?.trim(),
      hint: 'One or two sentences. This is the text on every course card.',
    },
    {
      key: 'program',
      label: 'It belongs to a program',
      blocking: true,
      done: !!subject?.program_id,
      hint: 'Pick the syllabus or interest area this sits under.',
    },
    {
      key: 'structure',
      label: 'It has at least one topic with a lesson',
      blocking: true,
      done: s.lessons > 0,
      hint: 'Add a topic, then a skill inside it, then a lesson.',
    },
    {
      key: 'one-live-lesson',
      label: 'At least one lesson is published',
      blocking: true,
      done: s.published > 0,
      hint: 'Draft lessons stay hidden even when the course is live, so a course with none looks empty.',
    },
    {
      key: 'videos',
      label: 'Every lesson has a video',
      blocking: false,
      done: s.lessons > 0 && s.videoless.length === 0,
      hint: s.videoless.length
        ? `${s.videoless.length} lesson${s.videoless.length === 1 ? '' : 's'} still have no video attached.`
        : 'Paste a YouTube link on each lesson.',
    },
    {
      key: 'questions',
      label: 'Every lesson asks at least one question',
      blocking: false,
      done: s.lessons > 0 && s.questionless.length === 0,
      hint: s.questionless.length
        ? `${s.questionless.length} lesson${s.questionless.length === 1 ? '' : 's'} have no questions — learners cannot prove they understood.`
        : 'Questions are what make a lesson checkable.',
    },
    {
      key: 'no-empties',
      label: 'No empty topics or skills',
      blocking: false,
      done: s.emptyTopics.length === 0 && s.emptySkills.length === 0,
      hint: 'Empty groups render as dead ends on the public page.',
    },
    {
      key: 'icon',
      label: 'It has an icon',
      blocking: false,
      done: !!subject?.icon,
      hint: 'Used on cards and in navigation.',
    },
  ]
}

export function readinessSummary(subject, tree = []) {
  const checks = readinessChecks(subject, tree)
  const blocking = checks.filter(c => c.blocking)
  const blockers = blocking.filter(c => !c.done)
  const passed = checks.filter(c => c.done).length
  return {
    checks,
    blockers,
    canPublish: blockers.length === 0,
    passed,
    total: checks.length,
    pct: Math.round((passed / checks.length) * 100),
  }
}
