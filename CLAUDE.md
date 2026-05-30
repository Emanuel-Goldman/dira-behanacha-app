# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this project is

A React + Vite single-page app that displays currently open "דירה בהנחה" (Dira BeHanacha) housing lotteries from the Israeli government. The UI is Hebrew RTL, plain JS (no TypeScript).

## Commands

```bash
# Frontend dev server
npm run dev

# Build + deploy to Firebase Hosting (https://dira-behanacha.web.app)
npm run deploy

# Scraper — populate public/data.json once (required before the UI shows data)
cd scraper && pip install -r requirements.txt
python dira_scraper.py --once

# Scraper — run in a loop, refreshing every hour
python dira_scraper.py

# Custom interval (seconds)
python dira_scraper.py --interval 600
```

No test suite, no linter configured.

## Architecture

The project has two independent pieces that communicate through a single file:

```
scraper/dira_scraper.py  ──writes──►  public/data.json  ◄──reads──  src/api/dira.js
```

**Why this design:** The upstream API at `dira.moch.gov.il` sends `Access-Control-Allow-Origin: *` twice in its response (once from the origin server, once from CloudFront). Browsers reject this as malformed CORS, so any direct browser fetch fails. Running the fetch server-side (Python) sidesteps the browser entirely.

**Scraper** (`scraper/dira_scraper.py`): Fetches pages 1 and 2 of `ProjectStatus=4` (open for registration) lotteries from `https://dira.moch.gov.il/api/Invoker`. Writes the merged result atomically to `public/data.json` (via temp file → rename so the frontend never reads a half-written file). Runs as a long-lived loop or as a one-shot via `--once` (suited for cron/systemd).

**Frontend** (`src/api/dira.js`): Reads `/data.json` with `cache: 'no-store'`. If the file is missing (404), it surfaces a Hebrew error message telling the user to run the scraper. `src/App.jsx` polls every hour via `setInterval` and exposes a manual refresh button.

**Firebase Hosting** (`firebase.json`): Serves `dist/` with a `**` → `/index.html` rewrite for SPA routing. Cache headers on `/assets/**` are set to immutable. `src/firebase.js` exists but is not imported anywhere in the app — it's leftover from an earlier Firebase integration attempt.

## Data contract (`public/data.json`)

The scraper writes and the frontend reads this shape:

```json
{
  "items": [ ...ProjectItems from the upstream API... ],
  "totalRecords": 82,
  "openLotteriesCount": 82,
  "fetchedAt": "2026-05-30T10:00:00+00:00"
}
```

The frontend maps `items[].CityDescription`, `NeighborhoodName`, `ContractorDescription`, `EntitlementDescription`, `ApplicationEndDate`, `LotteryApparmentsNum`, `TotalSubscribers`, `PricePerUnit`, `ProjectNumber`, and `LotteryNumber` — all raw fields from the upstream response, passed through unchanged.

## Upstream API details

- Endpoint: `GET https://dira.moch.gov.il/api/Invoker?method=Projects&param=<encoded inner query>`
- Inner query mirrors the SPA's `convertJsonToUri` helper: `?key=value&key=value&` (note trailing `&`), then percent-encoded as the `param` value.
- `ProjectStatus=4` = open for registration. `Entitlement=1` returns all open lotteries (~82) regardless of eligibility.
- Results fit in two pages of 50 (`PageNumber=1` with `IsInit=true`, then `PageNumber=2` with `IsInit=false`).
- The upstream WAF blocks obvious non-browser User-Agents — the scraper sends a Chrome UA.
