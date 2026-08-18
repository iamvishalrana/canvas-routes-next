// Shared by every public calendar feed route (the combined one and the
// three single-category ones) so token validation can't drift between them.
export async function isValidCalendarToken(supabase, token) {
  if (!token || !/^[a-f0-9-]{16,60}$/i.test(token)) return false
  const { data: setting } = await supabase.from('settings').select('value').eq('key', 'admin_calendar_token').maybeSingle()
  // Constant-shape check whether the token is stale or just malformed —
  // never confirm/deny which, so a guessed near-miss learns nothing.
  return !!setting?.value && setting.value === token
}
