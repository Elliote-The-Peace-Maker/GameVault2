import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';

const root = process.cwd();
const sourcePath = join(root, 'data', 'game-image-assets.json');
const assets = JSON.parse(await readFile(sourcePath, 'utf8'));
const gamesPath = join(root, 'data', 'game-catalog.json');
const games = JSON.parse(await readFile(gamesPath, 'utf8'));
const bySlug = new Map(assets.map((asset) => [asset.slug, asset]));
const pathsBySlug = new Map(assets.map((asset) => [asset.slug, asset.image_path]));

function collage(asset) {
  const refs = asset.composite_of.map((slug) => pathsBySlug.get(slug));
  if (refs.some((path) => !path)) throw new Error(`Missing collage source for ${asset.slug}`);
  if (asset.slug === 'grand-theft-auto-the-trilogy-definitive-edition') {
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1600 900" role="img" aria-labelledby="title desc"><title id="title">GTA Trilogy gameplay collage</title><desc id="desc">Gameplay stills from Grand Theft Auto III, Vice City, and San Andreas. Local prototype collage.</desc><image href="${refs[2]}" width="1600" height="900" preserveAspectRatio="xMidYMid slice"/><rect width="1600" height="900" fill="#07101b" opacity=".16"/><g stroke="#090d16" stroke-width="12"><image href="${refs[0]}" x="42" y="520" width="500" height="281" preserveAspectRatio="xMidYMid slice"/><image href="${refs[1]}" x="558" y="520" width="500" height="281" preserveAspectRatio="xMidYMid slice"/></g><rect x="42" y="520" width="500" height="281" fill="none" stroke="#f1c879" stroke-width="5"/><rect x="558" y="520" width="500" height="281" fill="none" stroke="#62dbe5" stroke-width="5"/><path d="M42 826h1016" stroke="#ed5e9a" stroke-width="7"/></svg>`;
  }
  if (asset.slug === 'grand-theft-auto-episodes-from-liberty-city') {
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1600 900" role="img" aria-labelledby="title desc"><title id="title">Episodes from Liberty City gameplay collage</title><desc id="desc">Gameplay stills from The Lost and Damned and The Ballad of Gay Tony. Local prototype collage.</desc><image href="${refs[0]}" width="1600" height="900" preserveAspectRatio="xMidYMid slice"/><rect width="1600" height="900" fill="#07101b" opacity=".23"/><image href="${refs[1]}" x="830" y="486" width="720" height="405" preserveAspectRatio="xMidYMid slice"/><rect x="830" y="486" width="720" height="405" fill="none" stroke="#efbf6f" stroke-width="7"/></svg>`;
  }
  throw new Error(`No collage layout is defined for ${asset.slug}`);
}

for (const asset of assets) {
  const target = join(root, 'public', asset.image_path.replace(/^\//, ''));
  await mkdir(dirname(target), { recursive: true });
  if (asset.composite_of) {
    await writeFile(target, collage(asset), 'utf8');
    continue;
  }
  if (asset.slug === 'grand-theft-auto-vi') continue;
  const response = await fetch(asset.source_url, { headers: { 'User-Agent': 'GameVault local prototype asset importer' } });
  if (!response.ok) throw new Error(`Image download failed (${response.status}) for ${asset.slug}`);
  const type = response.headers.get('content-type') || '';
  if (!type.startsWith('image/')) throw new Error(`Unexpected response type for ${asset.slug}: ${type}`);
  await writeFile(target, Buffer.from(await response.arrayBuffer()));
}

for (const game of games) {
  const asset = bySlug.get(game.slug);
  if (!asset) throw new Error(`No real game image is registered for ${game.slug}`);
  game.game_image_path = asset.image_path;
  game.game_image_type = asset.type;
  game.game_image_rights_status = asset.rights_status;
}
await writeFile(gamesPath, `${JSON.stringify(games, null, 2)}\n`, 'utf8');

const rightsPath = join(root, 'data', 'media-assets.json');
const rights = JSON.parse(await readFile(rightsPath, 'utf8'));
rights.assets = rights.assets.filter((asset) => asset.id !== 'gta-title-real-game-imagery');
rights.assets.push({
  id: 'gta-title-real-game-imagery',
  source_manifest: '/data/game-image-assets.json',
  count: assets.length,
  rights_status: 'pending-written-permission',
  prototype_only: true,
  public_release_allowed: false,
  description: 'Locally cached GTA gameplay screenshots and the GTA VI cover, with source pages recorded per title. These are real Rockstar game visuals; local use in this prototype does not grant GameVault publication rights.',
});
await writeFile(rightsPath, `${JSON.stringify(rights, null, 2)}\n`, 'utf8');

console.log(`Imported ${assets.length} real GTA title images and updated the catalog paths.`);
