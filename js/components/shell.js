import { supabase, SUPABASE_CONFIGURED, escapeHTML, inspectCoreSchema, getOptionalUser } from '../services/supabase.js';
import { mountVexraPet } from './vexra-pet.js';
import { icon } from './icons.js';
import { THEMES, applyTheme, getSavedTheme } from '../services/theme.js';
import { avatarMarkup } from './avatars.js';

const primary = [
  ['home', 'home', 'GTA Feed', '/pages/home.html'],
  ['explore', 'explore', 'Explore', '/pages/explore.html'],
  ['communities', 'communities', 'Communities', '/pages/communities.html'],
  ['games', 'games', 'GTA games', '/games/index.html'],
  ['creators', 'creator', 'Creator hub', '/pages/creators.html'],
  ['media', 'media', 'Clips & media', '/pages/media.html'],
  ['streams', 'streams', 'Streams', '/pages/streams.html'],
  ['challenges', 'challenges', 'Challenges', '/pages/challenges.html'],
  ['maps', 'maps', 'Worlds & maps', '/pages/maps.html'],
];
const social = [
  ['messages', 'messages', 'Messages', '/pages/messages.html'],
  ['notifications', 'notifications', 'Notifications', '/pages/notifications.html'],
  ['history', 'history', 'Achievements & history', '/pages/history.html'],
];
const account = [
  ['account', 'account', 'Account overview', '/pages/account.html'],
  ['subscriptions', 'subscription', 'Membership', '/pages/subscriptions.html'],
  ['settings', 'settings', 'Settings', '/pages/settings.html'],
  ['help', 'help', 'Guidelines & help', '/pages/help.html'],
];
const railItems = [primary[0], primary[1], primary[3], primary[8], primary[2], primary[5], social[0], account[1]];
const quickThemes = THEMES.slice(0, 3);
async function loadSidebarIdentity(root) {
  const target = root.querySelector('#sidebar-identity');
  if (!target) return;
  if (!SUPABASE_CONFIGURED || !supabase) {
    target.innerHTML = `${avatarMarkup({ id: 'guest-player' },'sidebar-player-avatar','GameVault player avatar')}<div class="sidebar-player-copy"><strong>Guest player</strong><small>Your GTA community starts here</small></div><div class="sidebar-player-actions"><a class="btn btn-primary" href="/pages/login.html">Sign in</a><a href="/pages/signup.html">Create account</a></div>`;
    return;
  }
  try {
    const { data: { user }, error } = await getOptionalUser();
    if (error) throw error;
    if (!user) {
      target.innerHTML = `${avatarMarkup({ id: 'guest-player' },'sidebar-player-avatar','GameVault player avatar')}<div class="sidebar-player-copy"><strong>Guest player</strong><small>Sign in to sync your GameVault space</small></div><div class="sidebar-player-actions"><a class="btn btn-primary" href="/pages/login.html">Sign in</a><a href="/pages/signup.html">Create account</a></div>`;
      return;
    }
    const { data: profile } = await supabase.from('profile_cards').select('username,display_name,avatar_url').eq('id', user.id).maybeSingle();
    const name = escapeHTML(profile?.display_name || profile?.username || user.user_metadata?.display_name || 'GameVault player');
    const avatar = avatarMarkup({ ...profile, id: user.id },'sidebar-player-avatar',`${profile?.display_name||profile?.username||'GameVault player'} avatar`);
    target.innerHTML = `<a class="sidebar-player-link" href="/pages/account.html">${avatar}<span class="sidebar-player-copy"><strong>${name}</strong><small>${profile?.username ? `@${escapeHTML(profile.username)}` : 'Your GameVault profile'}</small></span><span class="sidebar-player-arrow">${icon('external-link')}</span></a><a class="sidebar-player-library" href="/games/library/">Open my game library ${icon('arrow-right')}</a>`;
  } catch {
    target.innerHTML = `${avatarMarkup({ id: 'gamevault-player' },'sidebar-player-avatar','GameVault player avatar')}<div class="sidebar-player-copy"><strong>Player profile</strong><small>Profile details are unavailable</small></div><a class="sidebar-player-library" href="/pages/account.html">Open account ${icon('arrow-right')}</a>`;
  }
}

