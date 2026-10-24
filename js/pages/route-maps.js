import worlds from '../../data/gta-worlds.json';
import catalog from '../../data/game-catalog.json';
import { mountPage } from './runtime.js';
import { escapeHTML, supabase, SUPABASE_CONFIGURED, getOptionalUser } from '../services/supabase.js';

const mapDrawings = {
  'liberty-city': {
    land: 'M26 0H268L304 44L277 90L311 132L265 180L290 300H0V72ZM352 0H600V300H315L338 235L307 197L350 150L323 92Z',
    roads: ['M40 34H249L273 61L250 88L280 122L244 165L265 263', 'M80 8L84 80L118 111L111 184L137 226L133 294', 'M214 5L202 55L224 92L198 130L212 180L185 220L197 294', 'M382 32L418 76L396 118L440 158L415 201L455 259', 'M526 8L500 64L520 111L485 155L506 208L482 288'],
    labels: [['44','56','PORT'],['406','95','MIDTOWN'],['458','236','ISLAND']]
  },
  'vice-city': {
    land: 'M0 0H246L260 36L228 70L247 106L220 145L236 180L202 220L222 300H0ZM365 0H600V300H400L378 263L407 222L380 185L408 146L377 108L398 68Z',
    roads: ['M27 30H216L235 50L205 78L225 111L197 145L217 178L183 215L202 270', 'M98 0L103 56L78 90L112 122L83 159L112 199L92 240L103 300', 'M173 3L164 49L190 82L162 116L187 153L158 193L176 236L166 296', 'M413 23L440 62L414 98L444 134L416 168L447 204L421 244L444 292', 'M530 0L520 60L546 96L516 139L546 177L518 222L540 270'],
    labels: [['43','79','OCEAN BEACH'],['455','76','VICE CITY'],['292','150','CAUSEWAY']]
  },
  'san-andreas': {
    land: 'M124 0H465L520 41L493 88L552 125L531 183L580 218L552 300H58L28 265L69 220L44 176L81 134L59 86L99 49Z',
    roads: ['M100 49L174 74L241 67L293 92L366 84L430 111L509 104', 'M68 148L142 139L211 158L279 145L350 174L424 162L539 190', 'M112 256L160 209L213 184L250 126L309 101L344 51L389 28', 'M220 282L252 230L294 197L321 154L365 122L398 86L466 53', 'M80 94L152 108L200 95L254 111L314 108L367 135L452 130'],
    labels: [['177','121','LOS SANTOS'],['374','214','DESERT'],['394','58','NORTH']]
  },
  'london': {
    land: 'M0 38L142 0L228 20L293 0L406 27L600 0V300H416L361 278L270 300L192 273L101 300L0 266Z',
    roads: ['M15 84L102 44L185 63L244 39L309 66L377 50L460 74L572 41', 'M24 142L103 111L179 128L243 98L323 126L390 111L465 136L577 103', 'M13 213L100 175L184 196L248 164L328 191L399 177L475 204L590 168', 'M136 8L150 70L127 119L166 168L145 223L187 283', 'M343 12L332 72L363 117L334 164L371 211L350 291'],
    labels: [['64','100','WEST END'],['391','90','CITY'],['445','226','RIVER']]
  },
  'anywhere-city': {
    land: 'M0 0H600V300H0Z',
    roads: ['M0 52H600','M0 111H600','M0 172H600','M0 235H600','M63 0V300','M133 0V300','M207 0V300','M282 0V300','M356 0V300','M431 0V300','M505 0V300','M574 0V300', 'M0 284L600 15'],
    labels: [['73','40','DOWNTOWN'],['343','154','INDUSTRIAL'],['436','260','DISTRICT 3']]
  },
  'leonida': {
    land: 'M0 0H600V100L558 122L540 156L511 173L496 211L463 221L449 261L412 275L400 300H0Z M0 184L65 169L98 180L110 212L87 235L35 249L0 240Z M516 26L541 17L558 31L548 57L525 61L510 45Z',
    roads: ['M18 44L122 62L199 53L281 77L361 68L434 94L541 92', 'M8 121L97 111L172 133L254 121L330 147L405 136L507 163', 'M34 276L120 236L196 226L260 196L331 187L401 157L482 140', 'M144 9L161 76L145 133L180 183L160 241', 'M354 4L341 61L373 110L351 159L384 209L369 289'],
    labels: [['260','103','VICE CITY'],['447','190','COAST'],['81','217','KEYS']]
  }
};

