# GameVault

GameVault is an independent, multi-page community prototype for fans of the Grand Theft Auto series. It is built with plain HTML, CSS, and JavaScript, with Vite for local development and Supabase as an optional backend. It is not affiliated with or endorsed by Rockstar Games or Take-Two Interactive.

## Run locally

Requires Node.js 20.19 or newer.

```powershell
npm install
Copy-Item .env.example .env
```

Set `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` in `.env` using the values from your Supabase project settings. These browser-safe values are not service-role secrets. Keep service-role keys, database passwords, OAuth client secrets, and payment credentials in trusted server-side secrets only.

```powershell
npm run dev
```

Use `npm run build` to produce a production build in `dist/`. The HTML pages are separate URLs; open `/pages/home.html` for the community feed during local development.

## GitHub Pages

The workflow in `.github/workflows/pages.yml` builds the Vite site and deploys `dist/` whenever a commit reaches `main`. In the repository settings, set **Pages → Build and deployment → Source** to **GitHub Actions**. The workflow builds for the repository path `/GameVault2/`, so the project site is served at `https://elliote-the-peace-maker.github.io/GameVault2/` after its first successful deployment.

## Supabase

The versioned schema is in `supabase/migrations/`, catalog seed data is in `supabase/seed.sql`, and permission checks are in `supabase/tests/rls.sql`. Review migrations and the target project before applying them. Configure Auth providers and redirect URLs in the Supabase dashboard. Do not put secrets in browser code or commit `.env` files.

Profiles, communities, messaging, media, notifications, libraries, and other account features require a correctly configured Supabase project and appropriate policies. If configuration is missing, the interface should show the backend-not-configured state instead of presenting sample activity as real.

## Current feature limits

- The GTA catalog and its direct game pages are included in the repository.
- The subscription and add-on interface is a prototype; payment checkout and provider webhooks are not configured.
- Maps are reference features and do not connect to an official Rockstar live map or game service.
- External platform sign-in requires those providers to be configured in Supabase Auth.

## Game artwork and asset rights

Image paths and source records for the GTA catalog are listed in `data/game-image-assets.json`. Game screenshots and GTA artwork in this repository are included for this prototype with written permission still pending. They are not cleared for commercial use or redistribution. Replace them with licensed or original artwork, or obtain the required permissions, before public promotion or launch. Rockstar and Take-Two trademarks and copyrights remain with their respective owners.

The original GameVault player-avatar illustrations are fictional GTA-world-inspired roles; they do not depict official game characters or real user accounts.
