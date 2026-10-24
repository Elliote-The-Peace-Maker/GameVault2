import trackerCatalog from '../../data/gta-tracker-catalog.json';
import { escapeHTML, getOptionalUser, supabase } from '../services/supabase.js';
import { icon } from '../components/icons.js';

const categoryLabels = {
  missions: 'Missions', districts: 'City districts', vehicles: 'Vehicles', 'personal-records': 'Personal records',
  'time-trials': 'Time trials', 'gang-reputation': 'Gang reputation', 'story-missions': 'Story missions',
  'side-missions': 'Side missions', collectibles: 'Collectibles', rampages: 'Rampages', 'stunt-jumps': 'Stunt jumps',
  'asset-missions': 'Asset missions', territories: 'Territories', schools: 'Schools', safehouses: 'Safehouses',
  'empire-sites': 'Empire sites', 'drug-deals': 'Deals', 'side-activities': 'Side activities', achievements: 'Achievements',
  'base-jumps': 'Base jumps', heists: 'Heists', 'strangers-freaks': 'Strangers and Freaks', hobbies: 'Hobbies and pastimes',
  properties: 'Properties', regions: 'Regions explored', 'career-progress': 'Career progress', jobs: 'Jobs and missions',
  businesses: 'Businesses', 'weekly-challenges': 'Weekly challenges', collections: 'Collections', discovery: 'Discoveries',
  'episode-progress': 'Episode progress', 'launch-watchlist': 'Launch watchlist', 'edition-progress': 'Edition progress',
  'personal-goals': 'Personal goals', 'gang-activities': 'Gang activities'
};
const statusLabels = {
  planned: 'Planned', in_progress: 'In progress', completed: 'Completed', discovered: 'Discovered',
  owned: 'Owned', wanted: 'Wanted', skipped: 'Skipped'
};
const safe = escapeHTML;

function renderEntries(entries, categoryMap, upcoming) {
  if (!entries.length) return `<div class="state gv-tracker-empty"><h3>${upcoming ? 'Your watchlist is ready' : 'Your checklist is ready'}</h3><p>${upcoming ? 'Save a sourced announcement or launch detail you want to follow.' : 'Save a mission, collectible, discovery, challenge, or personal goal to start your own log.'}</p></div>`;
  return `<div class="gv-tracker-list">${entries.map(entry => {
    const category = categoryMap.get(entry.category) || categoryLabels[entry.category] || entry.category;
    const statusOptions = Object.entries(statusLabels).map(([value, label]) => `<option value="${value}" ${entry.status === value ? 'selected' : ''}>${label}</option>`).join('');
    return `<article class="gv-tracker-entry"><div class="gv-tracker-entry-copy"><span class="gv-tracker-category">${safe(category)}</span><strong>${safe(entry.title)}</strong>${entry.note ? `<p>${safe(entry.note)}</p>` : ''}<small>Updated ${new Date(entry.updated_at).toLocaleDateString()}</small></div><label class="sr-only" for="progress-status-${entry.id}">Update ${safe(entry.title)} status</label><select id="progress-status-${entry.id}" class="select gv-tracker-status" data-progress-status="${entry.id}">${statusOptions}</select><button class="btn icon-btn gv-tracker-delete" type="button" data-progress-delete="${entry.id}" aria-label="Delete ${safe(entry.title)}" title="Delete entry">${icon('trash')}</button></article>`;
  }).join('')}</div>`;
}

function streakCount(entries) {
  const days = new Set(entries.map(entry => new Date(entry.updated_at).toISOString().slice(0, 10)));
  const today = new Date();
  const toDay = date => `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}-${String(date.getUTCDate()).padStart(2, '0')}`;
  let cursor = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()));
  if (!days.has(toDay(cursor))) cursor.setUTCDate(cursor.getUTCDate() - 1);
  let count = 0;
  while (days.has(toDay(cursor))) { count += 1; cursor.setUTCDate(cursor.getUTCDate() - 1); }
  return count;
}

function challengePrompt(category, game) {
  const title = categoryLabels[category] || category;
  const prompts = {
    missions: `Complete one mission you have not logged in ${game.title}.`,
    'story-missions': `Pick the next story mission you want to record for ${game.title}.`,
    'side-missions': `Choose one optional mission to add to your ${game.title} checklist.`,
    collectibles: `Find and log one collectible, using the name from your own game edition.`,
    districts: `Explore a district you have not logged and save its name.`,
    regions: `Explore a region you have not logged and save its name.`,
    discovery: `Record one new place you discover in ${game.title}.`,
    vehicles: `Choose one vehicle to add to your ${game.title} find, use, or own list.`,
    properties: `Add one property goal you want to track in ${game.title}.`,
    businesses: `Choose one business goal to log for your next ${game.title} session.`,
    heists: `Pick one heist milestone you want to track in your own notes.`,
    achievements: `Record an achievement after you confirm it in your game.`,
    'weekly-challenges': `Choose one weekly challenge to track during this week.`,
    'launch-watchlist': `Add an official announcement or launch detail you want to follow.`,
    'edition-progress': `Choose an edition in this collection and prefix one goal with its title.`,
    'episode-progress': `Choose an episode and add one milestone, using the episode name in your entry.`,
    'personal-goals': `Write one personal goal for your next ${game.title} session.`
  };
  return prompts[category] || `Set one ${title.toLowerCase()} goal for your next ${game.title} session.`;
}

