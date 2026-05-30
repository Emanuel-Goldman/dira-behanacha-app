// Reads pre-fetched lottery data from `/data.json`, which is a static file
// served from `public/data.json`. The file is produced (and refreshed every
// hour) by the Python scraper in `scraper/dira_scraper.py`.
//
// Why not call dira.moch.gov.il directly from the browser? The upstream API
// sends `Access-Control-Allow-Origin: *` twice, which browsers reject as
// malformed CORS, so any direct frontend fetch fails. Routing through a
// scheduled Python job sidesteps the browser entirely.

export async function fetchOpenLotteries({ signal } = {}) {
  const res = await fetch('/data.json', {
    method: 'GET',
    headers: { Accept: 'application/json' },
    signal,
    cache: 'no-store',
  });

  if (!res.ok) {
    if (res.status === 404) {
      throw new Error(
        'data.json לא נמצא — יש להריץ את scraper/dira_scraper.py'
      );
    }
    throw new Error(`Request failed (HTTP ${res.status})`);
  }

  const data = await res.json();

  return {
    items: data.items ?? [],
    totalRecords: data.totalRecords ?? (data.items?.length ?? 0),
    openLotteriesCount: data.openLotteriesCount ?? (data.items?.length ?? 0),
    fetchedAt: data.fetchedAt ? new Date(data.fetchedAt) : new Date(),
  };
}
