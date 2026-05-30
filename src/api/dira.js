// Talks to the official "Dira BeHanacha" Invoker endpoint that the SPA at
// https://dira.moch.gov.il/ProjectsList uses internally. The endpoint sends
// `Access-Control-Allow-Origin: *` twice (origin + CloudFront), which browsers
// reject as malformed CORS, so we route requests through Vite's dev proxy
// (configured in vite.config.js as `/dira-api`).

// In dev, this resolves through Vite's proxy (`server.proxy['/dira-api']` in
// vite.config.js) so the browser sees a same-origin response. The upstream
// response contains `Access-Control-Allow-Origin: *` twice, which browsers
// reject as malformed CORS — proxying sidesteps that entirely.
const BASE_URL = '/dira-api/Invoker';

// ProjectStatus=4 corresponds to "פתוחות להרשמה" (open for registration).
// Entitlement=1 mirrors the SPA's default search params and currently returns
// every open lottery (82 at the time of writing) regardless of entitlement.
const DEFAULT_SEARCH = {
  firstApplicantIdentityNumber: '',
  secondApplicantIdentityNumber: '',
  ProjectStatus: 4,
  Entitlement: 1,
};

// Mirrors the SPA's `convertJsonToUri` helper: "?k1=v1&k2=v2&".
function buildInnerQuery(params) {
  const parts = [];
  for (const [key, value] of Object.entries(params)) {
    parts.push(`${key}=${value ?? ''}`);
  }
  return `?${parts.join('&')}&`;
}

async function fetchProjectsPage(pageNumber, pageSize = 50, signal) {
  const inner = buildInnerQuery({
    ...DEFAULT_SEARCH,
    IsInit: pageNumber === 1,
    PageNumber: pageNumber,
    PageSize: pageSize,
  });

  const url = `${BASE_URL}?method=Projects&param=${encodeURIComponent(inner)}`;

  let res;
  try {
    res = await fetch(url, {
      method: 'GET',
      headers: { Accept: 'application/json' },
      signal,
    });
  } catch (err) {
    throw err;
  }

  if (!res.ok) {
    throw new Error(`Request failed (HTTP ${res.status})`);
  }

  return res.json();
}

export async function fetchOpenLotteries({ signal } = {}) {
  const [page1, page2] = await Promise.all([
    fetchProjectsPage(1, 50, signal),
    fetchProjectsPage(2, 50, signal),
  ]);

  const items = [
    ...(page1.ProjectItems ?? []),
    ...(page2.ProjectItems ?? []),
  ];

  return {
    items,
    totalRecords: page1.NumOfRecords ?? items.length,
    openLotteriesCount: page1.OpenLotteriesCount ?? items.length,
    fetchedAt: new Date(),
  };
}