function mapArt(world, options = {}) {
  const drawing = mapDrawings[world.slug] || mapDrawings['vice-city'];
  const roads = drawing.roads.map(function (path) { return '<path d="' + path + '" />'; }).join('');
  const routePaths = drawing.roads.slice(0, 2).map(function (path) { return '<path d="' + path + '" />'; }).join('');
  const labels = drawing.labels.map(function (item) { return '<text x="' + item[0] + '" y="' + item[1] + '">' + item[2] + '</text>'; }).join('');
  const marker = options.marker === false ? '' : '<circle class="gv-map-marker" cx="300" cy="150" r="5"/><circle class="gv-map-marker-ring" cx="300" cy="150" r="12"/>';
  const badge = options.badge === false ? '' : '<span class="gv-map-badge">SCHEMATIC · FAN GUIDE</span>';
  return '<div class="gv-map-art"><svg viewBox="0 0 600 300" preserveAspectRatio="xMidYMid slice" role="img" aria-label="Original GameVault schematic map for ' + escapeHTML(world.name) + '">' +
    '<rect class="gv-map-water" width="600" height="300"/><path class="gv-map-land" fill-rule="evenodd" d="' + drawing.land + '"/>' +
    '<g class="gv-map-streets">' + roads + '</g><g class="gv-map-routes">' + routePaths + '</g><g class="gv-map-labels">' + labels + '</g>' + marker + '</svg>' + badge + '</div>';
}

const liveMapSpecs = [
  { key: 'gta-online-los-santos', slug: 'san-andreas', eyebrow: 'GTA ONLINE · COMMUNITY MAP', name: 'Los Santos & San Andreas', summary: 'A community layer for landmarks, activities, businesses, collectibles, and shared crew routes.', note: 'Community-submitted pins; not live player tracking or Rockstar telemetry.' },
  { key: 'gta-vi-leonida', slug: 'leonida', eyebrow: 'GTA VI · LEONIDA PREVIEW', name: 'Leonida Field Map', summary: 'A preview layer for community discoveries and source notes as reliable map information becomes available.', note: 'No live GTA VI location feed is connected, and this preview contains no invented discoveries.' }
];