export async function mountGameTracker(container, { game, configured }) {
  if (!container) return;
  const featureSet = trackerCatalog[game.slug] || { categories: ['personal-goals'], note: 'Save your own notes for this title.' };
  const labels = featureSet.categories.map(key => categoryLabels[key] || key);
  const options = featureSet.categories.map(key => `<option value="${safe(key)}">${safe(categoryLabels[key] || key)}</option>`).join('');
  const upcoming = featureSet.mode === 'pre-release';
  container.innerHTML = `<section class="surface gv-tracker"><div class="gv-tracker-head"><div><p class="eyebrow">${upcoming ? 'BEFORE LAUNCH' : 'YOUR PLAYER LOG'}</p><h2>${upcoming ? 'Launch watchlist' : `Your ${safe(game.title)} tracker`}</h2><p class="muted">${safe(featureSet.note)} This is a private, player-entered checklist; it does not connect to Rockstar or verify in-game progress.</p></div><div class="gv-tracker-head-mark">${icon(upcoming ? 'notifications' : 'history')}</div></div><div class="gv-tracker-chips">${labels.map(label => `<span class="pill">${safe(label)}</span>`).join('')}</div><div class="gv-tracker-quicklinks"><a class="btn" href="/pages/challenges.html">Challenges & rankings ${icon('arrow-right')}</a><a class="btn" href="/pages/history.html">Achievements & history ${icon('arrow-right')}</a><a class="btn" href="/pages/maps.html">Worlds & maps ${icon('arrow-right')}</a><a class="btn" href="/pages/subscriptions.html">Membership options ${icon('arrow-right')}</a></div><div class="gv-tracker-content" id="gv-tracker-content"><div class="state loading">Checking your account…</div></div></section>`;

  const content = container.querySelector('#gv-tracker-content');
  if (!configured || !supabase) {
    content.innerHTML = '<div class="state info"><h3>Account tracking needs the database</h3><p>GameVault is not connected to Supabase on this build. Your checklist will not be saved until the backend is configured.</p></div>';
    return;
  }
  if (!game.id) {
    content.innerHTML = '<div class="state info"><h3>This title is not in the connected catalog</h3><p>Apply the GTA catalog seed before creating account progress for this title.</p></div>';
    return;
  }

  const auth = await getOptionalUser();
  if (auth.error) {
    content.innerHTML = `<div class="state error"><h3>Sign-in status unavailable</h3><p>${safe(auth.error.message)}</p><button class="btn" type="button" data-tracker-retry>Retry</button></div>`;
    content.querySelector('[data-tracker-retry]')?.addEventListener('click', () => mountGameTracker(container, { game, configured }));
    return;
  }
  const user = auth.data?.user;
  if (!user) {
    content.innerHTML = `<div class="state info gv-tracker-signin"><h3>Your log belongs to your account</h3><p>${upcoming ? 'Sign in to save private launch notes and follow sourced announcements.' : 'Sign in to save your private missions, discoveries, collections, challenge goals, and GameVault log activity streak.'}</p><div class="row"><a class="btn btn-primary" href="/pages/login.html?next=${encodeURIComponent(location.pathname + location.search)}">Sign in to track</a><a class="btn" href="/pages/signup.html">Create account</a></div></div>`;
    return;
  }

  const categoryMap = new Map(featureSet.categories.map(key => [key, categoryLabels[key] || key]));
  content.innerHTML = `<div class="gv-tracker-summary" id="gv-tracker-summary"></div><div class="gv-tracker-generator"><div><strong>${upcoming ? 'Make a launch note' : 'Need an objective?'}</strong><small>${upcoming ? 'Save what you want to follow before release.' : 'Generate a personal prompt from this game’s tracker categories.'}</small></div><button class="btn" type="button" id="gv-suggest-goal">${upcoming ? 'Suggest a watch item' : 'Suggest an objective'} ${icon('plus')}</button></div><form class="gv-tracker-form" id="gv-tracker-form"><label class="field-wrap">Category<select class="select" name="category" required>${options}</select></label><label class="field-wrap">What are you tracking?<input class="field" name="title" maxlength="140" placeholder="${upcoming ? 'e.g. Follow an official launch announcement' : 'e.g. Area, mission, or item name'}" required></label><label class="field-wrap">Status<select class="select" name="status"><option value="planned">Planned</option><option value="in_progress">In progress</option><option value="completed">Completed</option><option value="discovered">Discovered</option><option value="owned">Owned</option><option value="wanted">Wanted</option><option value="skipped">Skipped</option></select></label><label class="field-wrap gv-tracker-note">Personal note <span class="muted">optional</span><textarea class="textarea" name="note" maxlength="500" placeholder="A note for yourself"></textarea></label><div class="gv-tracker-feedback" id="gv-tracker-feedback" aria-live="polite"></div><button class="btn btn-primary" type="submit">${upcoming ? 'Save launch note' : 'Save to my tracker'} ${icon('check')}</button></form><div class="gv-tracker-recent"><div class="gv-tracker-list-heading"><h3>My saved entries</h3><span id="gv-tracker-count"></span></div><div id="gv-tracker-entries"><div class="state loading">Loading your saved entries…</div></div><small class="muted">Showing up to your 100 most recent entries.</small></div>`;

  const form = content.querySelector('#gv-tracker-form');
  const feedback = content.querySelector('#gv-tracker-feedback');
  const draw = async () => {
    const { data, error } = await supabase.from('game_progress_entries')
      .select('id,category,title,status,note,created_at,updated_at')
      .eq('user_id', user.id).eq('game_id', game.id)
      .order('updated_at', { ascending: false }).limit(100);
    if (error) {
      content.querySelector('#gv-tracker-entries').innerHTML = `<div class="state error"><h3>Progress could not load</h3><p>${safe(error.message)}</p><button type="button" class="btn" data-tracker-reload>Try again</button></div>`;
      content.querySelector('[data-tracker-reload]')?.addEventListener('click', draw);
      return;
    }
    const entries = data || [];
    const completed = entries.filter(entry => entry.status === 'completed').length;
    const streak = streakCount(entries);
    content.querySelector('#gv-tracker-summary').innerHTML = `<div><strong>${entries.length}</strong><span>saved entries</span></div><div><strong>${completed}</strong><span>marked complete</span></div><div><strong>${streak} day${streak === 1 ? '' : 's'}</strong><span>GameVault log activity streak</span></div>`;
    content.querySelector('#gv-tracker-count').textContent = `${entries.length} / 100`;
    content.querySelector('#gv-tracker-entries').innerHTML = renderEntries(entries, categoryMap, upcoming);
    content.querySelectorAll('[data-progress-status]').forEach(select => select.addEventListener('change', async () => {
      select.disabled = true;
      const { error: updateError } = await supabase.from('game_progress_entries')
        .update({ status: select.value, updated_at: new Date().toISOString() })
        .eq('id', select.dataset.progressStatus).eq('user_id', user.id).eq('game_id', game.id);
      if (updateError) {
        feedback.innerHTML = `<div class="state error">${safe(updateError.message)}</div>`;
        select.disabled = false;
        return;
      }
      feedback.innerHTML = '<div class="state success">Progress updated.</div>';
      await draw();
    }));
    content.querySelectorAll('[data-progress-delete]').forEach(button => button.addEventListener('click', async () => {
      button.disabled = true;
      const { error: deleteError } = await supabase.from('game_progress_entries').delete()
        .eq('id', button.dataset.progressDelete).eq('user_id', user.id).eq('game_id', game.id);
      if (deleteError) {
        feedback.innerHTML = `<div class="state error">${safe(deleteError.message)}</div>`;
        button.disabled = false;
        return;
      }
      feedback.innerHTML = '<div class="state success">Entry removed from your tracker.</div>';
      await draw();
    }));
  };

  content.querySelector('#gv-suggest-goal').addEventListener('click', () => {
    const category = featureSet.categories[Math.floor(Math.random() * featureSet.categories.length)];
    form.elements.category.value = category;
    form.elements.title.value = challengePrompt(category, game);
    form.elements.status.value = 'planned';
    form.elements.title.focus();
  });
  form.addEventListener('submit', async event => {
    event.preventDefault();
    const fields = new FormData(form);
    const entry = {
      user_id: user.id,
      game_id: game.id,
      category: String(fields.get('category')),
      title: String(fields.get('title')).trim(),
      status: String(fields.get('status')),
      note: String(fields.get('note') || '').trim(),
      is_user_entered: true
    };
    if (!categoryMap.has(entry.category) || !entry.title) return;
    const submit = form.querySelector('[type="submit"]');
    submit.disabled = true;
    feedback.textContent = 'Saving to your account…';
    const { error } = await supabase.from('game_progress_entries').insert(entry);
    submit.disabled = false;
    if (error) {
      feedback.innerHTML = `<div class="state error" role="alert"><strong>Could not save.</strong> ${safe(error.code === '23505' ? 'You already have an entry with this title and category.' : error.message)}</div>`;
      return;
    }
    form.reset();
    feedback.innerHTML = '<div class="state success" role="status">Saved to your private account tracker.</div>';
    await draw();
  });
  await draw();
}
