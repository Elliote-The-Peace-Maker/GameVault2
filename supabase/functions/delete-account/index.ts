import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

Deno.serve(async (request: Request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (request.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  try {
    const { confirm } = await request.json();
    if (confirm !== 'DELETE') return json({ error: 'Explicit DELETE confirmation is required.' }, 400);
    const authorization = request.headers.get('Authorization');
    if (!authorization?.startsWith('Bearer ')) return json({ error: 'A signed-in VEXRA account is required.' }, 401);

    const url = Deno.env.get('SUPABASE_URL');
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY');
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    if (!url || !anonKey || !serviceRoleKey) return json({ error: 'The delete-account function is not configured on the server.' }, 503);

    // Authenticate the caller with their own bearer token before creating an admin client.
    const caller = createClient(url, anonKey, { global: { headers: { Authorization: authorization } }, auth: { persistSession: false } });
    const { data: { user }, error: authError } = await caller.auth.getUser();
    if (authError || !user) return json({ error: 'Your session could not be verified. Sign in again and retry.' }, 401);

    // This privileged key exists only in the Edge Function environment, never in browser code.
    const admin = createClient(url, serviceRoleKey, { auth: { persistSession: false, autoRefreshToken: false } });
    for (const bucket of ['vexra-avatars', 'vexra-media']) {
      const paths: string[] = [];
      let offset = 0;
      for (;;) {
        const { data: objects, error: listError } = await admin.storage.from(bucket).list(user.id, { limit: 1000, offset });
        if (listError) return json({ error: `Could not prepare account files for deletion (${bucket}). ${listError.message}` }, 500);
        paths.push(...(objects || []).filter((item) => item.id).map((item) => `${user.id}/${item.name}`));
        if (!objects || objects.length < 1000) break;
        offset += 1000;
      }
      for (let start = 0; start < paths.length; start += 100) {
        const { error: removeError } = await admin.storage.from(bucket).remove(paths.slice(start, start + 100));
        if (removeError) return json({ error: `Could not remove account files from ${bucket}. ${removeError.message}` }, 500);
      }
    }
    const { error: deleteError } = await admin.auth.admin.deleteUser(user.id);
    if (deleteError) return json({ error: `Account deletion failed: ${deleteError.message}` }, 500);
    return json({ success: true });
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : 'Unexpected deletion error.' }, 400);
  }
});

function json(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}