function liveMapCard(spec) {
  const world = { slug: spec.slug, name: spec.name };
  return '<article class="gv-live-map-card" data-live-map="' + spec.key + '"><header class="gv-live-map-heading"><div><p class="eyebrow">' + spec.eyebrow + '</p><h3>' + spec.name + '</h3><p>' + spec.summary + '</p></div><span class="gv-live-map-state" data-feed-state>Checking feed…</span></header>' +
    '<div class="gv-live-map-stage" data-map-stage>' + mapArt(world, { marker: false, badge: false }) + '<div class="gv-live-marker-layer" data-marker-layer></div></div>' +
    '<div class="gv-live-map-info"><span data-feed-status role="status">Checking map connection…</span><span data-pin-count>0 public pins</span></div>' +
    '<div class="gv-live-map-filters" aria-label="Filter map pins">' + ['all','activity','collectible','business','landmark','route'].map(function (category) { return '<button class="gv-map-filter' + (category === 'all' ? ' is-active' : '') + '" type="button" data-map-filter="' + category + '">' + (category === 'all' ? 'All' : category) + '</button>'; }).join('') + '</div>' +
    '<div class="gv-live-map-content"><div class="gv-live-pin-list" data-marker-list></div><div class="gv-live-pin-detail" data-pin-detail role="status">Choose a public pin to read its details. Map positions are illustrative and community supplied.</div></div>' +
    '<form class="gv-map-pin-form" data-map-form><div class="gv-map-form-heading"><div><p class="eyebrow">CONTRIBUTE TO THE ATLAS</p><h4>Add a community pin</h4></div><a href="/pages/subscriptions.html#addons">Crew map add-ons ↗</a></div>' +
    '<p class="tiny muted">Click the schematic to choose an approximate point. Pins stay private until a moderator approves them.</p><div class="gv-map-pin-fields"><label class="field-wrap">Pin title<input class="field" name="title" maxlength="100" required placeholder="Name this place or activity"></label>' +
    '<label class="field-wrap">Type<select class="select" name="category"><option value="activity">Activity</option><option value="collectible">Collectible</option><option value="business">Business</option><option value="landmark">Landmark</option><option value="route">Crew route</option><option value="other">Other</option></select></label>' +
    '<label class="field-wrap gv-map-wide">Description<textarea class="textarea" name="description" maxlength="1200" placeholder="What should another player know?"></textarea></label>' +
    '<label class="field-wrap">Map X<input class="field" type="number" name="x" min="0" max="100" step="0.1" required></label><label class="field-wrap">Map Y<input class="field" type="number" name="y" min="0" max="100" step="0.1" required></label>' +
    '<label class="field-wrap gv-map-wide">Source or verification note<input class="field" name="source_note" maxlength="300" placeholder="How did you verify this pin?"></label></div><div class="gv-map-form-actions"><button class="btn btn-primary" type="submit" disabled>Submit pin for review</button><a class="btn gv-map-signin" href="/pages/login.html?next=%2Fpages%2Fmaps.html%23live-maps" hidden>Sign in to contribute</a><span class="gv-map-submit-status" data-submit-status role="status"></span></div></form>' +
    '<p class="gv-live-map-note">' + spec.note + ' Schematic artwork is original GameVault illustration, not an official in-game map or to-scale navigation.</p></article>';
}

function liveMapsPanel() {
  return '<section class="gv-live-maps" id="live-maps"><div class="home-section-heading"><div><p class="eyebrow">COMMUNITY MAP ROOM</p><h2>Live map layers</h2><p>Shared GameVault pins refresh through Supabase Realtime after the backend is configured. Updates are community reports, not in-game telemetry.</p></div><a href="/pages/subscriptions.html#addons">Explore map add-ons ↗</a></div><div class="gv-live-map-grid">' + liveMapSpecs.map(liveMapCard).join('') + '</div></section>';
}

function renderMapPin(card, marker) {
  const layer = card.querySelector('[data-marker-layer]');
  const stage = card.querySelector('[data-map-stage]');
  const x = Math.max(0, Math.min(100, Number(marker.x) || 0));
  const y = Math.max(0, Math.min(100, Number(marker.y) || 0));
  const pin = document.createElement('button');
  pin.type = 'button';
  pin.className = 'gv-live-pin';
  pin.dataset.category = marker.category;
  pin.style.left = x + '%';
  pin.style.top = y + '%';
  pin.setAttribute('aria-label', 'Map pin: ' + marker.title);
  pin.title = marker.title;
  pin.addEventListener('click', function (event) {
    event.stopPropagation();
    card.querySelector('[data-pin-detail]').innerHTML = '<strong>' + escapeHTML(marker.title) + '</strong><span>' + escapeHTML(marker.category) + '</span><p>' + escapeHTML(marker.description || 'No description was added.') + '</p>' + (marker.source_note ? '<small>Source note: ' + escapeHTML(marker.source_note) + '</small>' : '');
  });
  layer.append(pin);
  const row = document.createElement('button');
  row.type = 'button';
  row.className = 'gv-live-pin-row';
  row.dataset.category = marker.category;
  row.innerHTML = '<span class="gv-pin-dot" aria-hidden="true"></span><span><strong>' + escapeHTML(marker.title) + '</strong><small>' + escapeHTML(marker.category) + '</small></span>';
  row.addEventListener('click', function () {
    card.querySelector('[data-pin-detail]').innerHTML = '<strong>' + escapeHTML(marker.title) + '</strong><span>' + escapeHTML(marker.category) + '</span><p>' + escapeHTML(marker.description || 'No description was added.') + '</p>' + (marker.source_note ? '<small>Source note: ' + escapeHTML(marker.source_note) + '</small>' : '');
    stage.scrollIntoView({ behavior: 'smooth', block: 'center' });
  });
  card.querySelector('[data-marker-list]').append(row);
}

