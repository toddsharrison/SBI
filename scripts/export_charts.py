"""Utilities to export chart datasets from Microsoft SQL Server into JSON files for the static site."""
from __future__ import annotations

import json
import os
from dataclasses import dataclass
from datetime import date, datetime, time, timezone
from decimal import Decimal
from pathlib import Path
from typing import Any, Iterable

import pyodbc

ROOT = Path(__file__).resolve().parents[1]
DATA_DIR = ROOT / "src" / "data"
ENV_FILE = ROOT / ".env.local"


@dataclass
class ExportTask:
    name: str
    query: str
    output: str


# Update this mapping with the SQL views/queries that feed each chart.
EXPORT_TASKS: tuple[ExportTask, ...] = (
    # Launch Data View
    ExportTask(
        name="Launch_Data",
        query="""
        select left(Launch_Date,4) as Launch_Year,
	
        cast((case when Launch_Date not like '%Q%' and substring(Launch_Date, 10, 2) <> '' and substring(Launch_Date, 6, 3) <> '' then substring(Launch_Date, 10, 2) + '-' + substring(Launch_Date, 6, 3) + '-' + substring(Launch_Date, 1,4)
            when substring(Launch_Date, 10, 2) = '' and Launch_Date not like '%Q%' and substring(Launch_Date, 6, 3) <> '' then '01-' + substring(Launch_Date, 6, 3) + '-' + substring(Launch_Date, 1,4)
            else '01-01-' + substring(Launch_Date, 1,4) end) as date) as Formated_Date,
        
        Launch_Date, Launch_Tag, L.LV_Type, PL.Image_URL, PL.Image_File, L.Variant, LS.StateCode,
        
        case when PL.Parent_Name is null then L.LV_Type
        else PL.Parent_Name end as Parent_Name, 
        
        case when P.Latitude is not NULL then P.Latitude
        else LS.Latitude end as Latitude,
        
        case when P.Longitude is not NULL then P.Longitude
        else LS.Longitude end as Longitude,
        
        case when P.Parent_Name is not NULL then P.Parent_Name
        when LS2.Name is not NULL then LS2.Name
        else LS.Name end as Launch_Site_Name,
        
        case when LS.StateCode = 'SU' or LS.StateCode = 'RU' then 'Russia/Soviet Union'
        when LS.StateCode = 'TTPI' then 'United States'
        when LS.StateCode = 'PCZ' then 'United States'
        when LS.StateCode = 'AAT' then 'Australia'
        when LS.StateCode = 'DR' then 'Germany'
        when LS.StateCode = 'NZRD' then 'New Zealand'
        when LS.StateCode = 'UM67' then 'United States'
        when LS.StateCode in ('GUF', 'DZ') then 'France'
        when LS.StateCode = 'ESCN' then 'Spain'
        when LS.StateCode = 'PR' then 'United States'
        when LS.StateCode = 'GU' then 'United States'
        when LS.StateCode = 'BAT' then 'United Kingdom'
        when LS.StateCode = 'DD' then 'Germany'
        else C.Country_Name end as Country,
        
        case when left(L.Launch_Code,1) = 'M' then 'Military Missile'
        when left(L.Launch_Code,1) = 'O' then 'Orbital'
        when left(L.Launch_Code,1) = 'T' then 'Test Rocket'
        when left(L.Launch_Code,1) = 'A' then 'Atmospheric Rocket'
        when left(L.Launch_Code,1) = 'S' then 'Suborbital Rocket'
        when left(L.Launch_Code,1) = 'H' then 'Sounding Rocket'
        when left(L.Launch_Code,1) = 'R' then 'Reentry Test'
        when left(L.Launch_Code,1) = 'X' then 'Non-Earth Launch'
        when left(L.Launch_Code,1) = 'Y' then 'Suborbital Spaceplane'
        when left(L.Launch_Code,1) = 'D' then 'Deep Space'
        else left(L.Launch_Code,1) end as Launch_Category,
        
        case when substring(L.Launch_Code,2,1) = 'S' then 'Success'
        when substring(L.Launch_Code,2,1) = 'F' then 'Failure'
        when substring(L.Launch_Code,2,1) = 'U' then 'Unknown'
        when substring(L.Launch_Code,2,1) = 'E' then 'Pad Explosion'
        else substring(L.Launch_Code,2,1) end as Launch_Success,
        
        case when LS.StateCode in ('US', 'TTPI', 'GU', 'PR', 'UM67', 'PCZ') then 'United States'
        when LS.StateCode = 'SU' or LS.StateCode = 'RU' then 'Russia/Soviet Union'
        when LS.StateCode = 'CN' then 'China'
        when C.Relationship = 'NATO Ally' or (C.Relationship is null and LS.StateCode in ('DZ', 'DD', 'FR', 'UK', 'ESCN', 'GUF', 'DR', 'BAT')) then 'NATO Ally'
        when C.Relationship = 'Major Non-NATO Ally' then C.Relationship
        else 'Other' end as Country_Groups,
        
        case when C.COCOM_AOR is null and LS.StateCode in ('SU', 'RU', 'DD', 'FR', 'UK', 'ESCN', 'GUF', 'DR', 'BAT', 'DZ') then 'EUCOM'
        when C.COCOM_AOR is null and LS.StateCode in ('US', 'TTPI', 'GU', 'PR', 'UM67', 'PCZ') then 'NORTHCOM'
        when C.COCOM_AOR is null and LS.StateCode in ('AAT', 'NZRD') then 'INDOPACOM'
        else C.COCOM_AOR end as COCOM_AOR,
        LC.LEO_Mass/1000 as LEO_Metric_Tons, LC.SSO_Mass/1000 as SSO_Metric_Tons, --converts masses to be in metric tons
        
        case when LEO_Mass < 2000 then 'Small'
        when LEO_Mass >=2000 and LEO_Mass < 20000 then 'Medium'
        when LEO_Mass >=20000 and LEO_Mass < 50000 then 'Heavy'
        when LEO_Mass >=50000 then 'Super Heavy'
        else 'Undetermined' end as LV_Size,
        case when SL.Starlink is not null then 1 else NULL end as Starlink_Mission

        from McDowell_Launch_List as L
        left join McDowell_Launch_Sites as LS
        on LS.Site_Code = 
            case when right(L.Launch_Site,1) = '?' then left(L.Launch_Site,len(L.Launch_Site)-1)
            else L.Launch_Site end
        left join Global_Data.dbo.Countries as C
        on LS.StateCode = C.SatCatAbv
        left join (	select UCode, max(Name) as Name
                    from McDowell_Launch_Sites
                    where TStop in ('*', '-') or TStop is null
                    group by UCode) as LS2
        on LS.UCode = LS2.UCode
        left join Launcher_Capabilities as LC
        on L.LV_Type = LC.LV_Type and isnull(L.Variant, '') = isnull(LC.Variant, '')
        left join Parent_Launch_Sites as P
        on P.Site_Code = LS.Site_Code
        left join Parent_Launchers as PL
        on PL.LV_Type = L.LV_Type
        left join (select distinct left(OBJECT_ID,8) as Starlink
                    from Celestrak_SATCAT
                    where OBJECT_NAME like 'Starlink%') as SL
        on SL.Starlink = Launch_Tag
        where Launch_Date is not NULL
""",
        output="launch_data.json",
    ),
)


