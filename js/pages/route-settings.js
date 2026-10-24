import { renderShell } from '../components/shell.js';
import { supabase, SUPABASE_CONFIGURED, escapeHTML, getOptionalUser } from '../services/supabase.js';
import { THEMES, applyTheme, getSavedTheme } from '../services/theme.js';

renderShell('settings', 'Settings', 'Choose a Grand Theft Auto era theme and manage your GameVault account preferences.');
const root = document.querySelector('#page-content');
const migrationName = 'supabase/migrations/20261024132041_202610230001_gamevault_gta_catalog_and_themes.sql';

function themeCard(theme, selected) {
  return '<button type="button" class="gv-theme-card" data-theme-choice="' + theme.id + '" aria-pressed="' + (theme.id === selected) + '">' +
    '<span class="gv-theme-swatch" style="--swatch-a:' + theme.colors[0] + ';--swatch-b:' + theme.colors[1] + '" aria-hidden="true"></span>' +
    '<strong>' + escapeHTML(theme.name) + '</strong><small>' + escapeHTML(theme.description) + '</small><span class="gv-era">' + escapeHTML(theme.era) + '</span></button>';
}

function accountLinks() {
  const links = [
    ['Profile', 'Name, username, bio, avatar, and GTA favorites', '/pages/account/profile.html'],
    ['Privacy', 'Profile visibility and public fields', '/pages/account/privacy.html'],
    ['Security', 'Verified email, password, and account protection', '/pages/account/security.html'],
    ['Notifications', 'Choose which GameVault alerts you receive', '/pages/account/notifications.html'],
    ['Membership', 'Plan options, map features, and billing status', '/pages/subscriptions.html'],
    ['GTA library', 'Your saved GTA games and favorites', '/pages/account/games.html'],
    ['Account', 'Account overview and deletion controls', '/pages/account.html']
  ];
  return '<section class="surface surface-pad gv-account-settings"><h2 class="section-title">Account settings</h2><div class="grid grid-3">' +
    links.map(function (item) {
      return '<a class="data-row surface" href="' + item[2] + '"><span class="gv-setting-symbol" aria-hidden="true">↗</span><span class="grow"><h3>' +
        escapeHTML(item[0]) + '</h3><p>' + escapeHTML(item[1]) + '</p></span></a>';
    }).join('') + '</div></section>';
}

function missingThemeColumn(error) {
  const message = String(error?.message || '').toLowerCase();
  return error?.code === '42703' || error?.code === 'PGRST204' ||
    (message.includes('ui_theme') && (message.includes('schema cache') || message.includes('column') || message.includes('field')));
}

async function init() {
  let user = null;
  let selected = getSavedTheme();
  let syncNotice = '';
  if (SUPABASE_CONFIGURED && supabase) {
    const auth = await getOptionalUser();
    if (auth.error) throw auth.error;
    user = auth.data.user;
    if (user) {
      const prefs = await supabase.from('account_preferences').select('ui_theme').eq('user_id', user.id).maybeSingle();
      if (prefs.error) {
        syncNotice = missingThemeColumn(prefs.error)
          ? 'Run ' + migrationName + ' in your Supabase project to add account theme sync. The selected theme still works on this browser.'
          : 'Your saved theme could not be loaded. The theme selected on this browser is active. ' + prefs.error.message;
      } else if (prefs.data?.ui_theme) {
        selected = applyTheme(prefs.data.ui_theme, { remember: true });
      }
    }
  }

  root.innerHTML = '<section class="surface surface-pad gv-theme-settings"><div class="home-section-heading"><div><p class="eyebrow">MAKE IT YOURS</p><h2>Choose your era</h2></div><span class="pill">6 original themes</span></div>' +
    '<p class="muted tiny">GameVault palettes inspired by GTA worlds and eras. Theme changes recolor the interface across pages.</p>' +
    '<div class="gv-theme-grid">' + THEMES.map(function (theme) { return themeCard(theme, selected); }).join('') + '</div>' +
    '<p class="gv-theme-note">These are original community palettes, not Rockstar UI assets. Map guides use original abstract artwork, not copied in-game maps.</p>' +
    '<div class="gv-theme-feedback" id="theme-feedback" role="status"></div></section>';

  if (!SUPABASE_CONFIGURED || !supabase) {
    root.insertAdjacentHTML('beforeend', '<div class="state info"><h3>Backend not configured</h3><p>Your theme preview is saved on this browser. Connect Supabase to sync the preference with your GameVault account and use account settings.</p><a class="btn btn-primary" href="/pages/help.html">Supabase setup guide</a></div>');
  } else if (!user) {
    root.insertAdjacentHTML('beforeend', '<div class="state info"><h3>Sign in to sync your theme</h3><p>You can preview themes on this browser. Sign in to save your choice to your account.</p><a class="btn btn-primary" href="/pages/login.html?next=%2Fpages%2Fsettings.html">Sign in</a> <a class="btn" href="/pages/signup.html">Create account</a></div>');
  } else {
    root.insertAdjacentHTML('beforeend', accountLinks());
  }

  if (syncNotice) {
    root.querySelector('#theme-feedback').textContent = syncNotice;
    root.querySelector('#theme-feedback').className = 'gv-theme-feedback state info';
  }

  root.querySelectorAll('[data-theme-choice]').forEach(function (button) {
    button.addEventListener('click', async function () {
      const theme = applyTheme(button.dataset.themeChoice, { remember: true });
      root.querySelectorAll('[data-theme-choice]').forEach(function (option) {
        option.setAttribute('aria-pressed', String(option.dataset.themeChoice === theme));
      });
      const feedback = root.querySelector('#theme-feedback');
      feedback.className = 'gv-theme-feedback';
      feedback.textContent = user && SUPABASE_CONFIGURED ? 'Saving your GameVault theme…' : 'Theme applied and saved on this browser.';
      if (!user || !supabase || !SUPABASE_CONFIGURED) return;
      const result = await supabase.from('account_preferences').upsert({ user_id: user.id, ui_theme: theme }, { onConflict: 'user_id' });
      if (result.error) {
        feedback.textContent = missingThemeColumn(result.error)
          ? 'Theme is active on this browser. Run ' + migrationName + ' in Supabase to sync it to your account.'
          : 'Theme is active on this browser, but account sync failed. ' + result.error.message;
        feedback.className = 'gv-theme-feedback state info';
      } else {
        feedback.textContent = 'Theme saved to your GameVault account.';
        feedback.className = 'gv-theme-feedback state success';
      }
    });
  });
}

init().catch(function (error) {
  root.innerHTML = '<div class="state error"><h3>Settings could not load</h3><p>' + escapeHTML(error.message || 'Please retry.') + '</p><button class="btn" onclick="location.reload()">Retry</button></div>';
});
