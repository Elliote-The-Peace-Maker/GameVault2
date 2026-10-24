import { readdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const dist = resolve('dist');
const basePath = process.env.GAMEVAULT_PAGES_BASE;

if (!basePath || !/^\/[a-z0-9._-]+\/$/i.test(basePath)) {
  throw new Error('Set GAMEVAULT_PAGES_BASE to a repository path such as /GameVault2/.');
}

const repoPath = basePath.slice(1, -1).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const outputEntries = await readdir(dist, { withFileTypes: true });
const rootPaths = outputEntries
  .filter((entry) => entry.isDirectory() || (entry.isFile() && entry.name.endsWith('.html')))
  .map((entry) => entry.name.replace(/\.html$/, ''))
  .filter((name) => name !== repoPath)
  .sort((a, b) => b.length - a.length)
  .map((name) => name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));

if (!rootPaths.length) throw new Error('No built application routes were found in dist/.');

const routeAlternation = rootPaths.join('|');
const appPath = new RegExp(
  '((?:["\'`])|(?:url\\(\\s*["\']?))/((?!(?:' + repoPath + ')(?:/|$))(?:' + routeAlternation + '))(?=/|[?#"\'`\\s)]|$)',
  'g',
);

async function rewriteDirectory(directory) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = resolve(directory, entry.name);
    if (entry.isDirectory()) {
      await rewriteDirectory(path);
      continue;
    }
    if (!entry.isFile() || !/\.(?:html|js|css|svg|json|xml|webmanifest)$/.test(entry.name)) continue;

    let contents = await readFile(path, 'utf8');
    contents = contents.replace(appPath, (_match, lead, route) => `${lead}/${repoPath}/${route}`);
    if (entry.name.endsWith('.html')) {
      contents = contents.replace(/(\b(?:href|src|action)\s*=\s*["'])\/(["'])/gi, (_match, lead, quote) => `${lead}${repoPath}/${quote}`);
    }
    await writeFile(path, contents, 'utf8');
  }
}

await rewriteDirectory(dist);
console.log(`Rebased built app routes for ${basePath}`);
