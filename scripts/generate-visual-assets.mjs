import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

const root = process.cwd();
const gamesDir = join(root, 'public', 'assets', 'games');
const avatarsDir = join(root, 'public', 'assets', 'avatars');
await mkdir(gamesDir, { recursive: true });
await mkdir(avatarsDir, { recursive: true });

const catalogPath = join(root, 'data', 'game-catalog.json');
const games = JSON.parse(await readFile(catalogPath, 'utf8'));
const palettes = [
  ['#f75b86', '#f8ba72', '#29385c', '#152433'], ['#28c3d0', '#fb9879', '#31305a', '#0c1e2d'],
  ['#fdbe5a', '#e56558', '#31513c', '#151a2a'], ['#5aa7d1', '#bb7bd5', '#323c59', '#101827'],
  ['#49d2c0', '#f5a462', '#284e57', '#0d2027'], ['#fa6a9b', '#58d2dc', '#43335f', '#12182a'],
  ['#f8ad4b', '#55c9ae', '#526b44', '#172228'], ['#48b9df', '#8878ef', '#38345a', '#11192b'],
  ['#ff836d', '#f3cb71', '#3c5a49', '#131e28'], ['#e94e96', '#71d7d4', '#303858', '#111a2b'],
  ['#ec9560', '#49c4d5', '#485141', '#111b27'], ['#7bb8d7', '#efac75', '#303f55', '#0e1a24'],
  ['#c66de2', '#5fb4d2', '#38334f', '#0e1424'], ['#fa6f82', '#e8ba68', '#53444c', '#171824'],
  ['#efb95c', '#4dc7c7', '#34605c', '#101b23'], ['#54d2c9', '#fb786d', '#354766', '#101829'],
  ['#f2a04f', '#e46289', '#39465b', '#111721'], ['#e5529b', '#5cd6dd', '#353454', '#101926'],
  ['#ff5d89', '#ffd36b', '#315568', '#101e2d'],
];

