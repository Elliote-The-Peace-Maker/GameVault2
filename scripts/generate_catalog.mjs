import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const catalogPath = join(root, 'data', 'game-catalog.json');
const games = JSON.parse(readFileSync(catalogPath, 'utf8'));
const platformNames = {
  pc: 'Windows PC', ps1: 'PlayStation', ps2: 'PlayStation 2', ps3: 'PlayStation 3',
  ps4: 'PlayStation 4', ps5: 'PlayStation 5', xbox: 'Xbox Series X|S',
  xboxone: 'Xbox One', xbox360: 'Xbox 360', dreamcast: 'Dreamcast',
  gbc: 'Game Boy Color', gba: 'Game Boy Advance', psp: 'PlayStation Portable',
  ds: 'Nintendo DS', switch: 'Nintendo Switch', ios: 'iOS', android: 'Android'
};
const q = function (value) { return "'" + String(value).replaceAll("'", "''") + "'"; };
const known = new Set(games.map(function (game) { return game.slug; }));
if (known.size !== games.length) throw new Error('Duplicate GTA catalog slugs.');
for (const game of games) {
  game.franchise = 'grand-theft-auto';
  for (const platform of game.platform_slugs || []) {
    if (!platformNames[platform]) throw new Error('Unknown platform: ' + platform);
  }
}
writeFileSync(catalogPath, JSON.stringify(games, null, 2) + '\n', 'utf8');

const platformSlugs = [...new Set(games.flatMap(function (game) { return game.platform_slugs || []; }))].sort();
const lines = [
  '-- Curated GameVault GTA catalog only; this seed creates no accounts or activity.',
  'insert into public.platforms (slug, name) values'
];
platformSlugs.forEach(function (slug, index) {
  lines.push('  (' + q(slug) + ', ' + q(platformNames[slug]) + ')' +
    (index < platformSlugs.length - 1 ? ',' : ' on conflict (slug) do update set name = excluded.name;'));
});
lines.push('');
lines.push('insert into public.games (slug, title, genre, description, supported_platforms, catalog_note, is_upcoming, franchise) values');
games.forEach(function (game, index) {
  const platforms = 'array[' + (game.platform_slugs || []).map(q).join(', ') + ']::text[]';
  const description = (game.setting || 'Grand Theft Auto') + ' · ' + game.year + '. ' + game.description;
  const upcoming = game.is_upcoming ? 'true' : 'false';
  const tail = index < games.length - 1 ? ',' :
    ' on conflict (slug) do update set title=excluded.title, genre=excluded.genre, description=excluded.description, supported_platforms=excluded.supported_platforms, catalog_note=excluded.catalog_note, is_upcoming=excluded.is_upcoming, franchise=excluded.franchise;';
  lines.push('  (' + q(game.slug) + ', ' + q(game.title) + ', ' + q(game.genre) + ', ' + q(description) + ', ' +
    platforms + ', ' + q(game.catalog_note) + ', ' + upcoming + ', ' + q(game.franchise) + ')' + tail);
});
lines.push('');
lines.push('insert into public.game_platforms (game_id, platform_id)');
lines.push('select g.id, p.id from public.games g');
lines.push('cross join unnest(g.supported_platforms) as platform_slugs(slug)');
lines.push('join public.platforms p on p.slug = platform_slugs.slug');
lines.push('where g.franchise = ' + q('grand-theft-auto'));
lines.push('on conflict do nothing;');
lines.push('');
writeFileSync(join(root, 'supabase', 'seed.sql'), lines.join('\n'), 'utf8');

for (const game of games) {
  const dir = join(root, 'games', game.slug);
  mkdirSync(dir, { recursive: true });
  const title = game.title.replaceAll('&', '&amp;');
  const html = '<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><meta name="theme-color" content="#111023"><title>' +
    title + ' · GameVault</title><link rel="icon" type="image/jpeg" href="/assets/game-vault-logo.jpeg"><link rel="stylesheet" href="/css/app.css"></head><body data-route="game-detail" data-slug="' +
    game.slug + '"><div data-app-shell></div><script type="module" src="/js/pages/game-detail.js"></script></body></html>';
  writeFileSync(join(dir, 'index.html'), html, 'utf8');
}
console.log('Generated ' + games.length + ' GTA entries, ' + platformSlugs.length + ' platform tags, seed SQL, and direct title pages.');
