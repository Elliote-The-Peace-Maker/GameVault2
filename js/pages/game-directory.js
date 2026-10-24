import catalog from '../../data/game-catalog.json';
import { mountPage } from './runtime.js';
import { loadGames } from '../services/data.js';
import { escapeHTML } from '../services/supabase.js';
import { icon } from '../components/icons.js';

const known = new Map(catalog.map(function (game) { return [game.slug, game]; }));

function normalizeGame(row) {
  const local = known.get(row.slug);
  return local ? Object.assign({}, local, row, { platforms: row.game_platforms?.map(function (item) {
    return item.platforms?.name;
  }).filter(Boolean) || local.platforms }) : null;
}

function gameCard(game) {
  const classes = game.year < 2000 ? 'early' : game.year < 2008 ? 'classic' : game.year < 2013 ? 'modern' : game.is_upcoming ? 'future' : 'coastal';
  const status = game.is_upcoming ? '<span class="gv-game-status upcoming">UPCOMING</span>' : '<span class="gv-game-status">' + escapeHTML(String(game.year || 'GTA')) + '</span>';
  const art = game.game_image_path || game.cover_path || game.artwork_path;
  const cover = art ? '<img class="gv-catalog-cover" src="' + escapeHTML(art) + '" alt="" loading="lazy" decoding="async">' : '';
  return '<article class="surface gv-catalog-card"><a class="gv-catalog-art gv-era-' + classes + '" href="/games/' + encodeURIComponent(game.slug) + '/" aria-label="Open ' + escapeHTML(game.title) + '">' +
    cover + '<span class="gv-art-sun" aria-hidden="true"></span><span class="gv-art-grid" aria-hidden="true"></span>' + status +
    '<span class="gv-art-caption">' + escapeHTML(game.setting || 'Grand Theft Auto') + '</span></a>' +
    '<div class="gv-catalog-copy"><p class="eyebrow">' + escapeHTML(game.genre || game.entry_type || 'GTA') + '</p>' +
    '<h2><a href="/games/' + encodeURIComponent(game.slug) + '/">' + escapeHTML(game.title) + '</a></h2>' +
    '<p>' + escapeHTML(game.description) + '</p><div class="gv-platform-list">' + (game.platforms || []).slice(0, 4).map(function (platform) {
      return '<span class="pill">' + escapeHTML(platform) + '</span>';
    }).join('') + '</div><a class="btn" href="/games/' + encodeURIComponent(game.slug) + '/">Explore title ' + icon('arrow-right') + '</a></div></article>';
}

mountPage({
  page: 'games',
  title: 'Grand Theft Auto games',
  description: 'A curated timeline from the original top-down releases through Grand Theft Auto VI.',
  backend: false,
  run: async function ({ root, configured }) {
    let games = catalog;
    if (configured) {
      const result = await loadGames();
      if (result.error) {
        root.insertAdjacentHTML('beforeend', '<div class="state error"><h3>GTA catalog could not load</h3><p>' +
          escapeHTML(result.error.message) + '</p><button class="btn" onclick="location.reload()">Retry</button></div>');
      } else {
        games = (result.data || []).map(normalizeGame).filter(Boolean);
        if (games.length < catalog.length) {
          root.insertAdjacentHTML('beforeend', '<div class="status-banner"><span aria-hidden="true">⌁</span><span><strong>Catalog seed needed.</strong> The connected database currently has ' +
            games.length + ' of ' + catalog.length + ' curated GTA entries. Apply the GameVault migration and catalog seed to complete the directory.</span></div>');
        } else {
          root.insertAdjacentHTML('beforeend', '<div class="status-banner"><span aria-hidden="true">✓</span><span><strong>Connected to Supabase.</strong> GTA game records are loaded from the catalog.</span></div>');
        }
      }
    } else {
      root.insertAdjacentHTML('beforeend', '<div class="status-banner"><span aria-hidden="true">⌁</span><span><strong>Backend not configured.</strong> Showing the bundled GTA catalog only; accounts, libraries, communities, and activity are not live.</span></div>');
    }

    const genres = Array.from(new Set(games.map(function (game) { return game.genre; }).filter(Boolean))).sort();
    const platforms = Array.from(new Set(games.flatMap(function (game) { return game.platforms || []; }))).sort();
    root.insertAdjacentHTML('beforeend',
      '<section class="gv-games-intro"><div><p class="eyebrow">ONE SERIES · EVERY ERA</p><h2>Choose your world</h2><p>Find a title, revisit a city, or jump to the next chapter.</p></div><a class="btn btn-primary" href="/games/library/">My GTA library ' + icon('arrow-right') + '</a></section>' +
      '<div class="toolbar gv-catalog-filters"><label class="field-wrap">Search<input class="field" id="game-search" placeholder="Title, city, or year"></label>' +
      '<label class="field-wrap">Type<select class="select" id="game-genre"><option value="">All entries</option>' + genres.map(function (genre) { return '<option>' + escapeHTML(genre) + '</option>'; }).join('') + '</select></label>' +
      '<label class="field-wrap">Platform<select class="select" id="game-platform"><option value="">All platforms</option>' + platforms.map(function (platform) { return '<option>' + escapeHTML(platform) + '</option>'; }).join('') + '</select></label>' +
      '</div><p class="muted tiny">' + games.length + ' curated catalog entries · Every title now has a real game screenshot or cover for this local prototype. Image sources and rights status are recorded in the asset manifest; original GameVault art remains as a fallback.</p>' +
      '<div class="gv-catalog-grid" id="game-grid">' + games.map(gameCard).join('') + '</div>' +
      '<div class="state" id="game-no-results" hidden><h3>No matching titles</h3><p>Try another game, era, or platform.</p></div>'
    );
    const search = root.querySelector('#game-search');
    const genre = root.querySelector('#game-genre');
    const platform = root.querySelector('#game-platform');
    const grid = root.querySelector('#game-grid');
    const empty = root.querySelector('#game-no-results');
    function filter() {
      const term = search.value.trim().toLowerCase();
      const filtered = games.filter(function (game) {
        const text = [game.title, game.setting, game.year, game.genre].join(' ').toLowerCase();
        return (!term || text.includes(term)) && (!genre.value || game.genre === genre.value) &&
          (!platform.value || (game.platforms || []).includes(platform.value));
      });
      grid.innerHTML = filtered.map(gameCard).join('');
      empty.hidden = filtered.length > 0;
    }
    search.addEventListener('input', filter);
    genre.addEventListener('change', filter);
    platform.addEventListener('change', filter);
  }
});