def load_env() -> None:
    """Populate environment variables from .env.local if they are not set."""
    if not ENV_FILE.exists():
        return

    for raw_line in ENV_FILE.read_text(encoding="utf-8").splitlines():
        line = raw_line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        os.environ.setdefault(key.strip(), value.strip())


def ensure_tasks_defined() -> None:
    if not EXPORT_TASKS:
        raise SystemExit(
            "No export tasks configured. Update EXPORT_TASKS in scripts/export_charts.py with your SQL views."
        )


def serialize_value(value: Any) -> Any:
    if isinstance(value, (datetime, date, time)):
        if isinstance(value, datetime) and value.tzinfo is None:
            value = value.replace(tzinfo=timezone.utc)
        return value.isoformat()
    if isinstance(value, Decimal):
        return float(value)
    return value


def rows_to_dicts(rows: Iterable[pyodbc.Row], columns: list[str]) -> list[dict[str, Any]]:
    records: list[dict[str, Any]] = []
    for row in rows:
        record = {}
        for column, value in zip(columns, row):
            record[column] = serialize_value(value)
        records.append(record)
    return records


def export_task(cursor: pyodbc.Cursor, task: ExportTask) -> dict[str, Any]:
    cursor.execute(task.query)
    columns = [column[0] for column in cursor.description]
    data = rows_to_dicts(cursor.fetchall(), columns)

    output_path = DATA_DIR / task.output
    output_path.parent.mkdir(parents=True, exist_ok=True)
    with output_path.open("w", encoding="utf-8") as fh:
        json.dump(data, fh, indent=2, ensure_ascii=False)
        fh.write("\n")

    return {"rows": len(data), "file": output_path.name}


def update_metadata(stats: dict[str, dict[str, Any]]) -> None:
    metadata = {
        "charts": len(stats),
        "lastUpdated": datetime.now(timezone.utc).isoformat(),
        "exports": stats,
    }
    meta_path = DATA_DIR / "last-updated.json"
    with meta_path.open("w", encoding="utf-8") as fh:
        json.dump(metadata, fh, indent=2)
        fh.write("\n")


def main() -> None:
    load_env()
    ensure_tasks_defined()

    connection_string = os.environ.get("SQLSERVER_CONNECTION_STRING")
    if not connection_string:
        raise SystemExit(
            "Missing SQLSERVER_CONNECTION_STRING environment variable."
            " Add it to .env.local or your shell session."
        )

    DATA_DIR.mkdir(parents=True, exist_ok=True)

    with pyodbc.connect(connection_string) as connection:
        cursor = connection.cursor()
        results: dict[str, dict[str, Any]] = {}
        for task in EXPORT_TASKS:
            results[task.name] = export_task(cursor, task)

    update_metadata(results)
    print(f"Exported {len(results)} chart dataset(s) to {DATA_DIR}")


if __name__ == "__main__":
    main()
