# SBI Calculator - Architecture

This site is a single-page, client-only calculator built with Vite and React. All math runs in the browser; there is no runtime database or API calls.

## Goals
- Keep everything static and client-side (no servers, queues, or hosted databases).
- Allow users to tweak assumptions and see results instantly.
- Publish to GitHub Pages from the main branch via a simple build-and-deploy workflow.

## Overview
```
User browser (React + Vite build)
  |
  |- Reads static assets from /public (favicon, header image)
  |- Executes calculator logic in src/App.jsx (no network calls)
  \- Optional: provides PNG/XLSX downloads using html-to-image + xlsx
```

## Key Components
- Calculator UI: `src/App.jsx` renders the inputs, runs the calculations, and shows results/charts. It is the only React component in the app today.
- Styling: `src/styles/base.css` provides all layout and theme rules.
- Client-side utilities: `html-to-image` and `xlsx` power the PNG and XLSX download buttons.
- Assets: `public/` holds the favicon and header image referenced by the app.
- Optional data-export scripts: `scripts/export_charts.py` can pull SQL Server data into `src/data/`, but the calculator does not read these files. Treat this as a future expansion path rather than a runtime dependency.

## Data Flow
- User inputs -> in-browser calculations -> rendered results.
- No fetch requests, APIs, or SQL queries run by the site. Any SQL references are confined to the optional export script.

## Deployment
- GitHub Actions workflow in `.github/workflows/deploy.yml` runs `pnpm install` and `pnpm run build`, then publishes the static `dist/` bundle to GitHub Pages.
- `vite.config.js` sets the `base` path to `/SBI/` for Pages hosting.

## Repository Layout (actual)
```
.
|-- index.html              # Vite entry
|-- package.json / pnpm-lock.yaml
|-- src/
|   |-- App.jsx             # Calculator logic + UI
|   |-- main.jsx            # React bootstrap
|   |-- styles/base.css     # Global styles
|   `-- data/last-updated.json (not consumed by the app)
|-- public/                 # Static assets (favicon, header image)
|-- scripts/export_charts.py # Optional SQL->JSON exporter (unused by the app)
|-- docs/                   # Documentation (this file, etc.)
`-- .github/workflows/deploy.yml
```

## Local Development
1. Install Node.js 20 LTS (or use the bundled portable Node in `tools/`) and pnpm 9.
2. Run `pnpm install`, then `pnpm run dev` for hot reload.
3. Build with `pnpm run build`; preview with `pnpm run preview`.
4. If you want to experiment with the SQL export script, add `SQLSERVER_CONNECTION_STRING` to `.env.local` and run `python scripts/export_charts.py`—but remember the React app does not currently consume the outputs.

## Notes and Future Extensions
- If you later add data-driven charts, wire them to JSON in `src/data/` and document the inputs clearly.
- Keep secrets out of the repo; `.env.local.example` shows the expected shape for the export script only.
