# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this project is

A React + Vite single-page app that displays currently open "דירה בהנחה" (Dira BeHanacha) housing lotteries from the Israeli government. The UI is Hebrew RTL, plain JS (no TypeScript).

## Commands

```bash
# Frontend dev server
npm run dev

# Build only (outputs to dist/)
npm run build

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

**Scraper** (`scraper/dira_scraper.py`): Fetches lottery pages from `https://dira.moch.gov.il/api/Invoker`, newest `ApplicationEndDate` first, and keeps paging (`IsInit` always `"true"` — see below) until a page contributes no open items, capped at `MAX_PAGES`. Writes the result atomically to `public/data.json` (via temp file → rename so the frontend never reads a half-written file). Runs as a long-lived loop or as a one-shot via `--once` (suited for cron/systemd).

**Frontend** (`src/api/dira.js`): Reads `/data.json` with `cache: 'no-store'`. If the file is missing (404), it surfaces a Hebrew error message telling the user to run the scraper. `useLotteryData` hook (`src/hooks/useLotteryData.js`) fetches on mount and polls every hour; each page mounts its own hook instance — there is no shared or cached state between routes.

## Frontend pages and routing

Routes are registered in `src/App.jsx` using React Router v6 `BrowserRouter`:

| Route | Component | Description |
|---|---|---|
| `/` | `HomePage` | City-level win probability chart + summary counts, or the between-rounds panel when no lottery is open |
| `/city/:cityName` | `CityPage` | Project-level chart for a single city |
| `/guide` | `ZkautGuide` | Static eligibility certificate guide — no data fetching |

`WinProbabilityChart` (`src/components/WinProbabilityChart.jsx`) renders the horizontal bar chart and is the one component shared by `HomePage` and `CityPage`.

`NoOpenLotteries` (`src/components/NoOpenLotteries.jsx`) is used by `HomePage` only. It replaces the chart when the fetch succeeded and returned zero open lotteries — a state the site sits in for weeks at a time between rounds, where the chart's bare "אין נתונים להצגה" made the site look broken. It explains that a gap is normal, shows `fetchedAt` as proof the data is current, and points at the two things worth doing between rounds: the eligibility guide and `/research`. `HomePage` only picks it when `!loading && !error && items.length === 0`, so a failed fetch still reads as an error and a pending one still reads as loading.

There is deliberately no countdown and no email-alert signup there: the upstream API publishes no date for the next round, and there is no backend to collect an address.

Win probability formulas (from `src/utils/winProbability.js`):
- **City view**: `sum(LotteryApparmentsNum for city) ÷ max(TotalSubscribers in city) × 100`
- **Project view**: `LotteryApparmentsNum ÷ TotalSubscribers × 100`

The full content spec for `ZkautGuide` (steps, companies, eligibility groups, documents, costs, CSS classes) lives in `.cursor/rules/zkaut-guide-page.mdc`.

**Firebase Hosting** (`firebase.json`): Serves `dist/` with a `**` → `/index.html` rewrite for SPA routing. Cache headers on `/assets/**` are set to immutable. `src/firebase.js` exists but is not imported anywhere in the app — it's leftover from an earlier Firebase integration attempt.

## Data contract (`public/data.json`)

The scraper writes and the frontend reads this shape:

```json
{
  "items": [ ...ProjectItems from the upstream API, filtered to open ones... ],
  "totalRecords": 12,
  "openLotteriesCount": 12,
  "fetchedAt": "2026-05-30T10:00:00+00:00"
}
```

`totalRecords`/`openLotteriesCount` are just `len(items)`, computed locally — see the ProjectStatus note below for why they can't come from the upstream response. It's normal for `items` to be empty: the government publishes lotteries in occasional batches, so there can be real gaps with zero open lotteries. That is what `NoOpenLotteries` renders — an empty `items` is data, not a failure.

The frontend maps `items[].CityDescription`, `NeighborhoodName`, `ContractorDescription`, `EntitlementDescription`, `ApplicationEndDate`, `LotteryApparmentsNum`, `TotalSubscribers`, `PricePerUnit`, `ProjectNumber`, and `LotteryNumber` — all raw fields from the upstream response, passed through unchanged.

## Upstream API details

- Endpoint: `GET https://dira.moch.gov.il/api/Invoker?method=Projects&param=<encoded inner query>`
- Inner query mirrors the SPA's `convertJsonToUri` helper: `?key=value&key=value&` (note trailing `&`), then percent-encoded as the `param` value.
- `ProjectStatus` is a no-op: values 0 through 6 all return byte-identical results. The endpoint returns the *entire* lottery archive (thousands of records, most closed years ago) sorted by `ApplicationEndDate` descending, regardless of the value sent. There is no known server-side way to filter to "open" — the scraper filters by date itself.
- `IsInit` must be `"true"` on every page. Sending `"false"` (which the SPA appears to do for page ≥ 2) makes the endpoint return zero results for that request, independent of `PageNumber` — confirmed by direct A/B testing against the live API. This previously capped the scraper at 50 items and silently dropped the rest.
- The upstream WAF blocks obvious non-browser User-Agents — the scraper sends a Chrome UA.
