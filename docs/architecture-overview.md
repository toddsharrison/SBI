# Space Charts Site – Lightweight Architecture

This document captures a simplified plan to publish charts from your local machine to a free GitHub Pages site while keeping Microsoft SQL Server as the source of truth.

## Goals
- Keep infrastructure minimal: no cloud databases, queues, or containers.
- Author and refresh charts locally, then publish static assets to GitHub Pages.
- Use Microsoft SQL Server Express (or full SQL Server) for storage and transformation.
- Make the workflow repeatable so a single person can run it end-to-end.

## Overview
```
+------------+     query/export     +---------------------+     commit/push     +----------------+
¦ MS SQL     ¦ -------------------? ¦ Local export script ¦ ----------------? ¦ GitHub repo   ¦
¦ (local/VM) ¦                     ¦ (Python or PowerShell) ¦                 ¦ (main branch) ¦
+------------+                     +---------------------+                     +---------------+
                                                                               build¦
                                                                               ¦    ?
                                                                               +---------------+
                                                                               ¦ GitHub Pages  ¦
                                                                               ¦ (gh-pages)    ¦
                                                                               +---------------+
```

## Key Components
- **Data source:** Microsoft SQL Server Express installed locally (or on an on-prem VM). Store raw tables and any lightweight views you need for charts.
- **Export script:** A small script run on your machine that queries SQL Server and writes JSON files into `src/data/`.
  - Python option: use `pyodbc` with a DSN or connection string stored in `.env.local`.
  - PowerShell option: use `Invoke-Sqlcmd` and `ConvertTo-Json`.
  - Commit the script; keep connection secrets out of version control.
- **Static site:** Vite + React (or plain HTML + vanilla JS if you prefer) with Chart.js or Plotly for visuals.
  - Charts read the exported JSON files at build/runtime; no API layer is required.
  - Add reusable layout components for AEI branding and responsive design.
- **Hosting:** GitHub Pages serves the built site from the `gh-pages` branch.
  - A GitHub Action builds the site on each push to `main`, then publishes the build output.
  - Because Pages cannot reach your local SQL Server, the action only uses the JSON files you committed.

## Data Refresh Workflow
1. Update or ingest data in SQL Server (manually, via your existing Python loader, etc.).
2. Run the export script locally: `python scripts/export_charts.py`.
   - Script writes `src/data/<chart-name>.json` and optionally a `last-updated.json` metadata file.
3. Review generated files; add them with `git add`.
4. Run `npm run build` locally to confirm charts render with the new data.
5. Commit and push to GitHub. The GitHub Action rebuilds the site and publishes the latest charts to GitHub Pages.

## Repository Layout Suggestion
```
.
+-- package.json
+-- vite.config.ts
+-- src/
¦   +-- data/               # JSON exports committed to the repo
¦   +-- charts/             # Reusable chart components
¦   +-- pages/              # Static pages (React Router or file-based routing)
¦   +-- styles/
+-- scripts/
¦   +-- export_charts.py    # Queries SQL Server and writes JSON
+-- public/                 # Static assets (logo, favicon, etc.)
+-- .github/workflows/
    +-- deploy.yml          # Builds and publishes to gh-pages
```

## GitHub Pages Deployment
- Enable GitHub Pages for the repository and point it to the `gh-pages` branch.
- Sample GitHub Action (`deploy.yml`):
  - Trigger: `on: push` to `main`.
  - Steps: checkout code, install Node, run `npm ci`, run `npm run build`, deploy using `peaceiris/actions-gh-pages` with a deploy key or the default `GITHUB_TOKEN`.
- The build output (e.g., `dist/`) becomes the GitHub Pages site.

## Local Development Setup
1. Install prerequisites:
   - Node.js LTS
   - Python 3.x (if you use the Python export path)
   - Microsoft SQL Server Express + SQL Server Management Studio (optional)
2. Copy `.env.local.example` to `.env.local`; add your SQL Server connection string.
3. Run `npm install` then `npm run dev` for live development.
4. Run the export script whenever you change the data; use `npm run build` before pushing.

## Next Steps
1. Add the lightweight repo structure above (or adapt the existing one).
2. Create the export script and confirm it writes the JSON files you need for the first chart.
3. Build one chart page end-to-end using hard-coded JSON to validate the stack, then wire in the export script output.
4. Set up the GitHub Pages deploy workflow and verify the site publishes from `main`.
5. Document the refresh steps in the README so future updates stay consistent.
