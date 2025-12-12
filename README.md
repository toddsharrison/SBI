# AEI Space Charts Static Site

This repository hosts the frontend for the SBI Calculator. It is a single-page, client-only Vite + React app published as a static site on GitHub Pages.

## Prerequisites
- Node.js 20 LTS (a portable build is vendored under `tools/` if you do not have Node installed globally).
- pnpm 9.x (activated via Corepack; the project pins `packageManager` accordingly).
- Python 3.10+ is optional and only needed if you run the SQL export scripts.

If you want to rely on the portable Node toolchain bundled here, run the following from PowerShell before installing dependencies:
```powershell
$node = "$PWD/tools/node-v20.16.0-win-x64"
$env:Path = "$node;" + $env:Path
& "$node/node_modules/corepack/dist/corepack.js" prepare pnpm@9.7.0 --activate
```

## Install dependencies
```powershell
pnpm install
```
If you plan to run the optional SQL export script, also install the Python deps:
```powershell
python -m pip install -r requirements.txt
```

## Refresh workflow (optional, for SQL exports)
The calculator does not query SQL at runtime. If you want to regenerate JSON snapshots from SQL Server, run:
```powershell
python scripts/run_full_refresh.py
```
- Runs `scripts/space_data_update.py` to populate the SQL database.
- Runs `scripts/export_charts.py` to dump JSON into `src/data/` and update `src/data/last-updated.json`.

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

## Trade-off explorer downloads
- The chart includes XLSX and PNG export buttons. The PNG capture relies on `html-to-image`, so the on-screen styling is preserved in the download.
- Key stroke/fill/font values are applied inline in `src/App.jsx` to ensure the PNG export does not lose CSS styling. Update both the CSS and those inline attributes when adjusting the chart theme.
- The download row spans the full width of `.chart-controls` via `.chart-field--downloads`. Tweak that class or `.chart-download-buttons` if you want different button layout rules down the line.

## Repository layout snapshot
```
.
|-- index.html              # Vite entry HTML
|-- package.json            # pnpm + Vite configuration
|-- public/                 # Static assets served verbatim
|-- requirements.txt        # Python dependencies for optional refresh/export scripts
|-- scripts/
|   |-- export_charts.py    # Optional: pull SQL Server data into src/data/
|   |-- run_full_refresh.py # Optional: runs SQL refresh then JSON export in one command
|   `-- space_data_update.py # Optional: your upstream data loader
|-- src/
|   |-- App.jsx             # Root React component (calculator + charts)
|   |-- main.jsx            # React/Vite bootstrap
|   |-- data/               # JSON exports (not consumed by the current app)
|   `-- styles/             # Global styles
|-- tools/                  # Portable Node.js runtime (optional helper)
`-- .env.local.example      # Connection string template for export script
```