async function loadMapMarkers(card, spec, user) {
  const feedState = card.querySelector('[data-feed-state]');
  const feedStatus = card.querySelector('[data-feed-status]');
  const list = card.querySelector('[data-marker-list]');
  card.querySelector('[data-marker-layer]').replaceChildren();
  list.replaceChildren();
  const result = await supabase.from('map_markers').select('id,map_key,title,description,category,x,y,source_note,status,submitted_by,created_at').eq('map_key', spec.key).order('created_at', { ascending: false }).limit(300);
  if (result.error) {
    feedState.textContent = 'FEED UNAVAILABLE';
    feedStatus.textContent = 'Apply ' + '202610230002_memberships_and_live_maps.sql' + ' and confirm map marker read policies. No pins are shown.';
    feedStatus.classList.add('is-error');
    return;
  }
  const markers = result.data || [];
  const publicPins = markers.filter(function (marker) { return marker.status === 'approved'; });
  const ownPending = user ? markers.filter(function (marker) { return marker.status === 'pending' && marker.submitted_by === user.id; }) : [];
  publicPins.forEach(function (marker) { renderMapPin(card, marker); });
  const count = card.querySelector('[data-pin-count]');
  count.textContent = publicPins.length + (publicPins.length === 1 ? ' public pin' : ' public pins');
  feedState.textContent = 'COMMUNITY FEED';
  feedStatus.textContent = publicPins.length ? 'Showing ' + publicPins.length + ' moderator-approved community update' + (publicPins.length === 1 ? '.' : 's.') : 'Connected, but there are no approved pins on this map yet.';
  feedStatus.classList.remove('is-error');
  if (!publicPins.length) {
    const empty = document.createElement('p');
    empty.className = 'gv-map-empty';
    empty.textContent = 'No public pins yet. Contributions appear after moderator review.';
    list.append(empty);
  }
  ownPending.forEach(function (marker) {
    const pending = document.createElement('p');
    pending.className = 'gv-map-pending';
    pending.textContent = 'Your pin “' + marker.title + '” is awaiting moderation.';
    list.append(pending);
  });
  card.querySelectorAll('[data-map-filter]').forEach(function (button) {
    button.onclick = function () {
      card.querySelectorAll('[data-map-filter]').forEach(function (filter) { filter.classList.toggle('is-active', filter === button); });
      const filterValue = button.dataset.mapFilter;
      card.querySelectorAll('.gv-live-pin-row').forEach(function (row) { row.hidden = filterValue !== 'all' && row.dataset.category !== filterValue; });
      card.querySelectorAll('.gv-live-pin').forEach(function (pin) {
        pin.hidden = filterValue !== 'all' && pin.dataset.category !== filterValue;
      });
    };
  });
}

