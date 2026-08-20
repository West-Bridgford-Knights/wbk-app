# West Bridgford Knights — Team App

A Vite + React + Tailwind app for squad availability, fixtures, lineups, results,
ratings and analysis. Ships as a static site — free to host on GitHub Pages.

## Run locally

```
npm install
npm run dev
```

## Supabase setup

1. Create a Supabase project at [supabase.com](https://supabase.com/).
2. Open **SQL Editor**, paste the contents of `supabase/schema.sql`, and run it.
3. Paste and run `supabase/seed.sql` to load the supplied squad and fixtures. This
   script clears existing team data first.
4. Copy `.env.example` to `.env.local` and fill in the project's URL and anon key
   from **Project Settings -> API**.
5. Restart `npm run dev`.

For GitHub Pages, add repository secrets under **Settings -> Secrets and variables
-> Actions** with the names `SUPABASE_URL` and `SUPABASE_ANON_KEY`. The deployment
workflow maps those secrets to Vite's `VITE_SUPABASE_URL` and
`VITE_SUPABASE_ANON_KEY` variables during the build.

The anon key is intended for browser use. The SQL policies currently allow anyone
with the app URL to read and write this single-team dataset. Add Supabase Auth and
team-scoped row-level security before using this publicly with sensitive data.

## Deploy to GitHub Pages (automatic)

1. Create a new **public** repo on GitHub (e.g. `wbk-app`) and push this folder to it.
2. In the repo, go to **Settings → Pages** and set **Source** to **GitHub Actions**.
3. Push to `main` — the included workflow (`.github/workflows/deploy.yml`) builds the
   app and publishes it automatically. Check the **Actions** tab for progress.
4. Your site will be live at `https://<your-username>.github.io/<repo-name>/`.

No further config needed — `vite.config.js` uses a relative base path so it works
under any repo name or sub-path automatically.

## Notes

- Players, fixtures, results, lineups and availability are stored in Supabase.
- The app no longer reads or writes browser local storage.
