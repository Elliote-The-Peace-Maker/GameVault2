const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => Array.from(root.querySelectorAll(selector));
const toast = $("#toast");
const modal = $("#modal");
const modalBody = $("#modal-body");
let toastTimer;
let lastFocus = null;
const safeStore = {
  get(key, fallback) {
    try { const value = localStorage.getItem("vexra-" + key); return value === null ? fallback : JSON.parse(value); }
    catch { return fallback; }
  },
  set(key, value) {
    try { localStorage.setItem("vexra-" + key, JSON.stringify(value)); } catch {}
  }
};
const games = [
  { id:"cyberpunk", title:"Cyberpunk 2077", cover:"NIGHT CITY", year:2020, genre:"rpg", genreLabel:"Action RPG", played:"Today", players:"18.4K", accent:"Neon future. Your story.", description:"Build your legend in Night City. Explore a neon-soaked open world, make impossible choices, and find a crew for the long way around.", store:"https://store.steampowered.com/app/1091500/Cyberpunk_2077/", art:"cyberpunk" },
  { id:"smite", title:"SMITE", cover:"SMITE", year:2020, genre:"action", genreLabel:"Action · MOBA", played:"2 days ago", players:"3.8K", accent:"Gods, legends, one arena.", description:"Enter a third-person battleground where mythology meets team strategy. Pick a god, find your lane, and fight as a team.", store:"https://store.steampowered.com/app/386360/SMITE/", art:"smite" },
  { id:"ghostrunner", title:"Ghostrunner", cover:"GHOSTRUNNER", year:2021, genre:"action", genreLabel:"Action · Cyberpunk", played:"2 days ago", players:"1.7K", accent:"One hit. One chance.", description:"Rise through a megastructure city in a fast, first-person action platformer built around momentum and precision.", store:"https://store.steampowered.com/app/1139900/Ghostrunner/", art:"ghostrunner" },
  { id:"nfs-heat", title:"Need for Speed Heat", cover:"NFS HEAT", year:2019, genre:"racing", genreLabel:"Racing", played:"3 days ago", players:"2.9K", accent:"Own the night.", description:"Race by day and risk it all after dark. Tune your ride, find a crew, and leave your mark on the streets.", store:"https://store.steampowered.com/app/1222680/Need_for_Speed_Heat/", art:"nfs" },
  { id:"ori", title:"Ori and the Will of the Wisps", cover:"ORI", year:2020, genre:"adventure", genreLabel:"Adventure · Indie", played:"4 days ago", players:"940", accent:"A little light can go far.", description:"Explore a beautifully hand-crafted world, meet its strange inhabitants, and find your way through an emotional adventure.", store:"https://store.steampowered.com/app/1057090/Ori_and_the_Will_of_the_Wisps/", art:"ori" },
  { id:"overwatch", title:"Overwatch 2", cover:"OVERWATCH", year:2022, genre:"action", genreLabel:"Action · Team shooter", played:"5 days ago", players:"11.2K", accent:"A hero for every playstyle.", description:"Team up in a colorful, fast-moving hero shooter. Find your role, learn your maps, and keep the comms kind.", store:"https://store.steampowered.com/app/2357570/Overwatch_2/", art:"overwatch" },
  { id:"valorant", title:"VALORANT", cover:"VALORANT", year:2020, genre:"action", genreLabel:"Action · Tactical FPS", played:"Yesterday", players:"42.1K", accent:"Precise gunplay. Bold abilities.", description:"A tactical 5v5 game where sharp aim and smart teamwork matter. Queue with friends or meet your next teammate here.", store:"https://playvalorant.com/", art:"valorant" },
  { id:"apex", title:"Apex Legends", cover:"APEX", year:2019, genre:"action", genreLabel:"Action · Battle royale", played:"Last week", players:"30.7K", accent:"Become a legend.", description:"Drop into a squad-based battle royale with distinct legends, fast movement, and plenty of room for clutch plays.", store:"https://store.steampowered.com/app/1172470/Apex_Legends/", art:"apex" },
  { id:"eldenring", title:"Elden Ring", cover:"ELDEN RING", year:2022, genre:"adventure", genreLabel:"Adventure · RPG", played:"Last week", players:"25.6K", accent:"A vast world awaits.", description:"Explore a sprawling fantasy world, discover its stories at your own pace, and share hard-earned victories with friends.", store:"https://store.steampowered.com/app/1245620/ELDEN_RING/", art:"elden" }
];
const clips = [
  { id:"clip-one", title:"Cleanest 1v4 clutch on Ascent", game:"Valorant", age:"12 min ago", views:1469, likes:294, duration:"0:38", tagged:true, art:"clip-valorant", caption:"This is a title and it goes here like this, fun", tags:["#Valorant","#boombvoosh","#duelist"] },
  { id:"clip-two", title:"Wall bounce into the cleanest squad wipe", game:"Apex Legends", age:"2 hours ago", views:924, likes:181, duration:"0:52", tagged:false, art:"clip-apex", caption:"Movement practice paid off in one very loud moment.", tags:["#ApexLegends","#movement","#squad"] },
  { id:"clip-three", title:"The last-second overtime hold", game:"Overwatch 2", age:"Yesterday", views:731, likes:106, duration:"0:41", tagged:true, art:"clip-overwatch", caption:"Nobody moved from the objective. Nobody blinked.", tags:["#Overwatch2","#overtime","#teamplay"] }
];
const members = [
  { id:"luna-fps", name:"LunaFPS", avatar:"assets/supplied/authors/1.jpg", game:"VALORANT", platform:"PC", bio:"Looking for kind teammates, smart comms, and one more ranked win." },
  { id:"nova-lynn", name:"NovaLynn", avatar:"assets/supplied/authors/2.jpg", game:"Apex Legends", platform:"PC · Console", bio:"Movement practice, co-op nights, and clips worth rewinding." },
  { id:"rook", name:"Rook", avatar:"assets/supplied/authors/3.jpg", game:"VALORANT", platform:"PC", bio:"Sharing aim tips and learning a new agent every act." },
  { id:"jax-on-pc", name:"JaxOnPC", avatar:"assets/supplied/authors/4.jpg", game:"Co-op games", platform:"PC", bio:"Always up for a first run, a puzzle, or a relaxed squad night." },
  { id:"simmycool", name:"Simmycool", avatar:"assets/supplied/authors/5.jpg", game:"Apex Legends", platform:"PC", bio:"Team-first player who enjoys close matches and good sportsmanship." },
  { id:"mira-plays", name:"Mira Plays", avatar:"assets/supplied/authors/6.jpg", game:"RPGs · Co-op", platform:"PC · Console", bio:"Here for great worlds, memorable soundtracks, and friendly groups." },
  { id:"kairo", name:"Kairo", avatar:"assets/supplied/authors/7.jpg", game:"Overwatch 2", platform:"PC", bio:"Support main, amateur strategist, and enthusiastic replay watcher." },
  { id:"sophie-george", name:"Sophie George", avatar:"assets/supplied/authors/8.jpg", game:"VR · Adventure", platform:"PC · VR", bio:"Exploring immersive games and sharing beginner-friendly tips." }
];
const suppliedImages = window.VEXRA_SUPPLIED_IMAGES || [];
const leaderboard = [
  { name:"Simmycool", rank:"Ascendant 2", points:8566, initials:"SC" },
  { name:"NovaLynn", rank:"Diamond 3", points:8239, initials:"NL" },
  { name:"Empre55ive", rank:"Diamond 3", points:7984, initials:"E5" },
  { name:"Kairo", rank:"Diamond 2", points:7651, initials:"KR" },
  { name:"You", rank:"Diamond 2", points:7410, initials:"VX" }
];
const defaultTopics = [
  { id:"topic-one", title:"Anyone down for a chill ranked queue tonight?", category:"looking", author:"LunaFPS", initials:"LF", game:"Valorant", replies:18, likes:12, age:"8 min ago", body:"Looking for two friendly players for a few ranked games. No pressure on the result, good comms and good vibes." },
  { id:"topic-two", title:"What’s one setting that instantly improved your aim?", category:"help", author:"Rook", initials:"RK", game:"Valorant", replies:36, likes:28, age:"34 min ago", body:"I changed my sensitivity last week and it made a difference. Curious what small settings changes helped other people." },
  { id:"topic-three", title:"The soundtrack in Night City is unreal", category:"chat", author:"Mira", initials:"MR", game:"Cyberpunk 2077", replies:11, likes:8, age:"1 hr ago", body:"Share your favourite track or a playlist that matches the neon-at-2am mood." },
  { id:"topic-four", title:"Need a first-time co-op game for a group of four", category:"looking", author:"JaxOnPC", initials:"JP", game:"Game recommendations", replies:22, likes:15, age:"3 hrs ago", body:"We have very mixed experience levels and want something we can pick up together." }
];
let topics = safeStore.get("topics", defaultTopics);
let favorites = new Set(safeStore.get("favorites", []));
let likedClips = new Set(safeStore.get("liked-clips", []));
let followed = safeStore.get("following-empre55ive", false);
let forumFilter = "all";
let selectedClipTab = "feed";

