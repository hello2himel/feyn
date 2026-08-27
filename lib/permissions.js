// ============================================================
// lib/permissions.js — request-scoped permission resolution
//
// Spec §3: permissions are computed per request as
//     isAppAdmin  OR  membership.role for that publisher_id
// and never stored as a flat role on the user. This module is the
// only place the app is allowed to answer "can this person edit X".
//
// It mirrors, but does not replace, the database. Every write still
// goes through RLS or a security-definer RPC — this is for deciding
// what UI to render and for failing fast with a readable message.
//
// Works with any supabase-js client that carries the caller's
// identity: the browser singleton (lib/supabase.js) or a
// token-scoped server client (lib/supabaseServer.js#getUserClient).
// ============================================================

export const ROLE_RANK = { mentor: 1, editor: 2, admin: 3 }

export function roleRank(role) {
  return ROLE_RANK[role] || 0
}

export const EMPTY_PERMISSIONS = {
  userId: null,
  isAppAdmin: false,
  mentorId: null,
  mentorStatus: null,
  memberships: [],
  roleByPublisher: {},
  mentorSubjectIds: [],
}

/**
 * Loads everything needed to answer permission questions for one
 * caller, in three queries. Returns EMPTY_PERMISSIONS when there is
 * no session or no Supabase configured, so callers never branch on
 * null.
 */
export async function loadPermissions(sb, userId) {
  if (!sb || !userId) return EMPTY_PERMISSIONS

  const [adminRes, mentorRes, memberRes] = await Promise.all([
    sb.rpc('is_app_admin', { uid: userId }),
    sb.from('mentors').select('id, status').eq('user_id', userId).maybeSingle(),
    sb
      .from('publisher_memberships')
      .select('id, publisher_id, role, status, publishers(id, name, slug, type, status, join_policy, logo_url, brand_color)')
      .eq('user_id', userId),
  ])

  const isAppAdmin = adminRes?.data === true
  const mentor = mentorRes?.data || null
  const memberships = memberRes?.data || []

  const roleByPublisher = {}
  for (const m of memberships) {
    if (m.status === 'approved') roleByPublisher[m.publisher_id] = m.role
  }

  // Only needed to resolve the `mentor` role, which can edit just the
  // subjects it is credited on.
  let mentorSubjectIds = []
  if (mentor?.id) {
    const { data } = await sb.from('subject_mentors').select('subject_id').eq('mentor_id', mentor.id)
    mentorSubjectIds = (data || []).map(r => r.subject_id)
  }

  return {
    userId,
    isAppAdmin,
    mentorId: mentor?.id || null,
    mentorStatus: mentor?.status || null,
    memberships,
    roleByPublisher,
    mentorSubjectIds,
  }
}

/** True when the caller holds at least `minRole` in that publisher. */
export function hasPublisherRole(perms, publisherId, minRole = 'mentor') {
  if (!perms) return false
  if (perms.isAppAdmin) return true
  if (!publisherId) return false
  return roleRank(perms.roleByPublisher[publisherId]) >= roleRank(minRole)
}

/** Publisher settings, branding, join_policy, membership management. */
export function canManagePublisher(perms, publisherId) {
  return hasPublisherRole(perms, publisherId, 'admin')
}

/**
 * Course editability, spec §3:
 *   admin/editor  → any course under that publisher
 *   mentor        → only courses they are credited on
 */
export function canEditSubject(perms, subject) {
  if (!perms || !subject) return false
  if (perms.isAppAdmin) return true
  const role = perms.roleByPublisher[subject.publisher_id]
  if (role === 'admin' || role === 'editor') return true
  if (role === 'mentor') return perms.mentorSubjectIds.includes(subject.id)
  return false
}

/** May create a new course under this publisher (editor and up). */
export function canCreateSubject(perms, publisherId) {
  return hasPublisherRole(perms, publisherId, 'editor')
}

/** Approved memberships only — what the studio lists as affiliations. */
export function approvedMemberships(perms) {
  return (perms?.memberships || []).filter(m => m.status === 'approved')
}

/** Invitations awaiting this mentor's accept/decline. */
export function pendingInvitations(perms) {
  return (perms?.memberships || []).filter(m => m.status === 'pending')
}

export function isApprovedMentor(perms) {
  return perms?.mentorStatus === 'approved'
}

/** Any editing surface at all — replaces lib/panelAccess#hasAnyPanelAccess. */
export function hasStudioAccess(perms) {
  return !!(perms?.isAppAdmin || perms?.mentorId || approvedMemberships(perms).length > 0)
}
