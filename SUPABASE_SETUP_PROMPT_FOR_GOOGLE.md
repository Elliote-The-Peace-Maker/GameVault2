# Prompt for Google Gemini: safely connect GameVault to Supabase

Copy the prompt below into Google Gemini. If Gemini cannot access the local project, attach or paste the named project files when asked. Never paste private keys into a chat.

---

I need beginner-friendly help connecting my existing **GameVault** website to a Supabase project that I own. Inspect the project first and guide me through the existing design. Do not replace it with a different framework or invent a new schema.

**Project folder:** `C:\Users\tloul\Documents\Codex\2026-10-14\is-x20\outputs`

**Application:** plain HTML, CSS, JavaScript, and Vite. It is a multi-page website for the Grand Theft Auto community. Do not convert it to React.

Before giving steps, inspect these files in order:

- `.env.example`, `README.md`, `package.json`, `js/config.js`, and `js/services/supabase.js`
- `supabase/config.toml`
- Every SQL file in `supabase/migrations/`, in filename order, including `202610230001_gamevault_gta_catalog_and_themes.sql`
- `supabase/seed.sql` and `supabase/tests/rls.sql`
- `supabase/functions/` and the data-backed page modules under `js/pages/`

The app accepts only these browser environment settings:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY`

Use the public publishable key (or legacy public anon key) in the local Vite environment. Never request, expose, or paste a service-role key, database password, access token, or OpenAI API key into chat, browser code, `.env`, HTML, or a public repository. Private credentials belong only in provider-side secret storage.

The repository has a curated GTA catalog and versioned migrations. Confirm what exists before recommending any change. Do not drop or reset a production database, create duplicate tables, weaken Row Level Security, seed fake users or activity, or say the app is connected before verifying it with the owner's own Supabase project.

Guide me through:

1. Creating or choosing a Supabase project I control, and finding its project URL and publishable key.
2. Copying `.env.example` to `.env` in PowerShell and entering only the project URL and public key. Do not ask me to paste either key into chat.
3. Applying every existing migration in filename order, including the GameVault GTA-only catalog/theme migration. Explain the safe next step if any migration fails; do not suggest resetting or deleting production data.
4. Running `supabase/seed.sql` only after migrations. It contains GTA catalog/platform entries, not users or sample activity. The curated list has 19 GTA games, expansions, and collections rather than unrelated games.
5. Setting Supabase Auth Site URL and password-reset redirect URL for the actual local Vite address; production URLs should be added only after a production domain exists.
6. Understanding optional Edge Functions. The delete-account function requires a server-side service-role secret; the optional Vault Guide chat function requires `OPENAI_API_KEY` and may use `VEXRA_CHAT_MODEL` as server-side Edge Function secrets. Never expose those in the browser.
7. Starting and building the existing app using commands in `package.json`.
8. Verifying signup and email verification, login, profile editing, selecting a GTA game, loading its title page, and reading/writing the signed-in account's library.
9. Checking that a second account cannot read or edit another account's private data, using the existing RLS tests where possible.

For every action, say whether it is a Supabase Dashboard step or a PowerShell command. Do not assume you can access my Google, Supabase, or local computer accounts. If a policy, table, bucket, or function is missing or inconsistent, identify the exact file and evidence first. Propose the smallest versioned SQL migration or configuration adjustment and explain its effect before telling me to apply it.

Start with a short summary of what the project files confirm. Then give me only the first setup step and wait for me to finish it before moving on. Distinguish local preview behavior from features actually verified against my Supabase project.

---

**Security reminder:** only the Supabase URL and publishable key belong in the local Vite `.env`. Never share private keys through Gemini or Codex. If a private key was exposed, rotate it in the provider dashboard.