function link([id, iconKey, label, url], page) {
  const active = id === page || id === 'library' && page === 'account-games' || id === 'account' && page.startsWith('account-');
  return `<a href="${url}" data-nav="${id}" ${active ? 'aria-current="page"' : ''}><span class="nav-icon">${icon(iconKey, 'nav-symbol')}</span><span>${label}</span></a>`;
}

function initials(label = 'GameVault') {
  return String(label).split(/[\s_-]+/).filter(Boolean).slice(0, 2).map(part => part[0]).join('').toUpperCase() || 'V';
}

export function renderShell(page, title, description) {
  const root = document.querySelector('[data-app-shell]');
  applyTheme(getSavedTheme());
  if (!root) return;
  root.classList.add('app-frame');
  root.dataset.page = page;
  root.innerHTML = `
    <div class="boot-splash" id="boot-splash" role="status" aria-label="Opening GameVault"><span class="gv-logo-frame gv-logo-large"><img src="/assets/vault-guide-skull.png" alt=""></span><span>GAMEVAULT</span><small>THE GRAND THEFT AUTO COMMUNITY</small><i></i></div>
    <header class="topbar">
      <div class="window-lights" role="group" aria-label="Quick color themes">${quickThemes.map(theme => `<button type="button" data-theme-choice="${theme.id}" aria-label="Use ${escapeHTML(theme.name)} theme" title="${escapeHTML(theme.name)} theme" aria-pressed="${getSavedTheme() === theme.id}" style="--quick-theme-a:${theme.colors[0]};--quick-theme-b:${theme.colors[1]}"></button>`).join('')}</div>
      <span class="quick-theme-status" id="quick-theme-status" role="status" aria-live="polite"></span>
      <button class="btn icon-btn mobile-menu" type="button" aria-label="Open navigation" aria-expanded="false">${icon('menu')}</button>
      <a class="mobile-brand" href="/pages/home.html" aria-label="GameVault home"><span class="gv-logo-frame"><img src="/assets/vault-guide-skull.png" alt=""></span><span class="gv-brand-word">GAME<b>VAULT</b></span></a>
      <span class="crumb">${escapeHTML(title)}</span>
      <label class="top-search" aria-label="Search GameVault"><span>${icon('search')}</span><input id="global-search" placeholder="Search GTA titles, maps, crews…" autocomplete="off"><kbd>/</kbd></label>
      <span class="topbar-motto">VICE CITY · AFTER DARK</span>
      <div class="top-actions"><a class="btn account-link sign-in-link" href="/pages/login.html">Sign in</a><a class="btn btn-primary account-link join-link" href="/pages/signup.html">Join GameVault</a></div>
    </header>
    <nav class="app-rail" aria-label="Quick access">
      ${railItems.map(([id, iconKey, label, url]) => {
        const active = id === page || id === 'communities' && page === 'community' || id === 'games' && page === 'account-games' || id === 'settings' && page.startsWith('account-');
        return `<a href="${url}" title="${label}" aria-label="${label}" ${active ? 'aria-current="page"' : ''}>${icon(iconKey)}<span class="sr-only">${label}</span></a>`;
      }).join('')}
      <button class="app-rail-toggle" type="button" aria-label="Collapse full navigation" aria-expanded="true" aria-controls="sidebar" title="Collapse full navigation">${icon('menu')}</button>
    </nav>
    <aside class="sidebar" id="sidebar">
      <a class="brand" href="/pages/home.html" aria-label="GameVault home"><span class="gv-logo-frame"><img src="/assets/vault-guide-skull.png" alt="GameVault skull mark"></span><span class="gv-brand-word">GAME<b>VAULT</b></span></a>
      <section class="sidebar-player" id="sidebar-identity" aria-label="Player account"><div class="sidebar-player-loading">Loading player space…</div></section>
      <div class="nav-label">PLAY</div><nav class="nav-list" aria-label="Play">${[primary[0],primary[3],['library','library','My game library','/games/library/']].map(item => link(item, page)).join('')}</nav>
      <div class="nav-label">DISCOVER</div><nav class="nav-list" aria-label="Discover">${[primary[1],primary[2],primary[8]].map(item => link(item, page)).join('')}</nav>
      <details class="nav-more" ${['streams','media','creators','messages','notifications','challenges','history'].includes(page) ? 'open' : ''}><summary>More features ${icon('chevron-down','nav-chevron')}</summary><nav class="nav-list" aria-label="More features">${[primary[6],primary[5],primary[4],social[0],social[1],primary[7],social[2]].map(item => link(item, page)).join('')}</nav></details>
      <div class="nav-label">ACCOUNT</div>
      <nav class="nav-list" aria-label="Account">${account.map(item => link(item, page)).join('')}<span id="moderation-nav"></span></nav>
      <div class="sidebar-foot"><div class="sidebar-wordmark">GAME<b>VAULT</b></div><span>GRAND THEFT AUTO COMMUNITY</span></div>
    </aside>
    <button class="sidebar-scrim" type="button" aria-label="Close navigation"></button>
    <section class="main-column">
      <main class="page-wrap"><div class="page-heading"><div><p class="eyebrow">GAMEVAULT · GTA COMMUNITY</p><h1>${escapeHTML(title)}</h1><p>${escapeHTML(description)}</p></div></div><div id="backend-status" aria-live="polite"></div><div id="page-content" aria-live="polite"></div></main>
      <footer class="app-footer"><span>GameVault · Grand Theft Auto community · <a href="/pages/help.html">Guidelines</a> · Backend status is shown on data-backed pages.</span><details class="icon-credit"><summary>Icon credits</summary><p>Navigation icons use <a href="https://github.com/lucide-icons/lucide" target="_blank" rel="noreferrer">Lucide</a> (ISC). Social platform marks use <a href="https://github.com/simple-icons/simple-icons" target="_blank" rel="noreferrer">Simple Icons</a> (CC0); platform marks remain trademarks of their owners. Full notices are in <a href="/ASSET-RIGHTS.md">ASSET-RIGHTS.md</a>.</p></details></footer>
    </section>
    <nav class="mobile-nav" aria-label="Quick navigation">${[['home','home','Home','/pages/home.html'],['explore','explore','Explore','/pages/explore.html'],['games','games','GTA','/games/index.html'],['maps','maps','Worlds','/pages/maps.html'],['account','account','Account','/pages/account.html']].map(([id,iconKey,label,url]) => `<a href="${url}" ${id === page || id === 'library' && page === 'account-games' ? 'aria-current="page"' : ''}><span class="mobile-nav-icon">${icon(iconKey)}</span><span>${label}</span></a>`).join('')}</nav>`;

  mountVexraPet(root);
  loadSidebarIdentity(root);
  if (SUPABASE_CONFIGURED) {
    inspectCoreSchema().then((status) => {
      const target = root.querySelector('#backend-status');
      if (!target || status.status === 'ready') return;
      if (status.status === 'missing') {
        target.innerHTML = '<div class="status-banner" role="status"><span aria-hidden="true">◈</span><span><strong>Database setup incomplete.</strong> Supabase responded, but GameVault tables are not available yet. Account creation, saved settings, and community data will remain unavailable until the migrations in <code>supabase/migrations/</code> are applied.</span></div>';
      } else {
        target.innerHTML = '<div class="status-banner" role="status"><span aria-hidden="true">◈</span><span><strong>Database connection unavailable.</strong> GameVault could not confirm its core tables. Check the Supabase project URL, API availability, and migration status.</span></div>';
      }
    });
  }
  const splash = root.querySelector('#boot-splash');
  let splashSeen = false;
  try {
    splashSeen = sessionStorage.getItem('gamevault-boot-seen') === '1';
    if (!splashSeen) sessionStorage.setItem('gamevault-boot-seen', '1');
  } catch {}
  if (splashSeen) splash.remove();
  else setTimeout(() => { splash.classList.add('done'); setTimeout(() => splash.remove(), 550); }, 850);

  const menu = root.querySelector('.mobile-menu');
  const sidebar = root.querySelector('.sidebar');
  const scrim = root.querySelector('.sidebar-scrim');
  const railToggle = root.querySelector('.app-rail-toggle');
  const themeStatus = root.querySelector('#quick-theme-status');
  let themeStatusTimer;
  const updateQuickThemeState = (theme) => root.querySelectorAll('.window-lights [data-theme-choice]').forEach(button => {
    button.setAttribute('aria-pressed', String(button.dataset.themeChoice === theme));
  });
  const showThemeStatus = (message) => {
    if (!themeStatus) return;
    themeStatus.textContent = message;
    themeStatus.dataset.visible = 'true';
    clearTimeout(themeStatusTimer);
    themeStatusTimer = setTimeout(() => { themeStatus.dataset.visible = 'false'; }, 2800);
  };
  root.querySelectorAll('.window-lights [data-theme-choice]').forEach(button => button.addEventListener('click', async () => {
    const theme = applyTheme(button.dataset.themeChoice, { remember: true });
    updateQuickThemeState(theme);
    showThemeStatus(`${quickThemes.find(item => item.id === theme)?.name || 'Theme'} applied · saving…`);
    if (!supabase || !SUPABASE_CONFIGURED) {
      showThemeStatus(`${quickThemes.find(item => item.id === theme)?.name || 'Theme'} applied · saved here`);
      return;
    }
    try {
      const auth = await getOptionalUser();
      if (auth.error) throw auth.error;
      if (!auth.data.user) {
        showThemeStatus(`${quickThemes.find(item => item.id === theme)?.name || 'Theme'} applied · saved here`);
        return;
      }
      const result = await supabase.from('account_preferences').upsert({ user_id: auth.data.user.id, ui_theme: theme }, { onConflict: 'user_id' });
      if (result.error) throw result.error;
      showThemeStatus(`${quickThemes.find(item => item.id === theme)?.name || 'Theme'} saved to account`);
    } catch {
      showThemeStatus(`${quickThemes.find(item => item.id === theme)?.name || 'Theme'} saved here · account sync unavailable`);
    }
  }));
  railToggle?.addEventListener('click', () => {
    const collapsed = root.classList.toggle('nav-collapsed');
    railToggle.setAttribute('aria-expanded', String(!collapsed));
    railToggle.setAttribute('aria-label', collapsed ? 'Expand full navigation' : 'Collapse full navigation');
    railToggle.title = collapsed ? 'Expand full navigation' : 'Collapse full navigation';
  });
  const closeMenu = () => {
    sidebar?.classList.remove('open');
    menu?.setAttribute('aria-expanded', 'false');
    menu?.setAttribute('aria-label', 'Open navigation');
    if (menu) menu.innerHTML = icon('menu');
  };
  menu?.addEventListener('click', () => {
    const open = sidebar.classList.toggle('open');
    menu.setAttribute('aria-expanded', String(open));
    menu.setAttribute('aria-label', open ? 'Close navigation' : 'Open navigation');
    menu.innerHTML = icon(open ? 'close' : 'menu');
  });
  scrim?.addEventListener('click', closeMenu);
  sidebar?.querySelectorAll('a').forEach(anchor => anchor.addEventListener('click', () => {
    closeMenu();
  }));
  document.addEventListener('keydown', event => {
    if (event.key === '/' && !['INPUT', 'TEXTAREA'].includes(document.activeElement.tagName)) {
      event.preventDefault();
      root.querySelector('#global-search')?.focus();
    }
  });
  root.querySelector('#global-search')?.addEventListener('keydown', event => {
    if (event.key === 'Enter' && event.target.value.trim()) location.href = '/pages/explore.html?q=' + encodeURIComponent(event.target.value.trim());
  });
  if (supabase) {
    getOptionalUser().then(async ({ data: { user } }) => {
      if (!user) return;
      const { data: preferences } = await supabase.from('account_preferences').select('ui_theme').eq('user_id', user.id).maybeSingle();
      if (preferences?.ui_theme) {
        applyTheme(preferences.ui_theme, { remember: true });
        updateQuickThemeState(preferences.ui_theme);
      }
      const actions = root.querySelector('.top-actions');
      if (actions) {
        actions.innerHTML = '<a class="btn account-link" href="/pages/account.html">My account</a><button class="btn" id="shell-signout">Sign out</button>';
        actions.querySelector('#shell-signout').addEventListener('click', async () => {
          const { error } = await supabase.auth.signOut();
          if (error) alert(error.message);
          else location.href = '/pages/home.html';
        });
      }
      const role = await supabase.from('user_roles').select('role').eq('user_id', user.id).in('role', ['moderator', 'admin']).limit(1);
      if (role.data?.length) root.querySelector('#moderation-nav').innerHTML = `<a href="/pages/moderation.html" data-nav="moderation" ${page === 'moderation' ? 'aria-current="page"' : ''}><span class="nav-icon">${icon('moderation','nav-symbol')}</span><span>Moderation</span></a>`;
    }).catch(() => {});
  }
}
