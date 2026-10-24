import { defineConfig } from 'vite';
import { readdirSync, readFileSync } from 'node:fs';
import { relative, resolve } from 'node:path';

const root = process.cwd();
const gtaCatalog = JSON.parse(readFileSync(resolve(root, 'data/game-catalog.json'), 'utf8'));
const gtaSlugs = new Set(gtaCatalog.map((game) => game.slug));

function collectHtml(directory) {
  const relativeDirectory = relative(root, directory).replaceAll('\\', '/');
  const isGamesDirectory = relativeDirectory === 'games';
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    if (entry.name === 'node_modules' || entry.name === 'dist' || entry.name === 'build-check' || entry.name === 'legacy-preview.html' || entry.name.startsWith('.')) return [];
    if (isGamesDirectory && entry.isDirectory() && entry.name !== 'library' && !gtaSlugs.has(entry.name)) return [];
    const absolute = resolve(directory, entry.name);
    if (entry.isDirectory()) return collectHtml(absolute);
    return entry.isFile() && entry.name.endsWith('.html') ? [absolute] : [];
  });
}
const pages = collectHtml(root);

export default defineConfig({
  // Keep local development at the origin root. GitHub Pages project sites live
  // below /<repository>/, so CI supplies the matching base path for production.
  base: process.env.GAMEVAULT_PAGES_BASE || '/',
  appType: 'mpa',
  optimizeDeps: {
    // Keep Supabase's ESM packages native in dev mode. This avoids Vite's
    // Windows dependency scan walking outside this workspace on restricted
    // machines; the production build still bundles these packages normally.
    exclude: ['@supabase/supabase-js','@supabase/auth-js','@supabase/functions-js','@supabase/realtime-js','@supabase/postgrest-js','@supabase/storage-js'],
  },
  plugins: [{
    name: 'gamevault-gta-only-routes',
    configureServer(server) {
      server.middlewares.use((request, response, next) => {
        let pathname;
        try {
          pathname = new URL(request.url || '/', 'http://localhost').pathname;
        } catch {
          return next();
        }
        const match = pathname.match(/^\/games\/([^/]+)(?:\/|$)/);
        if (match && !['index.html', 'library'].includes(match[1]) && !gtaSlugs.has(decodeURIComponent(match[1]))) {
          response.statusCode = 404;
          response.setHeader('Content-Type', 'text/plain; charset=utf-8');
          response.end('GameVault only includes Grand Theft Auto game pages.');
          return;
        }
        next();
      });
    },
  }],
  build: {
    rollupOptions: { input: pages, maxParallelFileOps: 1 },
  },
});