function escapeXml(value) {
  return String(value).replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' }[char]));
}
function hash(value) {
  let n = 2166136261;
  for (const char of value) n = Math.imul(n ^ char.charCodeAt(0), 16777619);
  return n >>> 0;
}
function cityBlocks(seed) {
  let n = seed || 1;
  const random = () => ((n = (Math.imul(n, 1664525) + 1013904223) >>> 0) / 4294967296);
  const blocks = [];
  let x = -10;
  while (x < 1610) {
    const w = 28 + Math.floor(random() * 70);
    const h = 100 + Math.floor(random() * 255);
    const y = 520 - h;
    blocks.push(`<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="#0a1220" opacity="${(.55 + random() * .35).toFixed(2)}"/>`);
    if (random() > .72) blocks.push(`<rect x="${x + Math.round(w * .25)}" y="${y - 25}" width="${Math.max(3, Math.round(w * .12))}" height="25" fill="#0a1220"/>`);
    for (let wy = y + 16; wy < 510; wy += 22) {
      for (let wx = x + 8; wx < x + w - 6; wx += 14) {
        if (random() > .7) blocks.push(`<rect x="${wx}" y="${wy}" width="4" height="7" rx="1" fill="${random() > .55 ? '#ffd18a' : '#75e3df'}" opacity=".62"/>`);
      }
    }
    x += w + 7;
  }
  return blocks.join('');
}
function palm(x, y, scale, color) {
  return `<g transform="translate(${x} ${y}) scale(${scale})" fill="none" stroke="${color}" stroke-linecap="round"><path d="M0 0 Q7-130 2-350" stroke-width="13"/><path d="M1-340 Q-96-420-178-395 M1-340 Q-123-365-216-334 M2-341 Q-90-328-164-267 M4-341 Q60-440 158-433 M4-341 Q135-384 229-356 M4-341 Q104-332 183-278 M2-341 Q10-454-26-494" stroke-width="16"/></g>`;
}
function car(accent) {
  return `<g transform="translate(800 548)"><path d="M-270 34l34-80q18-42 71-50l94-100q25-24 64-24h126q47 0 77 34l75 91 69 24q38 13 48 47l16 58q8 29-18 29h-30a70 70 0 0 0-138 0h-268a70 70 0 0 0-138 0h-64q-35 0-18-29z" fill="#09131f" stroke="${accent}" stroke-width="5" stroke-linejoin="round"/><path d="M-118-92l72-76q14-14 39-14h116q23 0 40 20l57 70z" fill="#122d3a" opacity=".95"/><path d="M-260 28h633" stroke="#fff" stroke-opacity=".35" stroke-width="3"/><circle cx="-184" cy="72" r="42" fill="#070b11" stroke="#8ae6e1" stroke-width="7"/><circle cx="244" cy="72" r="42" fill="#070b11" stroke="#8ae6e1" stroke-width="7"/><path d="M-325 142h740" stroke="${accent}" stroke-opacity=".7" stroke-width="5"/></g>`;
}
function coverSvg(game, idx) {
  const [hot, warm, cool, dark] = palettes[idx % palettes.length];
  const rand = hash(game.slug);
  const title = escapeXml(game.title.toUpperCase());
  const setting = escapeXml((game.setting || 'GTA CITY').toUpperCase());
  const tag = game.year ? `${game.year}  /  GTA ARCHIVE` : 'GTA ARCHIVE';
  const blocks = cityBlocks(rand);
  const skyline = game.year < 2001
    ? `<g opacity=".75"><path d="M0 490H1600V580H0z" fill="#091321"/><path d="M120 490l260-230 260 230M790 490l175-185 185 185" fill="#122230" stroke="${hot}" stroke-width="6"/><path d="M220 494V362h320v132M870 494V377h175v117" fill="#111b28" stroke="#48d5dc" stroke-width="4"/></g>`
    : `<g>${blocks}</g>`;
  const image = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1600 900" role="img" aria-labelledby="title desc"><title id="title">${title} — original GameVault artwork</title><desc id="desc">A custom neon city poster for the GameVault GTA catalog. ${setting}.</desc><defs><linearGradient id="sky" x2="1" y2="1"><stop stop-color="${dark}"/><stop offset=".44" stop-color="${cool}"/><stop offset=".78" stop-color="${hot}"/><stop offset="1" stop-color="${warm}"/></linearGradient><radialGradient id="glow"><stop stop-color="${warm}" stop-opacity=".92"/><stop offset="1" stop-color="${warm}" stop-opacity="0"/></radialGradient><linearGradient id="shade" x2="0" y2="1"><stop stop-color="#08101d" stop-opacity="0"/><stop offset=".57" stop-color="#08101d" stop-opacity=".18"/><stop offset="1" stop-color="#070c14" stop-opacity=".96"/></linearGradient><pattern id="grid" width="48" height="48" patternUnits="userSpaceOnUse"><path d="M48 0H0V48" fill="none" stroke="#d9faff" stroke-opacity=".09" stroke-width="1"/></pattern></defs><rect width="1600" height="900" fill="url(#sky)"/><circle cx="1160" cy="212" r="280" fill="url(#glow)" opacity=".78"/><circle cx="1160" cy="212" r="116" fill="${warm}" opacity=".38"/><path d="M0 0h1600v900H0z" fill="url(#grid)" opacity=".55"/><path d="M0 390L690 0h200L176 548z" fill="#e7fcff" opacity=".035"/><path d="M0 550h1600v350H0z" fill="#101b28" opacity=".4"/>${skyline}${palm(1280, 570, .8, '#0b1722')}${palm(1530, 588, .53, '#101b25')}<path d="M0 590q400-130 800 0t800 0v310H0z" fill="#0a121e" opacity=".65"/><path d="M0 735h1600M0 790h1600M0 845h1600" stroke="#82f2e3" stroke-opacity=".18" stroke-width="2"/><path d="M720 900l175-255 160 255" fill="${hot}" opacity=".12"/><path d="M800 900l95-255 72 255" fill="#f8d38e" opacity=".13"/>${car(hot)}<rect y="620" width="1600" height="280" fill="url(#shade)"/><rect x="52" y="50" width="1496" height="800" rx="8" fill="none" stroke="#e2faff" stroke-opacity=".28" stroke-width="2"/><text x="82" y="112" fill="#eafaff" font-family="Arial,sans-serif" font-size="21" font-weight="700" letter-spacing="7">GAMEVAULT   /   GRAND THEFT AUTO COLLECTION</text><path d="M84 133h460" stroke="${hot}" stroke-width="5"/><text x="82" y="700" fill="#fff" font-family="Impact,'Arial Narrow',sans-serif" font-size="72" font-weight="900" letter-spacing="1" textLength="1436" lengthAdjust="spacingAndGlyphs">${title}</text><text x="88" y="755" fill="#bce9ef" font-family="Arial,sans-serif" font-size="25" font-weight="700" letter-spacing="6">${setting}</text><text x="88" y="817" fill="#e6b86f" font-family="Arial,sans-serif" font-size="17" font-weight="700" letter-spacing="5">${tag}</text><text x="1515" y="817" text-anchor="end" fill="#d3f3f3" font-family="Arial,sans-serif" font-size="14" letter-spacing="3">ORIGINAL GAMEVAULT ART</text></svg>`;
  return image
    .replace(/<text x="82" y="112"[^>]*>GAMEVAULT[\s\S]*?<\/text>/, '<text x="800" y="112" text-anchor="middle" fill="#eafaff" font-family="Arial,sans-serif" font-size="20" font-weight="700" letter-spacing="5">GAMEVAULT CITY ARCHIVE</text>')
    .replace(/<text x="82" y="700"[^>]*>[\s\S]*?<\/text>/, '')
    .replace(/<text x="88" y="755"[^>]*>[\s\S]*?<\/text>/, '')
    .replace(/<text x="88" y="817"[^>]*>[\s\S]*?<\/text>/, '')
    .replace(/<text x="1515" y="817"[^>]*>ORIGINAL GAMEVAULT ART<\/text>/, '');
}

