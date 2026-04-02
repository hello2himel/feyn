const CSV_SPLIT = /\s*,\s*/

function parseCsv(value) {
  if (!value || typeof value !== 'string') return []
  return value
    .split(CSV_SPLIT)
    .map(v => v.trim().toLowerCase())
    .filter(Boolean)
}

function hasEmail(email, list) {
  const e = (email || '').trim().toLowerCase()
  return !!e && list.includes(e)
}

export function getPanelRoles(profile) {
  const email = profile?.email || ''

  const admins     = parseCsv(process.env.NEXT_PUBLIC_PANEL_ADMINS)
  const coaches    = parseCsv(process.env.NEXT_PUBLIC_PANEL_COACHES)
  const editors    = parseCsv(process.env.NEXT_PUBLIC_PANEL_EDITORS)
  const publishers = parseCsv(process.env.NEXT_PUBLIC_PANEL_PUBLISHERS)

  const roles = {
    admin: hasEmail(email, admins),
    coach: hasEmail(email, coaches),
    editor: hasEmail(email, editors),
    publisher: hasEmail(email, publishers),
  }

  if (roles.admin) {
    roles.editor = true
    roles.publisher = true
  }

  return roles
}

export function hasAnyPanelAccess(profile) {
  const r = getPanelRoles(profile)
  return !!(r.admin || r.coach || r.editor || r.publisher)
}

