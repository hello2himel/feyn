import { getSupabaseReady } from './supabase'

const KEY_PREFIX = 'panel:'

function safeJsonParse(raw, fallback = null) {
  if (!raw || typeof raw !== 'string') return fallback
  try { return JSON.parse(raw) } catch { return fallback }
}

function localKey(scope) {
  return `ff_panel_${scope}`
}

export function readPanelLocal(scope, fallback = null) {
  if (typeof window === 'undefined') return fallback
  try {
    const raw = localStorage.getItem(localKey(scope))
    return raw ? safeJsonParse(raw, fallback) : fallback
  } catch {
    return fallback
  }
}

export function writePanelLocal(scope, value) {
  if (typeof window === 'undefined') return
  try { localStorage.setItem(localKey(scope), JSON.stringify(value)) } catch {}
}

export async function loadPanelDraft(scope, fallback = null) {
  const sb = await getSupabaseReady()
  if (!sb) return readPanelLocal(scope, fallback)
  try {
    const { data: userData, error: userErr } = await sb.auth.getUser()
    if (userErr || !userData?.user?.id) return readPanelLocal(scope, fallback)
    const uid = userData.user.id

    const { data, error } = await sb
      .from('user_preferences')
      .select('value')
      .eq('user_id', uid)
      .eq('key', `${KEY_PREFIX}${scope}`)
      .maybeSingle()

    if (error || !data?.value) return readPanelLocal(scope, fallback)
    const parsed = safeJsonParse(data.value, fallback)
    if (parsed !== null && parsed !== undefined) writePanelLocal(scope, parsed)
    return parsed
  } catch {
    return readPanelLocal(scope, fallback)
  }
}

export async function savePanelDraft(scope, value) {
  writePanelLocal(scope, value)
  const sb = await getSupabaseReady()
  if (!sb) return { ok: false, error: 'No Supabase session' }
  try {
    const { data: userData, error: userErr } = await sb.auth.getUser()
    if (userErr || !userData?.user?.id) return { ok: false, error: 'No authenticated user' }
    const uid = userData.user.id
    const { error } = await sb.from('user_preferences').upsert(
      { user_id: uid, key: `${KEY_PREFIX}${scope}`, value: JSON.stringify(value) },
      { onConflict: 'user_id,key' }
    )
    if (error) return { ok: false, error: error.message }
    return { ok: true }
  } catch (e) {
    return { ok: false, error: e?.message || 'Save failed' }
  }
}

