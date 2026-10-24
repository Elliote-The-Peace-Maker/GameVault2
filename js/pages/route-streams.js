import { mountPage } from './runtime.js';
import { supabase, SUPABASE_CONFIGURED, escapeHTML, getOptionalUser } from '../services/supabase.js';

function safeStreamUrl(value) {
  try {
    const url = new URL(value);
    const hosts = ['twitch.tv', 'youtube.com', 'youtu.be', 'kick.com'];
    return url.protocol === 'https:' && hosts.some(function (host) {
      return url.hostname === host || url.hostname.endsWith('.' + host);
    }) ? url.toString() : null;
  } catch {
    return null;
  }
}

mountPage({
  page: 'streams',
  title: 'GTA Streams',
  description: 'Find member-submitted Grand Theft Auto streams and share your own channel.',
  backend: false,
  run: async function ({ root, configured }) {
    if (!configured || !supabase) {
      root.innerHTML = '<div class="state info"><h3>Backend not configured</h3><p>Stream listings load from Supabase. GameVault does not show sample streams.</p><a class="btn btn-primary" href="/pages/help.html">Supabase setup guide</a></div>';
      return;
    }

    const auth = await getOptionalUser();
    if (auth.error) throw auth.error;
    const gamesResult = await supabase.from('games').select('id,title').order('title').limit(100);
    if (gamesResult.error) throw gamesResult.error;
    const games = gamesResult.data || [];
    const form = auth.data.user && games.length
      ? '<section class="surface surface-pad"><h2 class="section-title">Share a stream</h2><p class="muted tiny">Add a public channel link and choose which GTA title you are streaming. GameVault does not claim a stream is live.</p>' +
        '<form class="form-stack" id="stream-form"><label class="field-wrap">GTA title<select class="select" name="game_id" required><option value="">Choose a GTA title</option>' +
        games.map(function (game) { return '<option value="' + escapeHTML(game.id) + '">' + escapeHTML(game.title) + '</option>'; }).join('') +
        '</select></label><label class="field-wrap">Twitch, YouTube, or Kick link<input class="field" type="url" name="url" required placeholder="https://www.twitch.tv/yourchannel"></label>' +
        '<label class="field-wrap">Stream title<input class="field" name="title" maxlength="120" placeholder="Optional title"></label><div id="stream-feedback" role="status"></div><button class="btn btn-primary">Add stream link</button></form></section>'
      : auth.data.user
        ? '<div class="state info"><h3>GTA catalog seed needed</h3><p>Apply the GameVault catalog migration and seed before adding streams.</p></div>'
        : '<section class="surface surface-pad"><h2 class="section-title">Share a GTA stream</h2><p class="muted tiny">Sign in to add a stream link for a GTA title.</p><a class="btn btn-primary" href="/pages/login.html?next=%2Fpages%2Fstreams.html">Sign in</a></section>';

    root.innerHTML = '<div class="status-banner"><span aria-hidden="true">⌁</span><span><strong>Member-submitted links.</strong> Open a channel to check its current status on the streaming service.</span></div>' +
      form + '<h2 class="section-title" style="margin-top:22px">Member-submitted GTA streams</h2><div id="stream-list"><div class="state loading">Loading public stream links…</div></div>';
    const list = root.querySelector('#stream-list');
    const result = await supabase.from('stream_links')
      .select('id,user_id,title,url,game_id,created_at,games!inner(title,franchise)')
      .eq('is_public', true).eq('games.franchise', 'grand-theft-auto')
      .order('created_at', { ascending: false }).limit(40);
    if (result.error) {
      list.innerHTML = '<div class="state error"><h3>Stream links could not load</h3><p>' + escapeHTML(result.error.message) + '</p></div>';
    } else if (!result.data?.length) {
      list.innerHTML = '<div class="state"><h3>No GTA streams listed</h3><p>When members share a public stream link, it will appear here.</p></div>';
    } else {
      const userIds = [...new Set(result.data.map(function (item) { return item.user_id; }))];
      const profiles = userIds.length
        ? await supabase.from('profile_cards').select('id,username,display_name').in('id', userIds)
        : { data: [], error: null };
      if (profiles.error) throw profiles.error;
      const people = new Map((profiles.data || []).map(function (profile) { return [profile.id, profile]; }));
      list.innerHTML = '<div class="grid grid-2">' + result.data.map(function (item) {
        const url = safeStreamUrl(item.url);
        const person = people.get(item.user_id);
        return '<article class="surface surface-pad"><p class="eyebrow">' + escapeHTML(item.games?.title || 'Grand Theft Auto') + '</p>' +
          '<h3 class="section-title">' + escapeHTML(item.title || 'Stream link') + '</h3><p class="muted tiny">' +
          escapeHTML(person?.display_name || person?.username || 'GameVault member') + ' · Added ' + new Date(item.created_at).toLocaleDateString() + '</p>' +
          (url ? '<a class="btn btn-primary" href="' + escapeHTML(url) + '" target="_blank" rel="noopener noreferrer">Open stream ↗</a>' :
            '<span class="muted tiny">Invalid stream link</span>') + '</article>';
      }).join('') + '</div>';
    }

    root.querySelector('#stream-form')?.addEventListener('submit', async function (event) {
      event.preventDefault();
      const currentForm = event.currentTarget;
      const data = new FormData(currentForm);
      const url = safeStreamUrl(data.get('url').toString().trim());
      const feedback = root.querySelector('#stream-feedback');
      if (!url) {
        feedback.textContent = 'Use a valid HTTPS link from Twitch, YouTube, or Kick.';
        feedback.className = 'state error';
        return;
      }
      const button = currentForm.querySelector('button');
      button.disabled = true;
      const saved = await supabase.from('stream_links').insert({
        user_id: auth.data.user.id,
        game_id: data.get('game_id'),
        url: url,
        title: data.get('title').toString().trim(),
        is_public: true
      });
      if (saved.error) {
        feedback.textContent = saved.error.message;
        feedback.className = 'state error';
        button.disabled = false;
      } else {
        feedback.textContent = 'Stream link added to the selected GTA title.';
        feedback.className = 'state success';
        currentForm.reset();
        button.disabled = false;
        location.reload();
      }
    });
  }
});