function setMobileNav(open) {
  const frame = $("#app-frame");
  const toggle = $("#sidebar-toggle");
  frame.classList.toggle("nav-open",open);
  toggle.setAttribute("aria-expanded",String(open));
  toggle.setAttribute("aria-label",open?"Close navigation":"Open navigation");
  toggle.title=open?"Close navigation":"Open navigation";
  toggle.textContent=open?"×":"☰";
}
function updateScrollTop() {
  const scroller=$("#page-scroll");
  const button=$("#scroll-top");
  const shown=scroller.scrollTop>320;
  scroller.classList.toggle("has-scrolled",shown);
  button.setAttribute("aria-hidden",String(!shown));
  button.tabIndex=shown?0:-1;
}

function escapeHTML(value) {
  return String(value).replace(/[&<>"']/g, (char) => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;" }[char]));
}
function showToast(message) {
  toast.textContent = message;
  toast.classList.add("show");
  window.clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => toast.classList.remove("show"), 2300);
}
function openModal(content) {
  lastFocus = document.activeElement;
  modalBody.innerHTML = content;
  modal.hidden = false;
  const firstField = $("input, textarea, button", modalBody);
  if (firstField) firstField.focus();
}
function closeModal() {
  modal.hidden = true;
  modalBody.innerHTML = "";
  if (lastFocus && typeof lastFocus.focus === "function") lastFocus.focus();
}
function gameCard(game, compact = false) {
  const inWishlist = safeStore.get("wishlist", []).includes(game.id);
  return `
    <article class="game-card" data-title="${escapeHTML(game.title.toLowerCase())}" data-genre="${game.genre}">
      <a href="#game/${game.id}" class="game-art art-${game.art}" aria-label="View ${escapeHTML(game.title)} details">
        <small>${game.year}</small><strong>${escapeHTML(game.cover)}</strong>
      </a>
      <div class="game-info">
        <div class="game-meta"><span>${escapeHTML(game.genreLabel)}</span><span>${escapeHTML(game.players)} online</span></div>
        <h3>${escapeHTML(game.title)}</h3><p>${escapeHTML(game.accent)}</p>
        <div class="game-footer"><span>Last played: ${escapeHTML(game.played)}</span><span>
          <button class="game-mini-action ${inWishlist ? "is-saved" : ""}" data-action="wishlist" data-game="${game.id}" aria-label="${inWishlist ? "Remove from" : "Add to"} wishlist">♥</button>
          <a href="#game/${game.id}">Details ↗</a>
        </span></div>
      </div>
    </article>`;
}
function renderGames(containerId, options = {}) {
  const container = document.getElementById(containerId);
  if (!container) return;
  let list = games.slice();
  if (options.search) list = list.filter((game) => game.title.toLowerCase().includes(options.search));
  if (options.genre && options.genre !== "all") list = list.filter((game) => game.genre === options.genre);
  if (options.sort === "title") list.sort((a,b) => a.title.localeCompare(b.title));
  if (options.sort === "newest") list.sort((a,b) => b.year - a.year || a.title.localeCompare(b.title));
  if (options.sort === "recent") list.sort((a,b) => games.indexOf(a) - games.indexOf(b));
  if (options.limit) list = list.slice(0, options.limit);
  container.innerHTML = list.map((game) => gameCard(game, options.compact)).join("");
  const empty = $("#empty-games");
  if (empty && containerId === "library-games-grid") empty.hidden = list.length > 0;
}
function updateProfileName() {
  const name = safeStore.get("display-name", "VEXRA Player");
  $("#sidebar-player-name").textContent = name.toUpperCase();
  $("#right-player-name").textContent = name;
  $("#profile-display-name").textContent = name;
  $("#profile-handle").innerHTML = "@"+escapeHTML(name.toLowerCase().replace(/[^a-z0-9]+/g,".").replace(/^\.|\.$/g,""))+" <b>·</b> Level 32";
}
function dismissSplash() {
  const splash = $("#splash");
  if (!splash || splash.classList.contains("is-hiding")) return;
  splash.classList.add("is-hiding");
  window.setTimeout(() => splash.remove(), 650);
}
window.setTimeout(dismissSplash, 2700);
$("#enter-button").addEventListener("click", dismissSplash);