for (const [idx, game] of games.entries()) {
  const file = `${game.slug}.svg`;
  await writeFile(join(gamesDir, file), coverSvg(game, idx), 'utf8');
  game.artwork_path = `/assets/games/${file}`;
  game.artwork_type = 'original-gamevault';
}
await writeFile(catalogPath, `${JSON.stringify(games, null, 2)}\n`, 'utf8');

const presets = [
  { id: 'coast-runner', label: 'Vice City Wheelman', setting: 'VICE CITY · 1986', skin: '#d49b75', hair: '#17202b', shirt: '#ff697e', jacket: '#29223b', bg: ['#ef628e', '#1e5870'], style: 'crop', accessory: 'aviators', scene: 'vice' },
  { id: 'neon-raider', label: 'Liberty City Fixer', setting: 'LIBERTY CITY · 2001', skin: '#f0c09b', hair: '#2b1720', shirt: '#d7ad6c', jacket: '#273044', bg: ['#445478', '#161d2b'], style: 'long', accessory: 'earpiece', scene: 'liberty' },
  { id: 'night-drive', label: 'San Andreas Street Racer', setting: 'SAN ANDREAS · 1992', skin: '#8b563e', hair: '#101a20', shirt: '#43c9cb', jacket: '#273c39', bg: ['#e98754', '#355344'], style: 'short', accessory: 'bandana', scene: 'san' },
  { id: 'vice-captain', label: 'Los Santos Mechanic', setting: 'LOS SANTOS · 2013', skin: '#e5b18b', hair: '#eacb9c', shirt: '#66b6dd', jacket: '#234359', bg: ['#f3a967', '#2c5871'], style: 'swept', accessory: 'cap', scene: 'los-santos' },
  { id: 'sunset-scout', label: 'After Hours DJ', setting: 'VICE CITY · AFTER DARK', skin: '#bd785b', hair: '#271915', shirt: '#e96a97', jacket: '#372242', bg: ['#de4f91', '#203650'], style: 'curly', accessory: 'headphones', scene: 'nightclub' },
  { id: 'city-ghost', label: 'Liberty City Photographer', setting: 'LIBERTY CITY · 2008', skin: '#f4d3bb', hair: '#51435b', shirt: '#b386df', jacket: '#292c3d', bg: ['#53637b', '#171d29'], style: 'bob', accessory: 'camera', scene: 'liberty' },
  { id: 'palm-striker', label: 'Chinatown Courier', setting: 'LIBERTY CITY · CHINATOWN', skin: '#74412e', hair: '#11161d', shirt: '#d5af67', jacket: '#225155', bg: ['#e68052', '#16494e'], style: 'fade', accessory: 'helmet', scene: 'chinatown' },
  { id: 'after-hours', label: 'Leonida Coast Runner', setting: 'LEONIDA · COAST ROAD', skin: '#e7ae85', hair: '#27212c', shirt: '#73c2b1', jacket: '#284d58', bg: ['#39b8bd', '#563b69'], style: 'braids', accessory: 'visor', scene: 'leonida' },
  { id: 'hotline', label: 'Docks Outlaw Rider', setting: 'LIBERTY CITY · THE DOCKS', skin: '#a96d4d', hair: '#302020', shirt: '#f07857', jacket: '#242633', bg: ['#e25e73', '#202a38'], style: 'mohawk', accessory: 'biker', scene: 'docks' },
  { id: 'ocean-signal', label: 'Vice City Radio Host', setting: 'VICE CITY · RADIO', skin: '#edc8a8', hair: '#292438', shirt: '#52b4da', jacket: '#284153', bg: ['#275d79', '#ad4c83'], style: 'bun', accessory: 'headset', scene: 'vice' },
  { id: 'district-one', label: 'Anywhere City Scout', setting: 'ANYWHERE CITY · 1999', skin: '#9d6046', hair: '#20202b', shirt: '#b66cdb', jacket: '#39324d', bg: ['#7760a3', '#1b283b'], style: 'afro', accessory: 'glasses', scene: 'retro' },
  { id: 'sunset-syndicate', label: 'Los Santos Getaway Driver', setting: 'LOS SANTOS · NIGHT RUN', skin: '#f0c3a3', hair: '#854b36', shirt: '#d84f7d', jacket: '#332536', bg: ['#e85c78', '#243c59'], style: 'waves', accessory: 'shades', scene: 'los-santos' },
];

