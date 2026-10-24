import { mountPage } from './runtime.js';
import { getOptionalUser } from '../services/supabase.js';
import { icon } from '../components/icons.js';

const safeUrl = value => {
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && !url.username && !url.password ? url.href : null;
  } catch { return null; }
};
const when = value => value ? new Date(value).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' }) : '';

mountPage({
  page: 'news',
  title: 'GTA News Feed',
  description: 'A source-linked community feed for the Grand Theft Auto series. Posts are reviewed by GameVault moderators.',
  run: async ({ root, supabase, configured }) => {
    root.innerHTML = `<section class="gv-news-intro"><div><p class="eyebrow">VICE CITY · LOS SANTOS · LIBERTY CITY</p><h2>Stay in the loop.</h2><p>Browse community-submitted stories with links back to their sources. GameVault does not speak for Rockstar Games and does not present unverified posts as official announcements.</p><div class="row"><a class="btn btn-primary" href="https://www.rockstargames.com/newswire" target="_blank" rel="noopener noreferrer">Rockstar Newswire ${icon('external-link')}</a><a class="btn" href="https://www.rockstargames.com/VI" target="_blank" rel="noopener noreferrer">GTA VI official page ${icon('external-link')}</a><a class="btn" href="https://www.rockstargames.com/gta-online" target="_blank" rel="noopener noreferrer">GTA Online official page ${icon('external-link')}</a></div></div><div class="gv-news-mark" aria-hidden="true">${icon('media')}</div></section><section class="surface gv-news-panel"><div class="gv-news-toolbar"><div><h2 class="section-title">Community feed</h2><p class="muted tiny">Only approved submissions appear here. Each card links to its original source.</p></div><label class="field-wrap">Filter by title<select class="select" id="game-news-filter"><option value="all">All Grand Theft Auto</option></select></label></div><div id="game-news-feed"><div class="state loading">Loading approved links…</div></div></section><section id="game-news-submit"></section><section id="game-news-pending"></section>`;

    const feed = root.querySelector('#game-news-feed');
    const configuredNotice = !configured ? '<div class="status-banner"><strong>Backend not configured.</strong><span>News submissions and the reviewed community feed are unavailable until Supabase is configured.</span></div>' : '';
    if (configuredNotice) root.insertAdjacentHTML('afterbegin', configuredNotice);
    if (!configured || !supabase) {
      feed.innerHTML = '<div class="state info"><h3>No live news feed connection</h3><p>Use the official links above for current Rockstar announcements. GameVault will show community entries after Supabase is connected and posts are approved.</p></div>';
      return;
    }

    const auth = await getOptionalUser();
    if (auth.error) {
      feed.innerHTML = `<div class="state error"><h3>Could not check sign-in</h3><p>${escapeHtml(auth.error.message || 'Please retry.')}</p></div>`;
      return;
    }
    const user = auth.data?.user || null;
    const gamesResponse = await supabase.from('games').select('id,slug,title').eq('franchise', 'grand-theft-auto').order('title');
    if (gamesResponse.error) {
      feed.innerHTML = `<div class="state error"><h3>GTA catalog unavailable</h3><p>${escapeHtml(gamesResponse.error.message)}</p></div>`;
      return;
    }
    const games = gamesResponse.data || [];
    const gameById = new Map(games.map(game => [game.id, game]));
    const filter = root.querySelector('#game-news-filter');
    filter.insertAdjacentHTML('beforeend', games.map(game => `<option value="${escapeHtml(game.id)}">${escapeHtml(game.title)}</option>`).join(''));

    const renderNews = rows => {
      if (!rows?.length) {
        feed.innerHTML = '<div class="state gv-news-empty"><h3>No approved stories yet</h3><p>There are no community news links published in this feed. Use the official Rockstar links above for current news.</p></div>';
        return;
      }
      feed.innerHTML = `<div class="gv-news-list">${rows.map(item => {
        const source = safeUrl(item.source_url);
        const game = item.game_id ? gameById.get(item.game_id) : null;
        const href = source || 'https://www.rockstargames.com/newswire';
        return `<article class="gv-news-card"><div class="gv-news-meta"><span class="pill">${escapeHtml(game?.title || 'GTA series')}</span><span>Community-curated source</span><time datetime="${escapeHtml(item.published_at)}">${escapeHtml(when(item.published_at))}</time></div><h3>${escapeHtml(item.title)}</h3>${item.summary ? `<p>${escapeHtml(item.summary)}</p>` : ''}<div class="gv-news-source"><span>${escapeHtml(item.source_label)}</span><a class="btn" href="${escapeHtml(href)}" target="_blank" rel="noopener noreferrer">Open source ${icon('external-link')}</a></div></article>`;
      }).join('')}</div>`;
    };

    const loadFeed = async () => {
      feed.innerHTML = '<div class="state loading">Loading approved links…</div>';
      let query = supabase.from('game_news').select('id,title,summary,source_label,source_url,published_at,created_at,game_id')
        .eq('status', 'approved').order('published_at', { ascending: false }).limit(80);
      if (filter.value !== 'all') query = query.eq('game_id', filter.value);
      const { data, error } = await query;
      if (error) {
        const detail = /game_news|relation|schema cache/i.test(error.message)
          ? 'Apply the GTA progress and news migration to enable this page.'
          : error.message;
        feed.innerHTML = `<div class="state error"><h3>News could not load</h3><p>${escapeHtml(detail)}</p><button class="btn" type="button" data-news-retry>Try again</button></div>`;
        feed.querySelector('[data-news-retry]')?.addEventListener('click', loadFeed);
        return;
      }
      renderNews(data);
    };
    filter.addEventListener('change', loadFeed);

    const submitBox = root.querySelector('#game-news-submit');
    if (!user) {
      submitBox.innerHTML = `<div class="state info gv-news-signin"><h3>Share a sourced story</h3><p>Sign in to suggest a news link. Submissions stay private until a moderator reviews them.</p><a class="btn btn-primary" href="/pages/login.html?next=${encodeURIComponent(location.pathname + location.search)}">Sign in to submit</a></div>`;
    } else {
      submitBox.innerHTML = `<section class="surface gv-news-submit"><div><h2 class="section-title">Suggest a story</h2><p class="muted tiny">Submit a headline, short summary, and an HTTPS source link. Your submission remains pending until a moderator reviews it.</p></div><form id="gv-news-form" class="gv-news-form"><label class="field-wrap">GTA title<select class="select" name="game_id"><option value="">Grand Theft Auto series-wide</option>${games.map(game => `<option value="${escapeHtml(game.id)}">${escapeHtml(game.title)}</option>`).join('')}</select></label><label class="field-wrap">Headline<input class="field" name="title" maxlength="160" minlength="3" required></label><label class="field-wrap">Source or publisher name<input class="field" name="source_label" maxlength="80" placeholder="e.g. Rockstar Newswire" required></label><label class="field-wrap">Original source URL<input class="field" type="url" name="source_url" placeholder="https://…" required></label><label class="field-wrap">Short summary <span class="muted">optional</span><textarea class="textarea" name="summary" maxlength="1600" placeholder="A brief summary in your own words"></textarea></label><label class="field-wrap">Published date <span class="muted">optional</span><input class="field" type="datetime-local" name="published_at"></label><div id="gv-news-form-feedback" aria-live="polite"></div><button type="submit" class="btn btn-primary">Submit for review ${icon('send')}</button></form><div id="gv-news-my-submissions"></div></section>`;
      const form = submitBox.querySelector('#gv-news-form');
      const feedback = submitBox.querySelector('#gv-news-form-feedback');
      form.addEventListener('submit', async event => {
        event.preventDefault();
        const fields = new FormData(form);
        const source = safeUrl(String(fields.get('source_url') || '').trim());
        if (!source) {
          feedback.innerHTML = '<div class="state error">Use a valid HTTPS source link.</div>';
          return;
        }
        const dateInput = String(fields.get('published_at') || '');
        const published = dateInput ? new Date(dateInput) : new Date();
        if (!Number.isFinite(published.getTime())) {
          feedback.innerHTML = '<div class="state error">Check the published date.</div>';
          return;
        }
        const button = form.querySelector('[type="submit"]');
        button.disabled = true;
        feedback.textContent = 'Submitting your link…';
        const { error } = await supabase.from('game_news').insert({
          game_id: String(fields.get('game_id') || '') || null,
          title: String(fields.get('title') || '').trim(),
          summary: String(fields.get('summary') || '').trim(),
          source_label: String(fields.get('source_label') || '').trim(),
          source_url: source,
          published_at: published.toISOString(),
          created_by: user.id,
          status: 'pending'
        });
        button.disabled = false;
        if (error) {
          feedback.innerHTML = `<div class="state error" role="alert">${escapeHtml(error.message)}</div>`;
          return;
        }
        form.reset();
        feedback.innerHTML = '<div class="state success" role="status">Sent for review. It will appear in the feed after a moderator approves it.</div>';
        await loadOwnSubmissions();
      });
    }

    const roles = user ? await supabase.from('user_roles').select('role').eq('user_id', user.id).in('role', ['admin', 'moderator']).limit(1) : { data: [] };
    const isModerator = Boolean(roles.data?.length);
    const pendingBox = root.querySelector('#game-news-pending');
    const loadPending = async () => {
      const target = pendingBox.querySelector('#gv-news-moderation-content') || pendingBox;
      const { data, error } = await supabase.from('game_news').select('id,title,summary,source_label,source_url,published_at,game_id,created_at')
        .eq('status', 'pending').order('created_at', { ascending: true }).limit(50);
      if (error) {
        target.innerHTML = `<div class="state error"><h3>Review queue unavailable</h3><p>${escapeHtml(error.message)}</p></div>`;
        return;
      }
      if (!data?.length) {
        target.innerHTML = '<div class="state">No stories are waiting for review.</div>';
        return;
      }
      target.innerHTML = `<div class="gv-news-list">${data.map(item => `<article class="gv-news-card gv-news-review-card"><div class="gv-news-meta"><span class="pill">${escapeHtml(gameById.get(item.game_id)?.title || 'GTA series')}</span><span>Pending review</span></div><h3>${escapeHtml(item.title)}</h3><p>${escapeHtml(item.summary || 'No summary provided.')}</p><div class="gv-news-source"><span>${escapeHtml(item.source_label)}</span><a class="btn" href="${escapeHtml(safeUrl(item.source_url) || '#')}" target="_blank" rel="noopener noreferrer">Review source ${icon('external-link')}</a></div><div class="row"><button class="btn btn-primary" type="button" data-news-review="approved" data-news-id="${item.id}">Approve</button><button class="btn" type="button" data-news-review="rejected" data-news-id="${item.id}">Reject</button></div></article>`).join('')}</div>`;
      target.querySelectorAll('[data-news-review]').forEach(button => button.addEventListener('click', async () => {
        button.disabled = true;
        const status = button.dataset.newsReview;
        const { error: reviewError } = await supabase.from('game_news').update({ status, reviewed_by: user.id, reviewed_at: new Date().toISOString() }).eq('id', button.dataset.newsId);
        if (reviewError) {
          button.disabled = false;
          button.insertAdjacentHTML('afterend', `<span class="state error">${escapeHtml(reviewError.message)}</span>`);
          return;
        }
        await Promise.all([loadPending(), loadFeed()]);
      }));
    };

    async function loadOwnSubmissions() {
      const box = submitBox.querySelector('#gv-news-my-submissions');
      if (!box || !user) return;
      const { data, error } = await supabase.from('game_news').select('id,title,status,created_at')
        .eq('created_by', user.id).order('created_at', { ascending: false }).limit(10);
      if (error) { box.innerHTML = `<div class="state error">${escapeHtml(error.message)}</div>`; return; }
      if (!data?.length) { box.innerHTML = ''; return; }
      box.innerHTML = `<div class="gv-news-my-submissions"><h3>My recent submissions</h3>${data.map(item => `<div class="gv-news-submission-row"><span>${escapeHtml(item.title)}</span><span class="pill">${escapeHtml(item.status)}</span></div>`).join('')}</div>`;
    }

    if (isModerator) {
      pendingBox.innerHTML = `<details class="surface gv-news-moderation" open><summary>Moderator review queue</summary><div class="gv-news-moderation-content" id="gv-news-moderation-content"><div class="state loading">Loading submissions…</div></div></details>`;
      await loadPending();
    }

    await loadFeed();
    if (user) await loadOwnSubmissions();
  }
});

function escapeHtml(value = '') {
  return String(value).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
}
