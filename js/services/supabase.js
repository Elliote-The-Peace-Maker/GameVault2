import { createClient } from '@supabase/supabase-js';
import { SUPABASE_URL, SUPABASE_KEY, SUPABASE_CONFIGURED } from '../config.js';
export { SUPABASE_CONFIGURED };

export const supabase = SUPABASE_CONFIGURED
  ? createClient(SUPABASE_URL, SUPABASE_KEY, { auth: { autoRefreshToken: true, persistSession: true, detectSessionInUrl: true } })
  : null;

// A signed-out visitor is normal on public pages. Avoid AuthSessionMissingError
// by checking for a session before asking Auth to verify an existing one.
export async function getOptionalUser() {
  if (!supabase) return { data: { user: null }, error: null };
  const session = await supabase.auth.getSession();
  if (session.error) return { data: { user: null }, error: session.error };
  if (!session.data.session) return { data: { user: null }, error: null };
  return supabase.auth.getUser();
}

export async function loadEnabledOAuthProviders() {
  if (!SUPABASE_CONFIGURED) return { providers: [], failed: false };
  try {
    const response = await fetch(SUPABASE_URL + '/auth/v1/settings', { headers: { apikey: SUPABASE_KEY } });
    if (!response.ok) return { providers: [], failed: true };
    const settings = await response.json();
    return {
      providers: Object.entries(settings.external || {}).filter(([, enabled]) => enabled === true).map(([name]) => name),
      failed: false
    };
  } catch {
    return { providers: [], failed: true };
  }
}
let coreSchemaCheck;

// A configured URL/key only proves that the browser has connection settings.
// Check a public core table before offering account creation, which depends on
// the signup trigger creating the matching profile and private preferences.
export function inspectCoreSchema() {
  if (!supabase) return Promise.resolve({ status: 'not-configured' });
  if (!coreSchemaCheck) {
    coreSchemaCheck = supabase.from('games').select('id').limit(0).then(({ error }) => {
      if (!error) return { status: 'ready' };
      if (error.code === 'PGRST205' || error.code === '42P01') return { status: 'missing' };
      return { status: 'unavailable', message: error.message };
    }).catch((error) => ({ status: 'unavailable', message: error?.message || 'Supabase could not be reached.' }));
  }
  return coreSchemaCheck;
}

export function backendNotice() {
  return '<div class="status-banner" role="status"><span>◈</span><span><strong>Backend not configured.</strong> This page is not connected to GameVault member data yet. Add the Supabase URL and publishable key, then apply the included migrations. The GTA catalog preview uses curated local data.</span></div>';
}

export async function requireUser({ redirect = false } = {}) {
  if (!supabase) return { user: null, error: new Error('Backend not configured') };
  const { data: { user }, error } = await getOptionalUser();
  if (!user && redirect) location.href = '/pages/login.html?next=' + encodeURIComponent(location.pathname + location.search);
  return { user, error };
}

export function showError(container, message) {
  container.innerHTML = `<div class="state error" role="alert"><h3>We couldn’t load this</h3><p>${escapeHTML(message)}</p><button class="btn" onclick="location.reload()">Try again</button></div>`;
}

export function escapeHTML(value='') {
  return String(value).replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
}
