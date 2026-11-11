# Digitas Connect Prototype

Clickable prototype of **Digitas Connect** (for prospective clients) and **Digitas Connect Studio** (for Digitas and Groupe employees), built for the BUS 365 Digitas case competition, Fall 2026.

Live site: https://onleeoperation.github.io/digitas-deliverable-folder/

Everything is scripted from one shared database. No language model, no network calls, no dependencies. Leads and referrals are saved only in the visitor's browser.

## Run it

Open `index.html` in a browser (double-click works), or serve the folder with any static server.

## Layout

| Path | What it is |
| --- | --- |
| `index.html` | The single page. Screens are rendered by `js/app.js`. |
| `css/styles.css` | All styling, with colors as tokens. |
| `js/app.js` | Routing, screens and events. |
| `js/calc.js` | Pure math (hidden costs, budget, ROI). Also runs in Node. |
| `js/star.js` | The one star renderer used on every screen. |
| `js/db.js` | **Generated** from `data/database.json`. Do not edit by hand. |
| `data/database.json` | **Source of truth** for all content and numbers. |
| `data/csv/` | **Generated** CSV exports of each table. |
| `tests/` | Calculation, integrity and smoke tests (plain Node, no packages). |
| `tools/build-db.js` | Validates the database and regenerates `js/db.js` and `data/csv/`. |
| `tools/screenshots.sh` | Backup screenshots of every screen (needs Google Chrome). |

## Change the data

Edit `data/database.json`, then rebuild and test:

```
npm run check
```

This validates the database, regenerates `js/db.js` and `data/csv/`, and runs the tests. Commit the regenerated files with the change.

## Deploy

Pushing to `main` deploys to GitHub Pages through `.github/workflows/pages.yml`. Only `index.html`, `css/`, `js/` and `data/` are published. In the repository settings, Pages must use **Source: GitHub Actions**. A deploy can take a few minutes when GitHub is busy.
