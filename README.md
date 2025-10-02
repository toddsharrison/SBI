# AEI Space Charts Static Site

This repository hosts the frontend for the AEI space charts, designed to publish as a static site on GitHub Pages while
using Microsoft SQL Server as the offline data source.

## Prerequisites
- Node.js 20 LTS (a portable build is vendored under `tools/` if you do not have Node installed globally).
- pnpm 9.x (activated via Corepack; the project pins `packageManager` accordingly).
- Python 3.10+ with the ODBC driver for SQL Server installed (needed for the refresh and export scripts).

If you want to rely on the portable Node toolchain bundled here, run the following from PowerShell before installing
dependencies:
```powershell
$node = "$PWD/tools/node-v20.16.0-win-x64"
$env:Path = "$node;" + $env:Path
& "$node/node_modules/corepack/dist/corepack.js" prepare pnpm@9.7.0 --activate
```

## Install dependencies
```powershell
pnpm install
python -m pip install -r requirements.txt
```

## Configure the SQL export
1. Copy `.env.local.example` to `.env.local` and set `SQLSERVER_CONNECTION_STRING`.
2. Update `scripts/export_charts.py` so `EXPORT_TASKS` reflects the SQL views/queries and JSON filenames for your charts.
3. Ensure the SQL login used in the connection string can access the views required for the charts you are exporting.

## Refresh workflow
Run the combined updater to pull new source data into SQL Server and immediately regenerate the JSON snapshots for the
site:
```powershell
python scripts/run_full_refresh.py
```
- The script executes `scripts/space_data_update.py` (your existing loader) to populate the SQL database.
- After the database refresh succeeds, it runs `scripts/export_charts.py` to dump JSON into `src/data/` and update
  `src/data/last-updated.json`.

You can also run the export by itself if the database is already up-to-date:
```powershell
python scripts/export_charts.py
```

## Local development commands
```powershell
pnpm run dev       # starts Vite dev server with hot reload
pnpm run build     # creates production bundle in dist/
pnpm run preview   # serves the production bundle locally
```

## Repository layout snapshot
```
.
├── index.html              # Vite entry HTML
├── package.json            # pnpm + Vite configuration
├── public/                 # Static assets served verbatim
├── requirements.txt        # Python dependencies for refresh + export scripts
├── scripts/
│   ├── export_charts.py    # Pulls SQL Server data into src/data/
│   ├── run_full_refresh.py # Runs SQL refresh then JSON export in one command
│   └── space_data_update.py # Your upstream data loader (renamed)
├── src/
│   ├── App.jsx             # Root React component
│   ├── main.jsx            # React/Vite bootstrap
│   ├── data/               # JSON exports committed to the repo
│   ├── charts/             # Reusable chart components (placeholder)
│   ├── pages/              # Routed pages (placeholder)
│   └── styles/             # Global styles
├── tools/                  # Portable Node.js runtime (optional helper)
└── .env.local.example      # Connection string template for export script
```

## Next steps
- Replace the placeholder export tasks with your actual SQL view queries and verify the JSON outputs.
- Build your first chart component using the exported JSON data and wire it to a page.
- Set up the GitHub Actions workflow that publishes to GitHub Pages.