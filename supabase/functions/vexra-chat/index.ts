import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

type ChatMessage = { role: 'user' | 'assistant'; content: string };

Deno.serve(async (request: Request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (request.method !== 'POST') return json({ error: 'Method not allowed.' }, 405);

  try {
    const authorization = request.headers.get('Authorization');
    if (!authorization?.startsWith('Bearer ')) return json({ error: 'Sign in to chat with Vault Guide.' }, 401);

    const url = Deno.env.get('SUPABASE_URL');
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY');
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const openAIKey = Deno.env.get('OPENAI_API_KEY');
    if (!url || !anonKey || !serviceRoleKey || !openAIKey) {
      return json({ error: 'GameVault chat is not configured on the server yet.' }, 503);
    }

    const caller = createClient(url, anonKey, {
      global: { headers: { Authorization: authorization } },
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data: { user }, error: authError } = await caller.auth.getUser();
    if (authError || !user) return json({ error: 'Your session could not be verified. Sign in again.' }, 401);

    let body: { messages?: unknown };
    try {
      body = await request.json();
    } catch {
      return json({ error: 'Send a valid chat message.' }, 400);
    }
    if (!Array.isArray(body.messages) || body.messages.length < 1 || body.messages.length > 10) {
      return json({ error: 'A chat turn can include up to 10 recent messages.' }, 400);
    }
    const messages: ChatMessage[] = [];
    let totalCharacters = 0;
    for (const item of body.messages) {
      if (!item || typeof item !== 'object') return json({ error: 'A message is not valid.' }, 400);
      const { role, content } = item as Record<string, unknown>;
      if ((role !== 'user' && role !== 'assistant') || typeof content !== 'string' || !content.trim() || content.length > 1200) {
        return json({ error: 'Messages must contain up to 1,200 characters.' }, 400);
      }
      totalCharacters += content.length;
      if (totalCharacters > 7000) return json({ error: 'That conversation is too long. Start a new chat.' }, 413);
      messages.push({ role, content: content.trim() });
    }
    if (messages.at(-1)?.role !== 'user') return json({ error: 'Send a new message to Vault Guide.' }, 400);

    const admin = createClient(url, serviceRoleKey, { auth: { persistSession: false, autoRefreshToken: false } });
    const { data: allowed, error: limitError } = await admin.rpc('consume_vexra_chat_message', { target_user: user.id });
    if (limitError) {
      console.error('GameVault chat rate check failed');
      return json({ error: 'Vault Guide chat is unavailable while its server is being configured.' }, 503);
    }
    if (!allowed) return json({ error: 'You have reached the chat limit for now. Try again in about an hour.' }, 429);

    const response = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${openAIKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: Deno.env.get('VEXRA_CHAT_MODEL') || 'gpt-6-astra',
        instructions: 'You are Vault Guide, the friendly GameVault assistant for a Grand Theft Auto community. Be warm, concise, and useful. Help people explore GTA titles, maps, and eras and understand how to use GameVault. You cannot see private account data, send messages on a user’s behalf, change settings, verify game statistics, or perform actions in the site. Never claim you did. If asked for current game news, prices, release changes, or other live facts, say you may be out of date and direct them to an official Rockstar source. Do not ask for passwords, payment details, or private contact information.',
        input: messages,
        max_output_tokens: 320,
        store: false,
      }),
    });

    if (!response.ok) {
      console.error('GameVault chat provider request failed with status', response.status);
      return json({ error: 'Vault Guide could not reach her chat service. Try again soon.' }, 502);
    }
    const result = await response.json();
    const reply = typeof result.output_text === 'string'
      ? result.output_text.trim()
      : (result.output || [])
        .flatMap((item: { content?: Array<{ type?: string; text?: string }> }) => item.content || [])
        .filter((part: { type?: string }) => part.type === 'output_text')
        .map((part: { text?: string }) => part.text || '')
        .join('\n')
        .trim();
    if (!reply) return json({ error: 'Vault Guide did not have a reply. Please try again.' }, 502);
    return json({ reply });
  } catch {
    return json({ error: 'Vault Guide chat hit a temporary problem. Please try again.' }, 500);
  }
});

function json(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}