function hairShape(style, color) {
  const shapes = {
    crop: '<path d="M92 143q5-90 88-94 89 2 100 91l-23 31q-13-52-78-52-64 0-77 52z"/>',
    long: '<path d="M79 160Q59 50 166 42q100 0 104 114l-9 154-48 34-7-190q-28-47-73-25l-9 197-46-32z"/>',
    short: '<path d="M87 151Q82 54 174 47q85 5 92 101l-22 22q-16-49-75-49-54 0-68 42z"/>',
    swept: '<path d="M82 143Q70 51 170 43q89 2 98 90l-27 34q-13-47-70-46-50 0-76 41z"/><path d="M113 70q74-55 141 8-53-20-98 18z"/>',
    curly: '<g><circle cx="103" cy="97" r="30"/><circle cx="133" cy="69" r="31"/><circle cx="168" cy="62" r="31"/><circle cx="202" cy="71" r="31"/><circle cx="231" cy="101" r="29"/><path d="M84 108q88-63 169 0l-15 50q-16-45-71-45-53 0-69 43z"/></g>',
    bob: '<path d="M78 158Q63 55 166 43q103-2 103 113l-18 118q-15 40-36 39l-4-174q-44-42-91 0l-3 172q-25 3-39-37z"/>',
    fade: '<path d="M91 150q-2-89 79-98 81 5 90 97l-17 19q-11-45-71-47-60 1-67 44z"/><path d="M83 130h181" stroke="#e8b874" stroke-width="6" opacity=".75"/>',
    braids: '<path d="M83 150Q72 58 164 46q94 0 106 104l-18 50-15-59q-22-37-72-34-47 3-66 37l-12 57z"/><g stroke-width="13" stroke-linecap="round"><path d="M98 127v139m24-162v189m116-151v146m-25-166v183"/></g>',
    mohawk: '<path d="M116 150q-4-46 16-92 17-31 45-39 31 13 45 57 9 32 4 75-21-47-60-47-33 0-50 46z"/>',
    bun: '<path d="M90 155Q78 56 169 45q88 4 96 102l-21 39q-15-54-74-54-52 0-68 48z"/><circle cx="219" cy="51" r="34"/>',
    afro: '<path d="M82 155Q52 104 79 67q31-46 93-42 75-4 98 53 17 42-5 80l-23-35q-20-33-68-35-49-1-73 34z"/>',
    waves: '<path d="M84 151q-3-100 88-105 92 4 99 103l-24 26q-14-55-76-55-58 0-71 48z"/><path d="M100 93q28-31 60-11m3-3q30-28 59-5m-118 42q28-28 57-8" fill="none" stroke="#d68d70" stroke-width="7"/>',
  };
  return `<g fill="${color}">${shapes[style] || shapes.crop}</g>`;
}
function avatarSvg(p) {
  const [bgA, bgB] = p.bg;
  const accessories = {
    headphones: '<g fill="none" stroke="#161c2c" stroke-width="12"><path d="M85 174v-21q0-95 84-95t84 95v21"/><rect x="73" y="165" width="23" height="49" rx="11" fill="#f4c75d"/><rect x="241" y="165" width="23" height="49" rx="11" fill="#f4c75d"/></g>',
    headset: '<path d="M83 167q5-101 87-101 85 0 87 101" fill="none" stroke="#19202f" stroke-width="14"/><rect x="72" y="157" width="24" height="53" rx="12" fill="#64d8dc"/><rect x="244" y="157" width="24" height="53" rx="12" fill="#64d8dc"/>',
    shades: '<path d="M94 158h62l-7 33q-4 17-27 17-19 0-24-18zm76 0h58l-4 33q-3 17-26 17-19 0-24-18zM154 166h21" fill="#151827" stroke="#f6d18a" stroke-width="5"/>',
    glasses: '<path d="M93 161h61v30q-2 17-30 17-28 0-31-17zm81 0h57v30q-3 17-30 17-26 0-27-17zM154 171h20" fill="#14212d" fill-opacity=".6" stroke="#151a28" stroke-width="7"/>',
    earring: '<circle cx="239" cy="204" r="9" fill="#ffd76c" stroke="#fff1b8" stroke-width="3"/>',
    bandana: '<path d="M94 125q78 38 152-1l7 29q-79 42-164 0z" fill="#ee4f85"/><path d="M220 146l43 37-8-44" fill="#d53d78"/>',
    scar: '<path d="M215 166l-15 31" stroke="#9c4b48" stroke-width="5" stroke-linecap="round"/>',
    earpiece: '<path d="M245 157v55q0 13-12 13h-17" fill="none" stroke="#f4cf76" stroke-width="8" stroke-linecap="round"/><circle cx="214" cy="226" r="5" fill="#71e5de"/>',
    visor: '<path d="M90 137q82-40 163 0l-11 22q-68-24-140 0z" fill="#141a27" stroke="#f7d37b" stroke-width="4"/>',
    aviators: '<path d="M92 158h63l-9 31q-6 17-26 17-20 0-25-18zm81 0h62l-7 31q-5 17-27 17-19 0-24-18zM155 166h18" fill="#151827" stroke="#e6bb68" stroke-width="5"/><path d="M101 165h24m58 0h20" stroke="#dffaff" stroke-opacity=".75" stroke-width="3"/>',
    cap: '<path d="M84 132q18-82 88-83 70 1 90 82-80-26-178 1z" fill="#243449" stroke="#f4c86c" stroke-width="5"/><path d="M91 132q72-27 156-2l-12 17q-68-16-135 3z" fill="#182438"/>',
    camera: '<path d="M103 259l56 56 57-56" fill="none" stroke="#d6e5ec" stroke-width="7"/><rect x="136" y="263" width="51" height="42" rx="7" fill="#151d29" stroke="#f5c870" stroke-width="5"/><circle cx="161" cy="284" r="11" fill="#51d9de" stroke="#e7fcff" stroke-width="3"/>',
    helmet: '<path d="M77 157q-13-103 84-110 97 4 83 110l-23-10q-15-48-60-51-50 1-63 51z" fill="#142331" stroke="#62dce2" stroke-width="6"/><path d="M97 130q61-27 128-1l-4 20q-59-17-120 3z" fill="#e96d82"/><path d="M83 164h23m129 0h22" stroke="#f3d37b" stroke-width="8" stroke-linecap="round"/>',
    biker: '<path d="M94 129q78 38 152-1l7 28q-79 42-164 0z" fill="#c64063" stroke="#f0cb77" stroke-width="3"/><path d="M220 146l43 37-8-44" fill="#9e2e50"/><path d="M118 251l42 18 42-18" fill="none" stroke="#e8c16d" stroke-width="6"/><circle cx="160" cy="271" r="9" fill="#f3d889"/>',
  };
  const scenes = {
    vice: '<circle cx="259" cy="75" r="40" fill="#ffce83" opacity=".72"/><path d="M0 214q79-37 160 0t160 0v106H0z" fill="#16394d" opacity=".55"/><path d="M33 214q8-57 11-76m0 16q-22-21-35-19m35 19q18-26 36-28m-47 17q-16-3-27 5m275 66q8-48 7-70m0 17q-20-20-31-17m31 17q17-23 32-26" fill="none" stroke="#102337" stroke-linecap="round" stroke-width="6"/>',
    liberty: '<path d="M0 194h320v126H0z" fill="#111b2a" opacity=".55"/><path d="M8 195v-51h39v51m9 0V91h53v104m8 0v-72h31v72m12 0V67h64v128m9 0v-89h37v89m8 0v-48h39v48" fill="#172438" stroke="#81c8d4" stroke-opacity=".37" stroke-width="2"/><path d="M22 160h7m20 0h7m64-21h8m-8 25h8m63-72h8m19 0h8m-35 29h8m30 0h8m30 3h8m-8 24h8" stroke="#f5c66f" stroke-width="4"/>',
    san: '<circle cx="259" cy="77" r="40" fill="#ffb95f" opacity=".7"/><path d="M0 226h320v94H0z" fill="#182c2b" opacity=".6"/><path d="M0 256h320M0 281h320" stroke="#f4c769" stroke-opacity=".55" stroke-width="3"/><path d="M26 226v-28h55v28m8 0v-45h65v45m21 0v-34h49v34m21 0v-55h50v55" fill="#1c3632" stroke="#d8a16b" stroke-opacity=".45" stroke-width="2"/>',
    'los-santos': '<circle cx="259" cy="74" r="39" fill="#ffd281" opacity=".68"/><path d="M0 217h320v103H0z" fill="#142d43" opacity=".62"/><path d="M14 217v-70h41v70m12 0V102h50v115m10 0v-56h45v56m12 0V81h61v136m8 0v-95h50v95" fill="#183045" stroke="#97d9e6" stroke-opacity=".45" stroke-width="2"/><path d="M0 259h320" stroke="#f6a562" stroke-opacity=".68" stroke-width="3"/>',
    nightclub: '<path d="M0 205h320v115H0z" fill="#11182a" opacity=".7"/><path d="M29 206V86m44 120V122m44 84V67m44 139V97m44 109V75m44 131V119m44 87V91" stroke="#f16bb4" stroke-opacity=".38" stroke-width="5"/><path d="M0 228l320-86M0 163l320 70" stroke="#5ce1ea" stroke-opacity=".32" stroke-width="3"/>',
    chinatown: '<path d="M0 204h320v116H0z" fill="#152132" opacity=".62"/><path d="M13 204v-91h57v91m8 0V75h70v129m9 0V116h43v88m8 0V61h72v143m9 0v-99h30v99" fill="#20253a" stroke="#f0b85e" stroke-opacity=".45" stroke-width="2"/><path d="M27 118h30m-30 19h30m46-46h40m-40 21h40m91-35h35m-35 21h35" stroke="#ed6c69" stroke-width="4"/>',
    leonida: '<circle cx="259" cy="76" r="40" fill="#ffd786" opacity=".72"/><path d="M0 211q79-31 160 0t160 0v109H0z" fill="#174952" opacity=".62"/><path d="M28 213q10-60 13-90m0 23q-20-17-33-14m33 14q18-24 35-25m193 92q8-50 8-75m0 18q-19-19-31-16m31 16q16-23 33-26" fill="none" stroke="#112b38" stroke-linecap="round" stroke-width="6"/><path d="M0 264q68-23 136 0t184 0" fill="none" stroke="#75d9d3" stroke-opacity=".55" stroke-width="4"/>',
    docks: '<path d="M0 212h320v108H0z" fill="#111d2a" opacity=".68"/><path d="M14 212v-89h45v89m11 0V87h64v125m13 0v-50h47v50m12 0V71h67v141m10 0v-93h37v93" fill="#1b2935" stroke="#e88179" stroke-opacity=".4" stroke-width="2"/><path d="M0 239h320M31 239v23m71-23v23m93-23v23m76-23v23" stroke="#e8b766" stroke-opacity=".55" stroke-width="3"/>',
    retro: '<path d="M0 212h320v108H0z" fill="#1b2235" opacity=".64"/><path d="M25 211v-66h51v66m9 0v-91h67v91m10 0v-54h40v54m12 0V87h72v124" fill="#272948" stroke="#81d4df" stroke-opacity=".38" stroke-width="2"/><path d="M25 158h51m34-18h67m47-18h72" stroke="#f18dc0" stroke-width="4"/>',
  };
  const scene = scenes[p.scene] || '';
  const jacket = `<path d="M60 320q8-80 98-91l-25 42 27 21 27-21-25-42q92 9 102 91z" fill="${p.jacket}"/><path d="M133 238l27 53 27-53m-28 54v28m-57-74l20 12m98-12l-20 12" fill="none" stroke="#e5c374" stroke-opacity=".74" stroke-width="4" stroke-linejoin="round"/><path d="M84 282h14v13H84zm138 0h14v13h-14z" fill="#111d2a" stroke="#f1c56d" stroke-width="2"/>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 320" role="img" aria-labelledby="title"><title id="title">${escapeXml(p.label)} — original GameVault GTA-world player avatar</title><defs><linearGradient id="bg" x2=".9" y2="1"><stop stop-color="${bgA}"/><stop offset="1" stop-color="${bgB}"/></linearGradient><radialGradient id="light"><stop stop-color="#fff" stop-opacity=".2"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient></defs><rect width="320" height="320" rx="74" fill="url(#bg)"/>${scene}<circle cx="246" cy="72" r="106" fill="url(#light)"/><path d="M0 255Q87 210 175 255t145-5v70H0z" fill="#06111b" opacity=".36"/><path d="M25 54h270M25 264h270" stroke="#fff" stroke-opacity=".13" stroke-width="2"/><path d="M60 320q7-82 98-91 99 6 106 91z" fill="${p.shirt}"/>${jacket}<path d="M133 214h55v42q-24 24-55 0z" fill="${p.skin}"/><path d="M127 240l33 29 33-29" fill="none" stroke="#f7d17b" stroke-opacity=".8" stroke-width="5"/><ellipse cx="160" cy="151" rx="78" ry="96" fill="${p.skin}"/>${hairShape(p.style,p.hair)}<path d="M123 165q15-10 29 0m23 0q15-10 29 0" fill="none" stroke="#32232d" stroke-width="5" stroke-linecap="round"/><circle cx="138" cy="176" r="4.5" fill="#17212b"/><circle cx="193" cy="176" r="4.5" fill="#17212b"/><path d="M163 181l-7 22 10 2m-27 17q22 14 43 0" fill="none" stroke="#804a42" stroke-width="4" stroke-linecap="round"/>${accessories[p.accessory] || ''}<rect x="37" y="273" width="246" height="24" rx="12" fill="#09131e" fill-opacity=".78" stroke="#fff" stroke-opacity=".18"/><text x="160" y="289" text-anchor="middle" fill="#fff" font-family="Arial,sans-serif" font-size="10" font-weight="700" letter-spacing="1.2">${escapeXml(p.setting)}</text><path d="M35 309h66m118 0h66" stroke="#f4d07b" stroke-opacity=".72" stroke-width="3"/><circle cx="49" cy="44" r="3" fill="#fff"/><circle cx="272" cy="107" r="2.5" fill="#fff"/><circle cx="46" cy="224" r="2" fill="#fff"/></svg>`;
}

for (const preset of presets) await writeFile(join(avatarsDir, `${preset.id}.svg`), avatarSvg(preset), 'utf8');
await writeFile(join(root, 'data', 'avatar-presets.json'), `${JSON.stringify(presets.map(({ id, label }) => ({ id, label, src: `/assets/avatars/${id}.svg` })), null, 2)}\n`, 'utf8');
console.log(`Generated ${games.length} original GTA catalog illustrations and ${presets.length} player avatar presets.`);