function renderLeaderboard() {
  const list = $("#leaderboard-list");
  const scope = $("#leaderboard-scope").value;
  const region = $("#leaderboard-region").value;
  const game = $("#leaderboard-game").value;
  let rows = leaderboard.slice();
  if (scope === "global") rows = rows.concat([{name:"Miya.exe",rank:"Radiant",points:9982,initials:"MX"},{name:"s1mpleAim",rank:"Immortal 3",points:9321,initials:"SA"}]);
  if (scope === "local") rows = rows.slice().reverse();
  if (region === "EU") rows = rows.slice().reverse();
  if (region === "APAC") rows = rows.slice(2).concat(rows.slice(0,2));
  if (game === "Apex Legends") rows = rows.map((row,index) => ({...row,rank:["Predator","Master","Diamond","Platinum","Diamond"][index] || row.rank,points:row.points-320}));
  if (game === "Overwatch 2") rows = rows.map((row,index) => ({...row,rank:["Grandmaster","Master","Diamond","Diamond","Platinum"][index] || row.rank,points:row.points-710}));
  const rankFilter = $("#leaderboard-rank").value;
  if (rankFilter !== "All ranks") rows = rows.filter((row) => rankFilter === "Diamond" ? /Diamond|Ascendant/.test(row.rank) : rankFilter === "Immortal" ? /Immortal|Radiant|Master|Predator|Grandmaster/.test(row.rank) : /Ascendant|Immortal|Radiant|Master|Predator|Grandmaster/.test(row.rank));
  const renderRows = (items) => items.map((row,index) => `<li><span class="leaderboard-num">${String(index+1).padStart(2,"0")}</span><span class="leaderboard-player"><i>${escapeHTML(row.initials)}</i><strong>${escapeHTML(row.name)}</strong></span><span class="leaderboard-rank">${escapeHTML(row.rank)}</span><span class="leaderboard-score">${row.points}</span></li>`).join("");
  list.innerHTML = renderRows(rows.slice(0,5)) || '<li class="leaderboard-empty">No players match these filters.</li>';
  const fullList = $("#full-leaderboard-list");
  if (fullList) fullList.innerHTML = renderRows(rows) || '<li class="leaderboard-empty">No players match these filters.</li>';
}
function renderClips() {
  let shown = clips.slice();
  const chosenGame = $("#clip-game").value;
  const sort = $("#clip-sort").value;
  if (chosenGame !== "all") shown = shown.filter((clip) => clip.game === chosenGame);
  if (selectedClipTab === "favorites") shown = shown.filter((clip) => favorites.has(clip.id));
  if (selectedClipTab === "tagged") shown = shown.filter((clip) => clip.tagged);
  if (sort === "popular") shown.sort((a,b) => b.views - a.views);
  $("#favorite-count").textContent = String(favorites.size);
  const list = $("#clip-list");
  if (!shown.length) {
    list.innerHTML = '<div class="search-no-results">No clips here yet. Switch tabs or save a clip with the heart.</div>';
    return;
  }
  list.innerHTML = shown.map((clip) => `
    <article class="clip-card" data-clip="${clip.id}">
      <div class="clip-card-header"><div class="creator-avatar"><span>E5</span><i></i></div><div><strong>Empre55ive</strong><small>${escapeHTML(clip.age)}</small></div><span class="clip-game-name">${escapeHTML(clip.game)}</span></div>
      <div class="clip-stage ${clip.art}"><span>✦</span><button class="play-clip" data-action="open-clip" data-clip="${clip.id}" aria-label="Play clip">▶</button><small class="clip-duration">${clip.duration}</small></div>
      <div class="clip-caption"><h3>${escapeHTML(clip.title)}</h3><p>${escapeHTML(clip.caption)}</p><div class="clip-tags">${clip.tags.map((tag) => "<span>" + escapeHTML(tag) + "</span>").join("")}</div></div>
      <div class="clip-actions"><button data-action="like-clip" data-clip="${clip.id}" class="${likedClips.has(clip.id) ? "is-active" : ""}">♥ ${clip.likes + (likedClips.has(clip.id) ? 1 : 0)}</button><button data-action="comment-clip" data-clip="${clip.id}">▱ Comment</button><button data-action="favorite-clip" data-clip="${clip.id}" class="${favorites.has(clip.id) ? "is-active" : ""}">${favorites.has(clip.id) ? "★ Saved" : "☆ Save"}</button><span class="clip-views">${clip.views.toLocaleString()} views</span></div>
    </article>`).join("");
}
function renderForum() {
  const sort = $("#forum-sort").value;
  let list = topics.slice();
  if (forumFilter !== "all") list = list.filter((topic) => topic.category === forumFilter);
  if (sort === "popular") list.sort((a,b) => b.replies - a.replies);
  $("#forum-list").innerHTML = list.map((topic) => `
    <article class="forum-topic">
      <div class="forum-topic-avatar">${escapeHTML(topic.initials)}</div>
      <div class="forum-topic-copy"><h3>${escapeHTML(topic.title)}</h3><p>${escapeHTML(topic.body)}</p><small>${escapeHTML(topic.author)} · ${escapeHTML(topic.game)} · ${escapeHTML(topic.age)}</small></div>
      <div class="forum-topic-meta"><span>${topic.replies} replies</span><button data-action="like-topic" data-topic="${topic.id}">♥ ${topic.likes}</button><button data-action="open-topic" data-topic="${topic.id}">Open thread</button></div>
    </article>`).join("") || '<div class="search-no-results">No topics in this category yet.</div>';
}
function renderMemberDirectory() {
  const target = $("#member-directory");
  if (!target) return;
  const savedFollows = safeStore.get("member-follows", []);
  const following = new Set(Array.isArray(savedFollows) ? savedFollows : []);
  target.innerHTML = members.map((member) => `
    <article class="member-card">
      <div class="member-card-head"><img src="${member.avatar}" alt="${escapeHTML(member.name)} preview avatar" loading="lazy" decoding="async"><div><span class="preview-account-label">PREVIEW ACCOUNT</span><a href="#member/${member.id}"><h3>${escapeHTML(member.name)}</h3></a><small>${escapeHTML(member.platform)}</small></div></div>
      <p>${escapeHTML(member.bio)}</p>
      <div class="member-card-game">◉ ${escapeHTML(member.game)}</div>
      <div class="member-card-actions"><a class="button button-glass" href="#member/${member.id}">View profile <span>↗</span></a><button class="button ${following.has(member.id) ? "button-follow is-following" : "button-follow"}" data-action="follow-member" data-member="${member.id}">${following.has(member.id) ? "✓ Following" : "＋ Follow"}</button></div>
    </article>`).join("");
}
function renderMemberProfile(id) {
  const target = $("#member-profile");
  const member = members.find((item) => item.id === id);
  if (!member) {
    target.innerHTML = '<div class="search-no-results"><h1>Member not found</h1><p>This preview account is not in the directory.</p><a href="#streams">Return to the player directory ↗</a></div>';
    return;
  }
  const savedFollows = safeStore.get("member-follows", []);
  const following = Array.isArray(savedFollows) && savedFollows.includes(member.id);
  target.innerHTML = `<div class="member-profile-banner"><img src="assets/supplied/community-bg.jpg" alt="" loading="lazy"></div><section class="member-profile-card"><img class="member-profile-avatar" src="${member.avatar}" alt="${escapeHTML(member.name)} preview avatar"><span class="preview-account-label">LOCAL PREVIEW ACCOUNT</span><h1>${escapeHTML(member.name)}</h1><p class="member-handle">@${member.id} · ${escapeHTML(member.platform)}</p><p class="member-profile-bio">${escapeHTML(member.bio)}</p><div class="member-profile-actions"><button class="button button-follow ${following ? "is-following" : ""}" data-action="follow-member" data-member="${member.id}">${following ? "✓ Following" : "＋ Follow"}</button><a class="button button-glass" href="#streams">← Player directory</a></div><div class="member-profile-details"><div><span class="eyebrow">FAVOURITE GAME</span><a href="#games">${escapeHTML(member.game)} ↗</a></div><div><span class="eyebrow">ACCOUNT STATUS</span><b>Preview only · saved on this device</b></div></div></section><p class="preview-note">This profile is illustrative content for the VEXRA interface preview. It is not a registered or authenticated user.</p>`;
}
function renderGallery() {
  const select = $("#gallery-category");
  const query = $("#gallery-search").value.trim().toLowerCase();
  if (select.options.length === 1 && suppliedImages.length) {
    const categories = Array.from(new Set(suppliedImages.map((image) => image.category))).sort();
    select.insertAdjacentHTML("beforeend", categories.map((category) => `<option value="${escapeHTML(category)}">${escapeHTML(category)}</option>`).join(""));
  }
  const category = select.value;
  const filtered = suppliedImages.filter((image) => (category === "all" || image.category === category) && (image.name + " " + image.path + " " + image.category).toLowerCase().includes(query));
  $("#gallery-count").textContent = `${filtered.length} of ${suppliedImages.length} images`;
  $("#image-gallery").innerHTML = filtered.map((image) => `<article class="asset-card"><button class="asset-preview ${image.category === "Interface details" ? "asset-preview-contain" : ""}" data-action="preview-image" data-image="${escapeHTML(image.src)}" data-image-name="${escapeHTML(image.name)}" aria-label="Preview ${escapeHTML(image.name)}"><img src="${escapeHTML(image.src)}" alt="${escapeHTML(image.name.replace(/[_-]+/g, " "))}" loading="lazy" decoding="async"><span>View image ↗</span></button><div class="asset-caption"><strong>${escapeHTML(image.name.replace(/[_-]+/g, " "))}</strong><small>${escapeHTML(image.category)} · ${escapeHTML(image.type.toUpperCase())}</small></div></article>`).join("");
  $("#empty-gallery").hidden = filtered.length !== 0;
}
function showImagePreview(src, name) {
  const image = suppliedImages.find((item) => item.src === src);
  if (!image) return;
  openModal(modalHeading(name.replace(/[_-]+/g, " "), `<div class="gallery-modal-preview"><img src="${escapeHTML(image.src)}" alt="${escapeHTML(name.replace(/[_-]+/g, " "))}"></div><p>${escapeHTML(image.category)} · ${escapeHTML(image.path)}</p><div class="modal-actions"><a class="button button-glass" href="${escapeHTML(image.src)}" target="_blank" rel="noreferrer">Open original image ↗</a><button class="button button-primary" data-action="close-modal">Done</button></div>`));
}
function renderGameDetail(id) {
  const game = games.find((item) => item.id === id);
  const target = $("#game-detail");
  if (!game) {
    target.innerHTML = '<div class="search-no-results">That game could not be found. <a href="#games">Return to the library ↗</a></div>';
    return;
  }
  const saved = safeStore.get("wishlist", []).includes(game.id);
  target.innerHTML = `
    <div class="game-detail-hero art-${game.art}"><div><span class="eyebrow">VEXRA GAME PAGE · ${game.year}</span><h1>${escapeHTML(game.title)}</h1><div class="detail-meta"><span>${escapeHTML(game.genreLabel)}</span><span>${escapeHTML(game.players)} players online</span><span>Last played ${escapeHTML(game.played)}</span></div><p>${escapeHTML(game.description)}</p><div class="hero-actions"><a class="button button-primary" href="${game.store}" target="_blank" rel="noreferrer">Open official game page <span>↗</span></a><button class="button button-glass" data-action="wishlist" data-game="${game.id}">${saved ? "♥ In wishlist" : "♡ Add to wishlist"}</button><a class="text-link" href="#games">← Back to library</a></div></div></div>
    <div class="game-detail-columns"><div class="detail-panel"><span class="eyebrow">ABOUT THIS GAME</span><h2>${escapeHTML(game.accent)}</h2><p>${escapeHTML(game.description)} VEXRA makes it easier to find other players, save games to your collection, and get straight to the game’s official page when you’re ready.</p><ul><li>Discover players and community conversations</li><li>Keep a personal library on this device</li><li>Open the official store page in a new tab</li></ul></div><div class="detail-panel game-detail-actions"><span class="eyebrow">QUICK ACTIONS</span><h2>Your next session</h2><a class="button button-primary" href="#forum">Find a squad <span>↗</span></a><a class="button button-glass" href="#streams">Watch creators <span>↗</span></a><a class="button button-glass" href="${game.store}" target="_blank" rel="noreferrer">Visit game page <span>↗</span></a></div></div>`;
}
function renderSearch(query) {
  const normalized = query.toLowerCase();
  $("#search-title").textContent = query ? "Results for “" + query + "”" : "Search VEXRA";
  $("#search-subtitle").textContent = query ? "Games, creators, and conversations matching your search." : "Search games, players, clips, and community discussions.";
  const results = [];
  games.filter((game) => (game.title + " " + game.genreLabel + " " + game.description).toLowerCase().includes(normalized)).forEach((game) => results.push({title:game.title,detail:game.genreLabel+" · "+game.players+" online",icon:"◉",href:"#game/"+game.id}));
  members.filter((member) => (member.name + " " + member.game + " " + member.bio).toLowerCase().includes(normalized)).forEach((member) => results.push({title:member.name,detail:"Preview member · "+member.game,icon:"◎",href:"#member/"+member.id}));
  if (["", "empre55ive", "stream", "creator", "valorant", "clips"].some((term) => normalized.includes(term))) results.push({title:"Empre55ive",detail:"Creator profile · Live on Valorant",icon:"E5",href:"#streams"});
  topics.filter((topic) => (topic.title+" "+topic.body+" "+topic.game).toLowerCase().includes(normalized)).forEach((topic) => results.push({title:topic.title,detail:"Forum · "+topic.replies+" replies",icon:"♧",href:"#thread/"+topic.id}));
  $("#search-results").innerHTML = results.length ? results.map((item) => `<a class="search-result" href="${item.href}"><span class="search-result-icon">${escapeHTML(item.icon)}</span><span><strong>${escapeHTML(item.title)}</strong><small>${escapeHTML(item.detail)}</small></span><span>↗</span></a>`).join("") : '<div class="search-no-results">No results yet. Try a game title like Valorant, Ori, or Cyberpunk.</div>';
}
function updateWishlistButtons() {
  const wishlist = safeStore.get("wishlist", []);
  $$('[data-action="wishlist"]').forEach((button) => {
    const saved = wishlist.includes(button.dataset.game);
    button.classList.toggle("is-saved", saved);
    button.setAttribute("aria-label",saved?"Remove from wishlist":"Add to wishlist");
    if (button.classList.contains("button")) button.innerHTML = saved ? '♥ <span class="wishlist-label">In wishlist</span>' : '♡ <span class="wishlist-label">Add to wishlist</span>';
  });
}
function renderRoute() {
  if (!modal.hidden) closeModal();
  const parts = location.hash.replace(/^#/, "").split("/");
  let raw = "home";
  let argument = "";
  try { raw = decodeURIComponent(parts[0] || "home"); argument = decodeURIComponent(parts.slice(1).join("/")); }
  catch { raw = "home"; argument = ""; }
  let route = raw;
  if (route.startsWith("settings-")) route = "settings";
  const isThread = route === "thread";
  if (isThread) route = "forum";
  const valid = ["home","games","streams","profile","member","gallery","news","forum","settings","help","search","game","leaderboard","privacy","terms","logout"];
  if (!valid.includes(route)) route = "home";
  const navRoute = route === "member" ? "streams" : route;
  $$(".settings-tabs a").forEach((link) => link.classList.toggle("is-active",link.getAttribute("href")==="#"+raw));
  $$(".page").forEach((page) => page.classList.toggle("is-active", page.dataset.page === route));
  $$("[data-route]").forEach((link) => link.classList.toggle("is-active", link.dataset.route === navRoute));
  if (route === "games") renderGames("library-games-grid", {search:$("#library-search").value.toLowerCase(),genre:$("#game-category").value,sort:$("#game-sort").value});
  if (route === "profile") renderGames("profile-games-grid", {limit:3});
  if (route === "streams") { renderClips(); renderMemberDirectory(); }
  if (route === "member") renderMemberProfile(argument);
  if (route === "gallery") renderGallery();
  if (route === "forum") renderForum();
  if (route === "leaderboard") renderLeaderboard();
  if (route === "search") renderSearch(argument || $("#global-search").value);
  if (route === "game") renderGameDetail(argument);
  if (isThread && argument) showThread(argument);
  if (route === "settings" && raw !== "settings") window.setTimeout(() => document.getElementById(raw)?.scrollIntoView({behavior:"smooth",block:"start"}),80);
  $("#page-scroll").scrollTo({top:0,behavior:"auto"});
  updateScrollTop();
  setMobileNav(false);
}
function modalHeading(title, body) {
  return '<span class="eyebrow">VEXRA</span><h2 id="modal-title">'+escapeHTML(title)+'</h2>'+body;
}
function showPeople(title, names) {
  openModal(modalHeading(title,'<p>Sample VEXRA community connections for this prototype.</p><div class="modal-list">'+names.map((name,index) => '<div class="modal-list-item"><span class="leaderboard-player"><i>'+escapeHTML(name.slice(0,2).toUpperCase())+'</i><strong>'+escapeHTML(name)+'</strong></span><span>'+["Online now","Recently active","Plays Valorant"][index%3]+'</span></div>').join("")+'</div>'));
}
function showCopyDialog() {
  const link = location.origin && location.origin !== "null" ? location.origin+location.pathname+"#profile" : location.href.replace(/#.*$/,"")+"#profile";
  openModal(modalHeading("Share your profile",'<p>Your local VEXRA profile link. Copy it to share this demo page.</p><label>Profile link<input id="share-link" readonly value="'+escapeHTML(link)+'"></label><div class="modal-actions"><button class="button button-primary" data-action="copy-share-link">Copy link</button></div>'));
}
function showThread(topicId) {
  const topic = topics.find((item) => item.id === topicId);
  if (!topic) return;
  const replies = (topic.replyList||[]).map((reply) => '<div class="modal-list-item"><strong>'+escapeHTML(reply.author)+'</strong><span>'+escapeHTML(reply.body)+'</span></div>').join("");
  openModal(modalHeading(topic.title,'<p>'+escapeHTML(topic.body)+'</p><div class="thread-byline">Started by '+escapeHTML(topic.author)+' · '+escapeHTML(topic.game)+' · '+escapeHTML(topic.age)+'</div><div class="modal-list"><div class="modal-list-item"><strong>NovaLynn</strong><span>Try lowering your scope sensitivity a little at a time. Small changes are easier to judge.</span></div><div class="modal-list-item"><strong>Empre55ive</strong><span>Warm up in the range, then play one unrated before ranked. Works for me.</span></div>'+replies+'</div><form id="reply-form"><label>Join the conversation<textarea name="reply" required maxlength="400" placeholder="Write a thoughtful reply..."></textarea></label><div class="modal-actions"><button class="button button-primary" type="submit">Post reply</button></div></form>'));
  $("#reply-form").dataset.topic = topicId;
}
function renderNewsSearch() {
  const query = $("#news-search").value.toLowerCase();
  $$(".news-card").forEach((card) => card.hidden = !card.textContent.toLowerCase().includes(query));
}

document.addEventListener("click", (event) => {
  const action = event.target.closest("[data-action]");
  if (action) {
    const key = action.dataset.action;
    const gameId = action.dataset.game;
    if (key === "back") history.back();
    else if (key === "forward") history.forward();
    else if (key === "refresh") location.reload();
    else if (key === "scroll-top") $("#page-scroll").scrollTo({top:0,behavior:document.body.classList.contains("reduce-motion")?"auto":"smooth"});
    else if (key === "notifications") openModal(modalHeading("Notifications",'<p>You’re up to date with your VEXRA activity.</p><div class="modal-list"><a href="#streams" class="modal-list-item"><strong>Empre55ive is live</strong><span>Open stream ↗</span></a><a href="#forum" class="modal-list-item"><strong>2 new replies in your squad-up topic</strong><span>View forum ↗</span></a><a href="#games" class="modal-list-item"><strong>Your weekly play summary is ready</strong><span>View library ↗</span></a></div><div class="modal-actions"><button class="button button-primary" data-action="mark-notifications">Mark all as read</button></div>'));
    else if (key === "mark-notifications") { closeModal(); safeStore.set("notifications-read",true); $$(".notification-button i,.rail-user-row>button>i").forEach((dot) => dot.remove()); showToast("Notifications marked as read."); }
    else if (key === "wishlist") {
      let wishlist = safeStore.get("wishlist",[]);
      const saved = wishlist.includes(gameId);
      wishlist = saved ? wishlist.filter((id) => id !== gameId) : wishlist.concat(gameId);
      safeStore.set("wishlist",wishlist); updateWishlistButtons();
      if (action.closest("#game-detail")) renderGameDetail(gameId);
      showToast(saved ? "Removed from your wishlist." : "Added to your wishlist.");
    }
    else if (key === "follow") {
      followed = !followed; safeStore.set("following-empre55ive",followed);
      action.textContent = followed ? "✓ Following" : "＋ Follow";
      action.classList.toggle("is-following",followed);
      $("#followers-count").textContent = followed ? "5.7K+" : "5.7K";
      showToast(followed ? "You’re following Empre55ive." : "You unfollowed Empre55ive.");
    }
    else if (key === "follow-member") {
      const member = members.find((item) => item.id === action.dataset.member);
      if (member) {
        const savedFollows = safeStore.get("member-follows", []);
        const follows = new Set(Array.isArray(savedFollows) ? savedFollows : []);
        const nowFollowing = !follows.has(member.id);
        if (nowFollowing) follows.add(member.id); else follows.delete(member.id);
        safeStore.set("member-follows", Array.from(follows));
        renderMemberDirectory();
        if (location.hash === "#member/" + member.id) renderMemberProfile(member.id);
        showToast(nowFollowing ? `You’re following ${member.name} in this preview.` : `You unfollowed ${member.name}.`);
      }
    }
    else if (key === "preview-image") showImagePreview(action.dataset.image, action.dataset.imageName);
    else if (key === "message") {
      const messages = safeStore.get("messages",[]);
      const history = messages.map((item) => '<div class="modal-list-item"><strong>You · '+escapeHTML(item.sentAt)+'</strong><span>'+escapeHTML(item.text)+'</span></div>').join("");
      openModal(modalHeading("Message Empre55ive",'<p>Messages in this preview stay on this device. They are not delivered to the creator.</p>'+(history?'<div class="modal-list">'+history+'</div>':'<p class="thread-byline">No messages saved yet.</p>')+'<form id="message-form"><label>Your message<textarea name="message" required maxlength="500" placeholder="Say hi or invite them to a game..."></textarea></label><div class="modal-actions"><button type="submit" class="button button-primary">Save message</button></div></form>'));
    }
    else if (key === "contact-support") {
      const draft = safeStore.get("support-draft",null);
      openModal(modalHeading("Write a support note",'<p>This preview has no connected support inbox. Save a note on this device so it’s ready to send when VEXRA support is connected.</p>'+(draft?'<div class="modal-list-item"><strong>Saved draft: '+escapeHTML(draft.subject)+'</strong><span>'+escapeHTML(draft.details)+'</span></div>':'')+'<form id="support-form"><label>Subject<input name="subject" required maxlength="80" placeholder="What do you need help with?" value="'+escapeHTML(draft?.subject||'')+'"></label><label>Details<textarea name="details" required maxlength="600" placeholder="Tell us what happened...">'+escapeHTML(draft?.details||'')+'</textarea></label><div class="modal-actions"><button type="submit" class="button button-primary">Save support draft</button></div></form>'));
    }
    else if (key === "followers") showPeople("Followers",["NovaLynn","Rook","Mira","Kairo","JaxOnPC"]);
    else if (key === "following") showPeople("Following",["Empre55ive","LunaFPS","Simmycool","NovaLynn"]);
    else if (key === "profile-stat") openModal(modalHeading("Player statistics",'<p>Sample competitive stats shown for the VEXRA design preview.</p><div class="modal-list"><div class="modal-list-item"><strong>'+escapeHTML(action.dataset.stat || "Player stats")+'</strong><span>Current season</span></div><div class="modal-list-item"><strong>Win rate</strong><span>68.9% · Diamond 3</span></div><div class="modal-list-item"><strong>Recent form</strong><span>5 wins in the last 7 matches</span></div></div><a class="button button-glass" href="#streams">Open creator profile ↗</a>'));
    else if (key === "copy-profile") showCopyDialog();
    else if (key === "copy-share-link") {
      const input = $("#share-link");
      input.select();
      if (navigator.clipboard?.writeText) navigator.clipboard.writeText(input.value).then(() => { closeModal(); showToast("Profile link copied."); }).catch(() => showToast("Select the link above and copy it."));
      else { try { document.execCommand("copy"); closeModal(); showToast("Profile link copied."); } catch { showToast("Select the link above and copy it."); } }
    }
    else if (key === "edit-profile") openModal(modalHeading("Edit player profile",'<p>Update the display name used in this local preview.</p><form id="profile-form"><label>Display name<input name="name" required maxlength="26" value="'+escapeHTML(safeStore.get("display-name","VEXRA Player"))+'"></label><div class="modal-actions"><button type="submit" class="button button-primary">Save profile</button></div></form>'));
    else if (key === "new-topic") openModal(modalHeading("Start a forum topic",'<p>Share a question, find a squad, or start a conversation.</p><form id="topic-form"><label>Topic title<input name="title" required maxlength="90" placeholder="What’s on your mind?"></label><label>Category<select name="category"><option value="looking">Looking for squad</option><option value="help">Help &amp; tips</option><option value="chat">General chat</option></select></label><label>Game or topic<input name="game" maxlength="40" placeholder="Valorant, game recommendations..."></label><label>Details<textarea name="body" required maxlength="500" placeholder="Add a little context..."></textarea></label><div class="modal-actions"><button type="submit" class="button button-primary">Publish topic</button></div></form>'));
    else if (key === "like-topic") {
      const topic = topics.find((item) => item.id === action.dataset.topic);
      if (topic) { topic.likes++; safeStore.set("topics",topics); renderForum(); showToast("You liked this topic."); }
    }
    else if (key === "open-topic") showThread(action.dataset.topic);
    else if (key === "like-clip") {
      const clipId = action.dataset.clip;
      if (likedClips.has(clipId)) likedClips.delete(clipId); else likedClips.add(clipId);
      safeStore.set("liked-clips",Array.from(likedClips)); renderClips();
    }
    else if (key === "favorite-clip") {
      const clipId = action.dataset.clip;
      if (favorites.has(clipId)) favorites.delete(clipId); else favorites.add(clipId);
      safeStore.set("favorites",Array.from(favorites)); renderClips();
      action.textContent = favorites.has(clipId) ? "★ Saved" : "☆ Save clip";
      showToast(favorites.has(clipId) ? "Clip saved to Favourites." : "Clip removed from Favourites.");
    }
    else if (key === "open-clip") {
      const clip = clips.find((item) => item.id === action.dataset.clip);
      if (clip) openModal(modalHeading(clip.title,'<div class="clip-preview '+clip.art+'"><button data-action="toggle-preview" aria-label="Play preview">▶</button></div><p>'+escapeHTML(clip.caption)+' · '+escapeHTML(clip.game)+' · '+clip.views.toLocaleString()+' views</p><div class="modal-actions"><button class="button button-glass" data-action="comment-clip" data-clip="'+clip.id+'">Comment</button><button class="button button-primary" data-action="favorite-clip" data-clip="'+clip.id+'">☆ Save clip</button></div>'));
    }
    else if (key === "toggle-preview") {
      const preview=action.closest(".clip-preview");
      const playing=preview.classList.toggle("is-playing");
      action.textContent=playing?"Ⅱ":"▶";
      action.setAttribute("aria-pressed",String(playing));
      showToast(playing?"Preview playing.":"Preview paused.");
    }
    else if (key === "comment-clip") {
      const clip = clips.find((item) => item.id === action.dataset.clip);
      if (clip) {
        const savedComments = safeStore.get("clip-comments",{});
        const userComments = (savedComments[clip.id]||[]).map((comment) => '<div class="modal-list-item"><strong>'+escapeHTML(comment.author)+'</strong><span>'+escapeHTML(comment.text)+'</span></div>').join("");
        openModal(modalHeading("Comments",'<p>Join the conversation on “'+escapeHTML(clip.title)+'”.</p><div class="modal-list"><div class="modal-list-item"><strong>NovaLynn</strong><span>That timing was unreal.</span></div><div class="modal-list-item"><strong>Rook</strong><span>Need this aim routine 👀</span></div>'+userComments+'</div><form id="comment-form" data-clip="'+clip.id+'"><label>Your comment<textarea name="comment" required maxlength="300" placeholder="Add a comment..."></textarea></label><div class="modal-actions"><button type="submit" class="button button-primary">Post comment</button></div></form>'));
      }
    }
    else if (key === "read-news") {
      const stories = {
        ranked:["New season, new climb: what’s changing in ranked","Competitive updates bring a fresh leaderboard, a new map rotation, and more room to find the right teammates. Check your settings before queueing, and remember: a good comm is better than a loud one."],
        coop:["Find your next co-op obsession","Some worlds are easier to enter with a crew. Pick a game that fits your group’s pace, agree on a night, and let the first session be about having fun rather than finishing everything."],
        creators:["Creator profiles are live on VEXRA","Follow a creator, catch the clips you missed, and find people who like the same games. Save favourites to make a personal watch list on this device."]
      };
      const story = stories[action.dataset.news] || stories.creators;
      openModal(modalHeading(story[0],'<span class="news-category">VEXRA EDITORIAL</span><p>'+escapeHTML(story[1])+'</p><p>Find related conversations, clips, and creators through the Games, Streams, and Forum sections.</p><div class="modal-actions"><a class="button button-glass" href="#forum">Discuss in forum ↗</a><button class="button button-primary" data-action="close-modal">Done</button></div>'));
    }
    else if (key === "save-settings") { showToast("Your preferences are saved on this device."); }
    else if (key === "reset-settings") { safeStore.set("compact",false); safeStore.set("motion",false); safeStore.set("visibility",true); safeStore.set("friend-activity",true); safeStore.set("creator-updates",true); $("#compact-toggle").checked=false; $("#motion-toggle").checked=false; $("#visibility-toggle").checked=true; $("#friend-activity-toggle").checked=true; $("#creator-updates-toggle").checked=true; document.body.classList.remove("compact-mode","reduce-motion"); showToast("Settings reset to default."); }
    else if (key === "continue-demo") { location.hash="#home"; }
    else if (key === "close-modal") closeModal();
    event.preventDefault();
    return;
  }
  const routeLink = event.target.closest("[data-route]");
  if (routeLink && routeLink.getAttribute("href") === "#logout") {
    const leave = confirm("Sign out of this local VEXRA demo?");
    if (!leave) event.preventDefault();
  }
  const clipTab = event.target.closest("[data-clip-tab]");
  if (clipTab) {
    selectedClipTab=clipTab.dataset.clipTab;
    $$("[data-clip-tab]").forEach((button) => button.classList.toggle("is-active",button===clipTab));
    renderClips();
  }
  const forumButton = event.target.closest("[data-forum-filter]");
  if (forumButton) {
    forumFilter=forumButton.dataset.forumFilter;
    $$("[data-forum-filter]").forEach((button) => button.classList.toggle("is-active",button===forumButton));
    renderForum();
  }
  const layout = event.target.closest("[data-layout]");
  if (layout) {
    const mode=layout.dataset.layout;
    $$(".game-grid").forEach((grid) => grid.classList.toggle("list-layout",mode==="list"));
    $$("[data-layout]").forEach((button) => button.classList.toggle("is-active",button.dataset.layout===mode));
    safeStore.set("layout",mode);
  }
});

document.addEventListener("submit", (event) => {
  if (event.target.id === "search-form") {
    event.preventDefault();
    const query=$("#global-search").value.trim();
    location.hash="#search/"+encodeURIComponent(query);
  } else if (event.target.id === "topic-form") {
    event.preventDefault();
    const data=new FormData(event.target);
    const title=String(data.get("title")).trim();
    topics.unshift({id:"topic-"+Date.now(),title,category:String(data.get("category")),author:safeStore.get("display-name","VEXRA Player"),initials:safeStore.get("display-name","VEXRA Player").slice(0,2).toUpperCase(),game:String(data.get("game")||"VEXRA community"),replies:0,replyList:[],likes:0,age:"Just now",body:String(data.get("body")).trim()});
    safeStore.set("topics",topics); forumFilter="all"; closeModal(); location.hash="#forum"; renderForum(); showToast("Your topic is live in the forum.");
  } else if (event.target.id === "reply-form") {
    event.preventDefault(); const topic=topics.find((item)=>item.id===event.target.dataset.topic); const reply=String(new FormData(event.target).get("reply")).trim(); if(topic){topic.replies++;topic.replyList=topic.replyList||[];topic.replyList.push({author:safeStore.get("display-name","VEXRA Player"),body:reply});safeStore.set("topics",topics)} closeModal(); renderForum(); showToast("Your reply was added to the thread.");
  } else if (event.target.id === "message-form") {
    event.preventDefault(); const message=String(new FormData(event.target).get("message")).trim(); const messages=safeStore.get("messages",[]); messages.push({text:message,sentAt:new Date().toLocaleString()}); safeStore.set("messages",messages); closeModal(); showToast("Message saved on this device; it wasn’t sent to the creator.");
  } else if (event.target.id === "comment-form") {
    event.preventDefault(); const clipId=event.target.dataset.clip; const comment=String(new FormData(event.target).get("comment")).trim(); const saved=safeStore.get("clip-comments",{}); saved[clipId]=saved[clipId]||[]; saved[clipId].push({author:safeStore.get("display-name","VEXRA Player"),text:comment}); safeStore.set("clip-comments",saved); closeModal(); showToast("Your comment was saved on this device.");
  } else if (event.target.id === "support-form") {
    event.preventDefault();
    const data=new FormData(event.target);
    safeStore.set("support-draft",{subject:String(data.get("subject")).trim(),details:String(data.get("details")).trim(),savedAt:new Date().toISOString()});
    closeModal(); showToast("Support draft saved on this device. It hasn’t been sent.");
  } else if (event.target.id === "profile-form") {
    event.preventDefault(); const name=String(new FormData(event.target).get("name")).trim()||"VEXRA Player"; safeStore.set("display-name",name); updateProfileName(); closeModal(); showToast("Your display name was updated.");
  }
});

document.addEventListener("change", (event) => {
  if (event.target.id === "game-category" || event.target.id === "game-sort") renderGames("library-games-grid",{search:$("#library-search").value.toLowerCase(),genre:$("#game-category").value,sort:$("#game-sort").value});
  if (event.target.id === "clip-game" || event.target.id === "clip-sort") renderClips();
  if (["leaderboard-game","leaderboard-region","leaderboard-scope","leaderboard-rank"].includes(event.target.id)) renderLeaderboard();
  if (event.target.id === "compact-toggle") { document.body.classList.toggle("compact-mode",event.target.checked); safeStore.set("compact",event.target.checked); }
  if (event.target.id === "motion-toggle") { document.body.classList.toggle("reduce-motion",event.target.checked); safeStore.set("motion",event.target.checked); }
  if (event.target.id === "visibility-toggle") { safeStore.set("visibility",event.target.checked); showToast(event.target.checked?"Online status is visible to friends.":"Online status is hidden from friends."); }
  if (event.target.id === "friend-activity-toggle") safeStore.set("friend-activity",event.target.checked);
  if (event.target.id === "creator-updates-toggle") safeStore.set("creator-updates",event.target.checked);
});
$("#library-search").addEventListener("input",() => renderGames("library-games-grid",{search:$("#library-search").value.toLowerCase(),genre:$("#game-category").value,sort:$("#game-sort").value}));
$("#gallery-search").addEventListener("input",renderGallery);
$("#gallery-category").addEventListener("change",renderGallery);
$("#news-search").addEventListener("input",renderNewsSearch);
$("#help-search").addEventListener("input",() => {
  const query=$("#help-search").value.toLowerCase();
  $$("#help-topics details").forEach((item) => item.hidden=!item.textContent.toLowerCase().includes(query));
});
$("#status-button").addEventListener("click",() => {
  const menu=$("#status-menu");
  menu.hidden=!menu.hidden;
  $("#status-button").setAttribute("aria-expanded",String(!menu.hidden));
});
$("#status-menu").addEventListener("click",(event) => {
  const choice=event.target.closest("[data-status]");
  if (!choice) return;
  $("#status-label").textContent=choice.dataset.status;
  safeStore.set("status",choice.dataset.status);
  const dot=$("#status-button .status-dot");
  dot.className="status-dot"+(choice.dataset.status==="Away"?" away":choice.dataset.status==="Busy"?" busy":choice.dataset.status==="Invisible"?" invisible":"");
  $("#status-menu").hidden=true;
  $("#status-button").setAttribute("aria-expanded","false");
  showToast("Your status is now "+choice.dataset.status.toLowerCase()+".");
});
$("#sidebar-toggle").addEventListener("click",() => setMobileNav(!$("#app-frame").classList.contains("nav-open")));
$("#sidebar-close").addEventListener("click",() => setMobileNav(false));
$("#page-scroll").addEventListener("scroll",updateScrollTop,{passive:true});
$("#social-toggle").addEventListener("click",() => {
  const opened=$("#social-widget").classList.toggle("is-open");
  $("#social-toggle").setAttribute("aria-expanded",String(opened));
});
document.addEventListener("click",(event) => {
  if ($("#app-frame").classList.contains("nav-open") && !event.target.closest(".left-sidebar") && !event.target.closest("#sidebar-toggle")) setMobileNav(false);
  if (!event.target.closest(".status-control")) { $("#status-menu").hidden=true; $("#status-button").setAttribute("aria-expanded","false"); }
  if (!event.target.closest("#social-widget")) { $("#social-widget").classList.remove("is-open"); $("#social-toggle").setAttribute("aria-expanded","false"); }
  if (event.target===modal) closeModal();
});
window.addEventListener("hashchange",renderRoute);
window.addEventListener("keydown",(event) => {
  if ((event.ctrlKey||event.metaKey) && event.key.toLowerCase()==="k") { event.preventDefault(); $("#global-search").focus(); }
  if (event.key==="Escape") { if(!modal.hidden) closeModal(); $("#status-menu").hidden=true; $("#social-widget").classList.remove("is-open"); setMobileNav(false); }
});

renderGames("home-games-grid",{limit:6});
renderGames("profile-games-grid",{limit:3});
renderGallery();
renderLeaderboard();
updateProfileName();
if (followed) { const followButton=$('[data-action="follow"]'); if(followButton){followButton.textContent="✓ Following";followButton.classList.add("is-following")} }
updateWishlistButtons();
if (safeStore.get("notifications-read",false)) $$(".notification-button i,.rail-user-row>button>i").forEach((dot) => dot.remove());
if (safeStore.get("compact",false)) { document.body.classList.add("compact-mode"); $("#compact-toggle").checked=true; }
if (safeStore.get("motion",false)) { document.body.classList.add("reduce-motion"); $("#motion-toggle").checked=true; }
if (!safeStore.get("visibility",true)) $("#visibility-toggle").checked=false;
$("#friend-activity-toggle").checked=safeStore.get("friend-activity",true);
$("#creator-updates-toggle").checked=safeStore.get("creator-updates",true);
const savedStatus=safeStore.get("status","Online");
const savedStatusChoice=$(`[data-status="${savedStatus}"]`);
if(savedStatusChoice){$("#status-label").textContent=savedStatus;const statusDot=$("#status-button .status-dot");statusDot.className="status-dot"+(savedStatus==="Away"?" away":savedStatus==="Busy"?" busy":savedStatus==="Invisible"?" invisible":"");}
const storedLayout=safeStore.get("layout","grid");
if (storedLayout==="list") { $$(".game-grid").forEach((grid)=>grid.classList.add("list-layout")); $$("[data-layout]").forEach((button)=>button.classList.toggle("is-active",button.dataset.layout==="list")); }
renderRoute();