function initLiveMaps(root) {
  let user = null;
  if (SUPABASE_CONFIGURED && supabase) {
    getOptionalUser().then(function (response) {
      if (response.error) throw response.error;
      user = response.data.user;
      root.querySelectorAll('[data-live-map]').forEach(function (card) {
        const form = card.querySelector('[data-map-form]');
        const submit = form.querySelector('[type="submit"]');
        const signIn = form.querySelector('.gv-map-signin');
        form.querySelectorAll('input,textarea,select').forEach(function (field) { field.disabled = !user; });
        submit.disabled = !user;
        signIn.hidden = !!user;
        card.querySelector('[data-submit-status]').textContent = user ? 'Each pin is reviewed before publication.' : 'Sign in to suggest a map update.';
      });
      return Promise.all(liveMapSpecs.map(function (spec) {
        const card = root.querySelector('[data-live-map="' + spec.key + '"]');
        return loadMapMarkers(card, spec, user).then(function () {
          const channel = supabase.channel('gv-map-' + spec.key).on('postgres_changes', { event: '*', schema: 'public', table: 'map_markers', filter: 'map_key=eq.' + spec.key }, function () { loadMapMarkers(card, spec, user); }).subscribe(function (status) {
            card.querySelector('[data-feed-state]').textContent = status === 'SUBSCRIBED' ? 'LIVE · REALTIME' : status === 'CHANNEL_ERROR' ? 'REALTIME UNAVAILABLE' : 'COMMUNITY FEED';
          });
          card.dataset.realtimeChannel = channel.topic;
        });
      }));
    }).catch(function (error) {
      root.querySelectorAll('[data-feed-status]').forEach(function (target) { target.textContent = 'Could not load community map data. ' + (error.message || 'Try again later.'); });
      root.querySelectorAll('[data-feed-state]').forEach(function (target) { target.textContent = 'FEED ERROR'; });
    });
  } else {
    root.querySelectorAll('[data-live-map]').forEach(function (card) {
      card.querySelector('[data-feed-state]').textContent = 'BACKEND NOT CONFIGURED';
      card.querySelector('[data-feed-status]').textContent = 'Community pins are unavailable until Supabase and the map migration are connected. No sample pins are shown.';
      card.querySelector('[data-pin-count]').textContent = '0 live pins';
      card.querySelector('[data-submit-status]').textContent = 'Connect Supabase, then sign in to suggest a pin.';
      card.querySelectorAll('input,textarea,select,button[type="submit"]').forEach(function (field) { field.disabled = true; });
      card.querySelector('.gv-map-signin').hidden = false;
    });
  }

  root.querySelectorAll('[data-live-map]').forEach(function (card) {
    const stage = card.querySelector('[data-map-stage]');
    const form = card.querySelector('[data-map-form]');
    stage.addEventListener('click', function (event) {
      if (event.target.closest('.gv-live-pin')) return;
      const bounds = stage.getBoundingClientRect();
      const x = Math.round(((event.clientX - bounds.left) / bounds.width) * 1000) / 10;
      const y = Math.round(((event.clientY - bounds.top) / bounds.height) * 1000) / 10;
      form.elements.namedItem('x').value = Math.max(0, Math.min(100, x));
      form.elements.namedItem('y').value = Math.max(0, Math.min(100, y));
      card.querySelector('[data-submit-status]').textContent = 'Approximate map point selected: ' + x + ', ' + y + '.';
    });
    form.addEventListener('submit', async function (event) {
      event.preventDefault();
      if (!SUPABASE_CONFIGURED || !supabase || !user) {
        card.querySelector('[data-submit-status]').textContent = 'Connect Supabase and sign in before submitting a community pin.';
        return;
      }
      const data = new FormData(form);
      const button = form.querySelector('[type="submit"]');
      button.disabled = true;
      card.querySelector('[data-submit-status]').textContent = 'Sending pin to the moderation queue…';
      const result = await supabase.from('map_markers').insert({
        map_key: card.dataset.liveMap,
        title: String(data.get('title') || '').trim(),
        description: String(data.get('description') || '').trim(),
        category: String(data.get('category') || 'other'),
        x: Number(data.get('x')),
        y: Number(data.get('y')),
        source_note: String(data.get('source_note') || '').trim(),
        status: 'pending',
        submitted_by: user.id
      });
      if (result.error) {
        card.querySelector('[data-submit-status]').textContent = 'Pin was not saved: ' + result.error.message;
      } else {
        form.reset();
        card.querySelector('[data-submit-status]').textContent = 'Pin submitted. It will be visible only after a moderator approves it.';
        const spec = liveMapSpecs.find(function (item) { return item.key === card.dataset.liveMap; });
        loadMapMarkers(card, spec, user);
      }
      button.disabled = false;
    });
  });
  window.addEventListener('pagehide', function () {
    if (supabase) supabase.getChannels().forEach(function (channel) { if (channel.topic.startsWith('realtime:gv-map-')) supabase.removeChannel(channel); });
  }, { once: true });
}
function gameLinks(world) {
  return world.games.map(function (slug) {
    const game = catalog.find(function (item) { return item.slug === slug; });
    if (!game) return '';
    return '<a href="/games/' + encodeURIComponent(game.slug) + '/">' + escapeHTML(game.title) + ' ↗</a>';
  }).filter(Boolean).join('');
}

