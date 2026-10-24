import { mountPage } from './runtime.js';
import { supabase, SUPABASE_CONFIGURED, escapeHTML, getOptionalUser } from '../services/supabase.js';

const allowedTypes = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'video/mp4', 'video/webm']);
const fail = function (message) { return '<div class="state error"><h3>Could not load GTA media</h3><p>' + escapeHTML(message) + '</p></div>'; };

function mediaCard(item, signedUrl) {
  const url = escapeHTML(signedUrl);
  const media = item.media_type === 'video'
    ? '<video controls preload="none" src="' + url + '"></video>'
    : '<img loading="lazy" src="' + url + '" alt="' + escapeHTML(item.caption || 'Member-submitted GTA media') + '">';
  return '<article class="surface asset-card"><a class="asset-thumb" href="' + url + '" target="_blank" rel="noopener noreferrer">' + media + '</a>' +
    '<div class="asset-meta"><strong>' + escapeHTML(item.caption || item.games?.title || 'GTA community media') + '</strong>' +
    '<span>' + escapeHTML(item.games?.title || 'Grand Theft Auto') + ' · Approved member upload · ' +
    new Date(item.created_at).toLocaleDateString() + '</span></div></article>';
}

mountPage({
  page: 'media',
  title: 'GTA Clips & Media',
  description: 'Browse approved community clips and submit your own Grand Theft Auto media for review.',
  backend: false,
  run: async function ({ root, configured }) {
    if (!configured || !supabase) {
      root.innerHTML = '<div class="state info"><h3>Backend not configured</h3><p>GTA media is loaded from Supabase after setup. No sample clips or uploads are shown.</p><a class="btn btn-primary" href="/pages/help.html">Supabase setup guide</a></div>';
      return;
    }

    const auth = await getOptionalUser();
    if (auth.error) throw auth.error;
    const gamesResult = await supabase.from('games').select('id,slug,title').order('title').limit(100);
    if (gamesResult.error) throw gamesResult.error;
    const games = gamesResult.data || [];
    if (!games.length) {
      root.innerHTML = '<div class="state info"><h3>GTA catalog seed needed</h3><p>Apply the GameVault catalog migration and seed before members submit media.</p><a class="btn" href="/games/index.html">Browse GTA catalog preview</a></div>';
      return;
    }

    const uploadForm = auth.data.user
      ? '<section class="surface surface-pad gv-media-upload"><h2 class="section-title">Submit GTA media</h2><p class="muted tiny">Uploads remain private to you and moderators until approved. Use a clip or image that you have permission to share.</p>' +
        '<form id="media-upload-form" class="form-stack"><label class="field-wrap">GTA title<select class="select" name="game_id" required><option value="">Choose a GTA title</option>' +
        games.map(function (game) { return '<option value="' + escapeHTML(game.id) + '">' + escapeHTML(game.title) + '</option>'; }).join('') +
        '</select></label><label class="field-wrap">Image or video<input class="field" type="file" name="media" accept="image/jpeg,image/png,image/webp,image/gif,video/mp4,video/webm" required></label>' +
        '<label class="field-wrap">Caption<input class="field" name="caption" maxlength="180" placeholder="Add context for the clip"></label>' +
        '<div id="media-feedback" role="status"></div><button class="btn btn-primary">Upload for moderator review</button></form></section>'
      : '<section class="surface surface-pad"><h2 class="section-title">Share a GTA clip</h2><p class="muted tiny">Sign in to submit a clip or image for moderator review.</p><a class="btn btn-primary" href="/pages/login.html?next=%2Fpages%2Fmedia.html">Sign in</a></section>';

    root.innerHTML = '<div class="status-banner"><span aria-hidden="true">✓</span><span><strong>Member media.</strong> Only approved public uploads connected to a GTA catalog entry appear here.</span></div>' +
      uploadForm + '<h2 class="section-title" style="margin-top:22px">Approved GTA clips & images</h2><div class="grid grid-3" id="approved-media"><div class="state loading">Loading approved member uploads…</div></div>';

    const target = root.querySelector('#approved-media');
    const mediaResult = await supabase.from('media_items')
      .select('id,owner_id,game_id,storage_path,media_type,caption,created_at,games!inner(title,slug,franchise)')
      .eq('review_state', 'approved').eq('visibility', 'public')
      .eq('games.franchise', 'grand-theft-auto')
      .order('created_at', { ascending: false }).limit(36);
    if (mediaResult.error) target.innerHTML = fail(mediaResult.error.message);
    else if (!mediaResult.data?.length) target.innerHTML = '<div class="state"><h3>No approved GTA media yet</h3><p>Member uploads will appear after a moderator approves them.</p></div>';
    else {
      const cards = await Promise.all(mediaResult.data.map(async function (item) {
        const result = await supabase.storage.from('vexra-media').createSignedUrl(item.storage_path, 3600);
        return result.error ? '<article class="surface surface-pad"><h3 class="section-title">Media temporarily unavailable</h3><p class="muted tiny">The approved file could not be opened.</p></article>' : mediaCard(item, result.data.signedUrl);
      }));
      target.innerHTML = cards.join('');
    }

    root.querySelector('#media-upload-form')?.addEventListener('submit', async function (event) {
      event.preventDefault();
      const form = event.currentTarget;
      const feedback = root.querySelector('#media-feedback');
      const button = form.querySelector('button[type="submit"]') || form.querySelector('button');
      const file = new FormData(form).get('media');
      const gameId = new FormData(form).get('game_id');
      if (!file || !allowedTypes.has(file.type) || file.size > 50 * 1024 * 1024) {
        feedback.textContent = 'Choose a JPG, PNG, WebP, GIF, MP4, or WebM file no larger than 50 MB.';
        feedback.className = 'state error';
        return;
      }
      if (!gameId) {
        feedback.textContent = 'Choose the GTA title that the media belongs to.';
        feedback.className = 'state error';
        return;
      }
      button.disabled = true;
      button.textContent = 'Uploading…';
      const path = auth.data.user.id + '/' + crypto.randomUUID() + '-' + file.name.replace(/[^a-z0-9._-]/gi, '_');
      const uploaded = await supabase.storage.from('vexra-media').upload(path, file, { contentType: file.type, upsert: false });
      if (uploaded.error) {
        feedback.textContent = uploaded.error.message;
        feedback.className = 'state error';
        button.disabled = false;
        button.textContent = 'Upload for moderator review';
        return;
      }
      const row = await supabase.from('media_items').insert({
        owner_id: auth.data.user.id,
        game_id: gameId,
        storage_path: path,
        media_type: file.type.startsWith('video/') ? 'video' : 'image',
        caption: new FormData(form).get('caption').toString().trim(),
        review_state: 'pending',
        visibility: 'public'
      });
      if (row.error) {
        await supabase.storage.from('vexra-media').remove([path]);
        feedback.textContent = row.error.message;
        feedback.className = 'state error';
        button.disabled = false;
        button.textContent = 'Upload for moderator review';
        return;
      }
      feedback.textContent = 'Upload received. It will appear after moderator approval.';
      feedback.className = 'state success';
      form.reset();
      button.disabled = false;
      button.textContent = 'Upload for moderator review';
    });
  }
});
