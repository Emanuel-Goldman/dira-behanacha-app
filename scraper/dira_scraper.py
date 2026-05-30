"""
Periodically fetches the list of open lotteries from dira.moch.gov.il and
writes the combined result to public/data.json. The React frontend reads that
file directly, sidestepping the browser-level CORS problem with the upstream
API (which sends `Access-Control-Allow-Origin: *` twice and is rejected by
browsers).

Usage:
    python dira_scraper.py             # run forever, refresh every hour
    python dira_scraper.py --once      # fetch a single time and exit
    python dira_scraper.py --interval 600   # custom interval in seconds
"""

from __future__ import annotations

import argparse
import json
import sys
import time
from datetime import datetime, timezone
from pathlib import Path

import requests

API_URL = "https://dira.moch.gov.il/api/Invoker"
PAGE_SIZE = 50

# `ProjectStatus=4` is the SPA's "open for registration" filter; with
# `Entitlement=1` and the empty applicant IDs this returns every currently
# open lottery (around 80-100 at a time, fitting in two pages of 50).
DEFAULT_SEARCH = {
    "firstApplicantIdentityNumber": "",
    "secondApplicantIdentityNumber": "",
    "ProjectStatus": 4,
    "Entitlement": 1,
}

REPO_ROOT = Path(__file__).resolve().parent.parent
OUTPUT_PATH = REPO_ROOT / "public" / "data.json"

REQUEST_HEADERS = {
    "Accept": "application/json",
    # Pretend to be a regular browser. The upstream WAF sometimes returns
    # blank or 4xx responses to obviously non-browser clients.
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
        "(KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36"
    ),
}


def _build_inner_query(params: dict) -> str:
    """Mirrors the SPA's `convertJsonToUri`: '?k1=v1&k2=v2&'."""
    parts = [f"{key}={'' if value is None else value}" for key, value in params.items()]
    return "?" + "&".join(parts) + "&"


def fetch_page(page_number: int, *, session: requests.Session) -> dict:
    inner = _build_inner_query(
        {
            **DEFAULT_SEARCH,
            "IsInit": "true" if page_number == 1 else "false",
            "PageNumber": page_number,
            "PageSize": PAGE_SIZE,
        }
    )
    response = session.get(
        API_URL,
        params={"method": "Projects", "param": inner},
        headers=REQUEST_HEADERS,
        timeout=30,
    )
    response.raise_for_status()
    return response.json()


def fetch_open_lotteries() -> dict:
    with requests.Session() as session:
        page1 = fetch_page(1, session=session)
        page2 = fetch_page(2, session=session)

    items = list(page1.get("ProjectItems") or [])
    items.extend(page2.get("ProjectItems") or [])

    return {
        "items": items,
        "totalRecords": page1.get("NumOfRecords", len(items)),
        "openLotteriesCount": page1.get("OpenLotteriesCount", len(items)),
        "fetchedAt": datetime.now(timezone.utc).isoformat(),
    }


def write_data(data: dict, output_path: Path = OUTPUT_PATH) -> None:
    output_path.parent.mkdir(parents=True, exist_ok=True)
    # Write to a temp file then atomically replace, so the React app never
    # sees a half-written JSON file mid-fetch.
    tmp_path = output_path.with_suffix(output_path.suffix + ".tmp")
    tmp_path.write_text(
        json.dumps(data, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )
    tmp_path.replace(output_path)


def run_once() -> dict:
    data = fetch_open_lotteries()
    write_data(data)
    print(
        f"[{data['fetchedAt']}] wrote {len(data['items'])} lotteries "
        f"({data['totalRecords']} reported total) to {OUTPUT_PATH}",
        flush=True,
    )
    return data


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Fetch dira.moch.gov.il open lotteries.")
    parser.add_argument(
        "--once",
        action="store_true",
        help="Run a single fetch and exit (use with cron/systemd timers).",
    )
    parser.add_argument(
        "--interval",
        type=int,
        default=60 * 60,
        help="Seconds between runs in loop mode (default: 3600 = 1 hour).",
    )
    args = parser.parse_args(argv)

    if args.once:
        try:
            run_once()
        except Exception as exc:
            print(f"[error] {exc}", file=sys.stderr, flush=True)
            return 1
        return 0

    print(
        f"Starting loop, refreshing every {args.interval}s. Ctrl+C to stop.",
        flush=True,
    )
    while True:
        try:
            run_once()
        except KeyboardInterrupt:
            print("Stopped.", flush=True)
            return 0
        except Exception as exc:
            print(f"[error] {exc}", file=sys.stderr, flush=True)

        try:
            time.sleep(args.interval)
        except KeyboardInterrupt:
            print("Stopped.", flush=True)
            return 0


if __name__ == "__main__":
    raise SystemExit(main())