function mapCard(world) {
  return '<article class="surface gv-map-card" data-world="' + escapeHTML(world.name.toLowerCase()) + ' ' + escapeHTML(world.era.toLowerCase()) + '">' +
    mapArt(world) + '<div class="gv-map-meta"><p class="eyebrow">' + escapeHTML(world.era) + '</p><h2>' + escapeHTML(world.name) + '</h2>' +
    '<p>' + escapeHTML(world.description) + '</p><p class="tiny muted">' + escapeHTML(world.map_note) + '</p>' +
    '<div class="gv-map-games">' + gameLinks(world) + '</div></div></article>';
}

mountPage({
  page: 'maps',
  title: 'GTA Worlds & Maps',
  description: 'Explore the cities, states, and eras that connect Grand Theft Auto games.',
  backend: false,
  run: async function ({ root, configured }) {
    root.insertAdjacentHTML('beforeend',
      '<div class="status-banner"><span aria-hidden="true">⌖</span><span><strong>GameVault world atlas.</strong> These original schematic guides connect GTA places and eras; they do not reproduce official in-game maps.</span></div>' +
      '<div class="toolbar"><label class="field-wrap" style="flex:1;min-width:220px">Find a world or era<input class="field" id="world-search" placeholder="Vice City, Liberty City, 1992…"></label>' +
      '<a class="btn btn-primary" href="/games/index.html">Browse GTA games</a></div>' +
      '<p class="muted tiny">' + worlds.length + ' world guides · Select a connected game to open its GameVault page.</p>' +
      '<div class="gv-map-grid" id="world-grid">' + worlds.map(mapCard).join('') + '</div>' +
      '<div class="state" id="world-empty" hidden><h3>No matching world</h3><p>Try another GTA city or era.</p></div>' +
      '<p class="gv-theme-note">GameVault is an independent fan community and is not affiliated with Rockstar Games. Game details and release information may change; consult official sources for current announcements.</p>'
    );
    root.insertAdjacentHTML('afterbegin', liveMapsPanel());
    initLiveMaps(root);
    const search = root.querySelector('#world-search');
    const cards = Array.from(root.querySelectorAll('.gv-map-card'));
    const empty = root.querySelector('#world-empty');
    search.addEventListener('input', function () {
      const term = search.value.trim().toLowerCase();
      let visible = 0;
      cards.forEach(function (card) {
        const show = !term || card.dataset.world.includes(term) || card.textContent.toLowerCase().includes(term);
        card.hidden = !show;
        if (show) visible += 1;
      });
      empty.hidden = visible > 0;
    });
    if (!configured) root.dataset.catalogMode = 'local-seed-preview';
  }
});
