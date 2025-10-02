"""Run the SQL refresh script and export JSON snapshots for the static site."""
from __future__ import annotations

import runpy
from pathlib import Path

from export_charts import main as export_json

ROOT = Path(__file__).resolve().parents[1]
SQL_REFRESH_SCRIPT = ROOT / "scripts" / "space_data_update.py"


def run_sql_refresh() -> None:
    if not SQL_REFRESH_SCRIPT.exists():
        raise SystemExit(
            "Expected SQL refresh script at scripts/space_data_update.py. Make sure the file is present."
        )

    print("Running SQL refresh script...")
    runpy.run_path(str(SQL_REFRESH_SCRIPT), run_name="__main__")


def main() -> None:
    run_sql_refresh()
    print("\nRefreshing JSON chart exports...")
    export_json()


if __name__ == "__main__":
    main()
