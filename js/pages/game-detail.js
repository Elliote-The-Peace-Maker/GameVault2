import catalog from '../../data/game-catalog.json';
import gameImageAssets from '../../data/game-image-assets.json';
import { mountPage } from './runtime.js';
import { escapeHTML, supabase, getOptionalUser } from '../services/supabase.js';
import { setGameSelection } from '../services/data.js';
import { icon } from '../components/icons.js';
import { mountGameTracker } from './game-tracker.js';

const slug = document.body.dataset.slug || location.pathname.split('/').filter(Boolean).at(-1);
const localGame = catalog.find(function (game) { return game.slug === slug; });

function showNotFound(root) {
  root.innerHTML = '<div class="state info"><h3>This title is outside the GTA catalog</h3><p>GameVault is now focused on Grand Theft Auto. Browse the curated series directory to find a title.</p><a class="btn btn-primary" href="/games/index.html">Browse GTA games</a></div>';
}

mountPage({
  page: 'games',
  title: 'GTA title page',
  description: 'Game details, connected communities, posts, and your personal library controls.',
  backend: false,
  run: async function ({ root, configured }) {
    if (!localGame) {
      showNotFound(root);
      return;
    }

    let game = localGame;
    let sourceLabel = 'Curated GameVault catalog';
    if (configured) {
      const response = await supabase.from('games')
        .select('id,slug,title,genre,description,is_upcoming,catalog_note,supported_platforms,game_platforms(platforms(name,slug))')
        .eq('slug', slug).maybeSingle();
      if (response.error) throw response.error;
      if (response.data) {
        game = Object.assign({}, localGame, response.data, {
          platforms: response.data.game_platforms?.map(function (item) { return item.platforms?.name; }).filter(Boolean) || localGame.platforms
        });
        sourceLabel = 'Supabase catalog';
      } else {
        root.insertAdjacentHTML('beforeend', '<div class="status-banner"><span aria-hidden="true">⌁</span><span><strong>Catalog seed needed.</strong> This curated GTA title is not in the connected database yet, so account library actions are unavailable.</span></div>');
      }
    } else {
      root.insertAdjacentHTML('beforeend', '<div class="status-banner"><span aria-hidden="true">⌁</span><span><strong>Backend not configured.</strong> Showing catalog reference information only. Library and community activity are not live.</span></div>');
    }

    const upcomingLabel = game.is_upcoming ? '<span class="gv-game-status upcoming">UPCOMING</span>' : '<span class="gv-game-status">' + escapeHTML(String(game.year)) + '</span>';
    const gameStyle = game.slug.includes('vice-city') || game.slug.endsWith('-vi') ? 'vice' :
      game.slug.includes('san-andreas') || game.slug.endsWith('-v') ? 'coast' :
      game.slug.includes('london') ? 'london' : 'liberty';
    const imageAsset = gameImageAssets.find(function (asset) { return asset.slug === game.slug; });
    const imageSources = imageAsset?.source_page ? [{ label: 'Image archive', href: imageAsset.source_page }] :
      (imageAsset?.composite_of || []).map(function (sourceSlug) {
        const source = gameImageAssets.find(function (asset) { return asset.slug === sourceSlug; });
        const sourceGame = catalog.find(function (item) { return item.slug === sourceSlug; });
        return source?.source_page ? { label: sourceGame?.title || 'Source game', href: source.source_page } : null;
      }).filter(Boolean);
    const imageCredit = imageSources.length
      ? '<small class="gv-image-credit">Image reference: ' + imageSources.map(function (source) {
        return '<a href="' + escapeHTML(source.href) + '" target="_blank" rel="noopener noreferrer">' + escapeHTML(source.label) + '</a>';
      }).join(' · ') + ' · local prototype; permission pending</small>'
      : '<small class="gv-image-credit">Original GameVault image</small>';
    const art = game.game_image_path || game.cover_path || game.artwork_path;
    const cover = art ? '<img class="gv-game-hero-cover" src="' + escapeHTML(art) + '" alt="" decoding="async">' : '';
    root.insertAdjacentHTML('beforeend',
      '<section class="gv-game-hero gv-game-hero-' + gameStyle + '"><div class="gv-game-hero-art" aria-hidden="true">' + cover + '<span class="gv-art-sun"></span><span class="gv-art-grid"></span></div>' +
      '<div class="gv-game-hero-copy"><p class="eyebrow">' + escapeHTML(game.setting || 'Grand Theft Auto') + ' · ' + upcomingLabel + '</p>' +
      '<h2>' + escapeHTML(game.title) + '</h2><p>' + escapeHTML(game.description) + '</p>' + imageCredit +
      '<div class="row"><a class="btn btn-primary" href="/games/library/">Open my GTA library ' + icon('arrow-right') + '</a>' +
      '<a class="btn" href="/pages/maps.html">Explore this world ' + icon('maps') + '</a></div><small>Catalog reference · ' + escapeHTML(sourceLabel) + '</small></div></section>' +
      '<div id="gv-game-tracker"></div>' +
      '<div class="split gv-game-detail-layout"><section class="surface surface-pad"><h2 class="section-title">Platforms & editions</h2>' +
      '<p class="muted tiny">' + escapeHTML(game.catalog_note || 'Platform availability varies by edition. Check the publisher for current details.') + '</p>' +
      '<div class="row">' + (game.platforms || []).map(function (platform) { return '<span class="pill">' + escapeHTML(platform) + '</span>'; }).join('') + '</div>' +
      '<div class="divider"></div><h2 class="section-title">Related GTA communities</h2><div id="related-community"><div class="state loading">Checking for public communities…</div></div>' +
      '<h2 class="section-title" style="margin-top:18px">Community posts</h2><div id="related-posts"><div class="state loading">Checking for real posts…</div></div>' +
      '<p class="gv-theme-note" style="margin-top:15px">GameVault is a fan community. Screenshots and cover art shown here are local prototype references with permission pending; there is no Rockstar account, gameplay, or store integration.</p></section>' +
      '<aside class="surface surface-pad"><h2 class="section-title">Add to your library</h2><p class="muted tiny">Save this title to your signed-in GameVault account and track it in your GTA collection.</p>' +
      '<button class="btn btn-primary" id="library-add" ' + (!configured || !game.id ? 'disabled' : '') + '>Add to GTA library</button>' +
      '<div class="divider"></div><a class="btn" href="/games/index.html">All GTA titles</a></aside></div>'
    );

    await mountGameTracker(root.querySelector('#gv-game-tracker'), { game, configured });

    if (configured && game.id) {
      const communities = await supabase.from('communities')
        .select('id,slug,name,description,member_count').eq('game_id', game.id).eq('visibility', 'public')
        .order('member_count', { ascending: false }).limit(8);
      const communityBox = root.querySelector('#related-community');
      const postBox = root.querySelector('#related-posts');
      if (communities.error) communityBox.innerHTML = '<div class="state error"><h3>Communities could not load</h3><p>' + escapeHTML(communities.error.message) + '</p></div>';
      else if (!communities.data?.length) communityBox.innerHTML = '<div class="state">No public GameVault community is linked to this title yet.</div>';
      else {
        communityBox.innerHTML = '<div class="data-list">' + communities.data.map(function (community) {
          return '<a class="data-row" href="/pages/community.html?slug=' + encodeURIComponent(community.slug) + '"><span class="pill">' + icon('communities') + '</span><span class="grow"><h3>' +
            escapeHTML(community.name) + '</h3><p>' + escapeHTML(community.description || 'GTA community') + ' · ' + (Number(community.member_count) || 0) + ' members</p></span>' + icon('arrow-right') + '</a>';
        }).join('') + '</div>';
        const posts = await supabase.from('posts').select('id,body,created_at,community_id')
          .in('community_id', communities.data.map(function (community) { return community.id; }))
          .order('created_at', { ascending: false }).limit(10);
        if (posts.error) postBox.innerHTML = '<div class="state error"><h3>Posts could not load</h3><p>' + escapeHTML(posts.error.message) + '</p></div>';
        else if (!posts.data?.length) postBox.innerHTML = '<div class="state">No GameVault posts have been published for these communities.</div>';
        else postBox.innerHTML = '<div class="data-list">' + posts.data.map(function (post) {
          const community = communities.data.find(function (item) { return item.id === post.community_id; });
          return '<article class="data-row"><span class="grow"><p>' + escapeHTML(post.body) + '</p><p>' +
            escapeHTML(community?.name || 'GTA community') + ' · ' + new Date(post.created_at).toLocaleDateString() +
            '</p></span><a class="btn" href="/pages/community.html?slug=' + encodeURIComponent(community?.slug || '') + '">Open</a></article>';
        }).join('') + '</div>';
      }
    } else {
      root.querySelector('#related-community').innerHTML = '<div class="state info"><h3>Community activity needs the connected catalog</h3><p>Apply the GameVault migration and seed to load real GTA communities and posts.</p></div>';
      root.querySelector('#related-posts').innerHTML = '<div class="state">No live posts are shown in catalog preview.</div>';
    }

    root.querySelector('#library-add')?.addEventListener('click', async function (event) {
      const button = event.currentTarget;
      if (!configured || !game.id) return;
      button.disabled = true;
      button.textContent = 'Checking account…';
      try {
        const auth = await getOptionalUser();
        if (auth.error) throw auth.error;
        if (!auth.data.user) {
          location.href = '/pages/login.html?next=' + encodeURIComponent(location.pathname);
          return;
        }
        const result = await setGameSelection(auth.data.user.id, game.id, { is_favorite: false, is_currently_playing: false });
        if (result.error) throw result.error;
        button.textContent = 'Added to GTA library ✓';
      } catch (error) {
        button.disabled = false;
        button.textContent = 'Could not add — retry';
        button.title = error.message || 'Please try again.';
      }
    });
  }
});
