# West Bridgford Knights — Team App

A Vite + React + Tailwind app for squad availability, lineups, results, ratings,
league table and analysis. Ships as a static site — free to host on GitHub Pages.

## Run locally

```
npm install
npm run dev
```

## Deploy to GitHub Pages (automatic)

1. Create a new **public** repo on GitHub (e.g. `wbk-app`) and push this folder to it.
2. In the repo, go to **Settings → Pages** and set **Source** to **GitHub Actions**.
3. Push to `main` — the included workflow (`.github/workflows/deploy.yml`) builds the
   app and publishes it automatically. Check the **Actions** tab for progress.
4. Your site will be live at `https://<your-username>.github.io/<repo-name>/`.

No further config needed — `vite.config.js` uses a relative base path so it works
under any repo name or sub-path automatically.

## Notes

- This is a front-end-only prototype: all data (players, fixtures, results,
  availability, league table) lives in memory and resets on page reload. There's
  no login, database, or scraper yet — see the in-app note on the League Table tab.
- Next step for a "real" version with persistent data and real accounts: add
  Supabase (auth + database) and a scheduled scraper function, then point this
  same frontend at it.
