// Talks to the official "Dira BeHanacha" Invoker endpoint that the SPA at
// https://dira.moch.gov.il/ProjectsList uses internally. The endpoint returns
// JSON with `access-control-allow-origin: *`, so we can call it from a pure
// frontend without a backend or CORS proxy.

const BASE_URL = 'https://dira.moch.gov.il/api/Invoker';

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

  const res = await fetch(url, {
    method: 'GET',
    headers: { Accept: 'application/json' },
    signal,
  });

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
