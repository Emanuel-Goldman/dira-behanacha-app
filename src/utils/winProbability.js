// Win probability for the "דירה בהנחה" lottery, ported from research/odds_model.py.
//
// The draw is not one raffle but five sequential ones, each with its own
// reserved slice of the apartments and its own pool of entrants. Whoever loses
// a stage rolls into the next, so an applicant who belongs to several groups is
// drawn several times and their real chance is `1 - Π(1 - pᵢ)` over the stages
// they take part in — not `דירות ÷ נרשמים`, which is the average over all
// registrants and therefore right for nobody in particular.
//
// Every quota is read off the fields the ministry's API already returns, never
// hard-coded, because the quotas changed with each regulations version (B13-B20).

// Stage names double as keys into the per-stage probability map, and are shown
// to the user in the breakdown, so they are the ministry's own wording.
const STAGE_HANDICAPPED = 'נכים';
const STAGE_COMBAT = 'לוחמי מילואים';
const STAGE_RESERVIST = 'משרתי מילואים';
const STAGE_LOCAL = 'בני מקום';
const STAGE_GENERAL = 'כלל הזכאים';

// The ministry published TotalReservedDutySubscribers for the Dec-2023..Dec-2024
// rounds (14.0%, 15.7%, 16.1%, 16.6% nationally) and then stopped, exactly when
// the reservist quota rose. Recent rounds fall back on the last measured value.
export const DEFAULT_RESERVIST_SHARE = 0.166;

// Of those reservists, the share qualifying as combat. Never published in any
// round; the 25%/25% split of the quota is the only anchor, which makes this the
// model's weakest number.
export const DEFAULT_COMBAT_FRACTION = 0.5;

// The service statuses a user can pick. `stages` lists the draws that status is
// entered in, before בן מקום and the general draw are appended.
export const SERVICE_OPTIONS = [
  { id: 'none', label: 'ללא', stages: [] },
  { id: 'reservist', label: 'מילואים — עורף', stages: [STAGE_RESERVIST] },
  { id: 'combat', label: 'מילואים — לוחם', stages: [STAGE_COMBAT, STAGE_RESERVIST] },
  { id: 'handicapped', label: 'נכה', stages: [STAGE_HANDICAPPED] },
];

export const DEFAULT_PROFILE = { service: 'none', local: false };

function num(item, key) {
  const value = item[key];
  return Number(value) || 0;
}

/**
 * Round a pool size to a whole number of households, breaking ties to even.
 *
 * The combat pool is half the reservist pool, so it lands on exactly x.5
 * whenever that pool is odd — which is most lotteries. Half-to-even keeps the
 * estimate unbiased across many lotteries, and it is what research/odds_model.py
 * does, so the app and the published research page agree to the last digit.
 */
function roundPool(value) {
  const floor = Math.floor(value);
  const remainder = value - floor;

  if (remainder !== 0.5) {
    return Math.round(value);
  }
  return floor % 2 === 0 ? floor : floor + 1;
}

function apartmentCount(item) {
  return item.LotteryApparmentsNum ?? item.HousingUnits ?? 0;
}

function projectLabel(item) {
  const place = item.NeighborhoodName?.trim() || item.ContractorDescription?.trim();
  const lottery = item.LotteryNumber ?? item.ProjectNumber;
  return place ? `${place} · ${lottery}` : `הגרלה ${lottery}`;
}

/** The five draws of one lottery, in the order they are actually run. */
function buildStages(item, reservistShare, combatFraction) {
  const totalUnits = num(item, 'LotteryApparmentsNum');
  const subscribers = num(item, 'TotalSubscribers');

  // Reservist pools are estimated whenever the API omits them — see the
  // constants above for why that is the common case from Aug 2025 onwards.
  let reservists = num(item, 'TotalReservedDutySubscribers');
  if (!reservists) {
    reservists = roundPool(subscribers * reservistShare);
  }
  let combat = num(item, 'TotalCombatReservistSubscribers');
  if (!combat) {
    combat = roundPool(reservists * combatFraction);
  }

  const stages = [
    {
      name: STAGE_HANDICAPPED,
      units: num(item, 'HousingUnitsForHandicapped'),
      pool: num(item, 'TotalHandicappedSubscribers'),
    },
    { name: STAGE_COMBAT, units: num(item, 'HU_CombatReservist_L'), pool: combat },
    { name: STAGE_RESERVIST, units: num(item, 'HU_Reservists_L'), pool: reservists },
    {
      name: STAGE_LOCAL,
      units: num(item, 'LocalHousing'),
      pool: num(item, 'TotalLocalSubscribers'),
    },
  ];

  // Whatever no quota claimed is drawn among everyone who has not won yet.
  let reserved = 0;
  for (const stage of stages) {
    reserved += stage.units;
  }
  stages.push({
    name: STAGE_GENERAL,
    units: Math.max(totalUnits - reserved, 0),
    pool: subscribers,
  });

  return stages;
}

/** Per-stage win chance, with unclaimed units cascading into the next stage. */
function stageProbabilities(stages) {
  const probabilities = {};
  let carried = 0;

  for (const stage of stages) {
    const available = stage.units + carried;

    // Nobody in this pool — the whole slice rolls forward, which is why a city
    // with few reservists is quietly better for everyone else.
    if (stage.pool <= 0) {
      probabilities[stage.name] = 0;
      carried = available;
      continue;
    }

    const winners = Math.min(available, stage.pool);
    probabilities[stage.name] = winners / stage.pool;
    carried = available - winners;
  }

  return probabilities;
}

/** The draws a profile is entered in; everyone is in the general draw last. */
export function stagesForProfile(profile) {
  const service = SERVICE_OPTIONS.find((option) => option.id === profile.service);
  const stages = service ? [...service.stages] : [];

  if (profile.local) {
    stages.push(STAGE_LOCAL);
  }
  stages.push(STAGE_GENERAL);

  return stages;
}

/** Chance of winning at least one of the draws this profile is entered in. */
function profileProbability(stageProbs, profile) {
  let losing = 1;
  for (const stage of stagesForProfile(profile)) {
    losing *= 1 - (stageProbs[stage] ?? 0);
  }
  return 1 - losing;
}

/** One lottery's win chance for a profile, as a fraction. */
export function lotteryProbability(item, profile, options = {}) {
  const reservistShare = options.reservistShare ?? DEFAULT_RESERVIST_SHARE;
  const combatFraction = options.combatFraction ?? DEFAULT_COMBAT_FRACTION;

  const stages = buildStages(item, reservistShare, combatFraction);
  return profileProbability(stageProbabilities(stages), profile);
}

function cityOf(item) {
  return item.CityDescription?.trim() || 'לא ידוע';
}

/**
 * Win % per city for someone entering every lottery that city offers.
 *
 * Registration is per lottery and free, and the subscriber counts show that
 * people who want a city sign up for all of its draws, so the city figure is
 * the chance of winning at least one — `1 - Π(1 - p)` — not the old
 * `sum(apartments) ÷ max(subscribers)`. That division held up for the big
 * national rounds but broke badly for standalone lotteries, where it disagreed
 * with the real spread by 36-65% in 11 of 12 multi-lottery cities.
 */
export function computeCityWinProbabilities(items, profile = DEFAULT_PROFILE, options = {}) {
  const byCity = new Map();

  for (const item of items) {
    const city = cityOf(item);
    const entry = byCity.get(city) ?? {
      id: city,
      label: city,
      totalApartments: 0,
      // Subscribers repeat across a city's lotteries, so the largest single
      // count is the closest thing to the number of households wanting in.
      maxSubscribers: 0,
      lotteries: 0,
      losing: 1,
    };

    entry.totalApartments += apartmentCount(item);
    entry.maxSubscribers = Math.max(entry.maxSubscribers, num(item, 'TotalSubscribers'));
    entry.lotteries += 1;
    entry.losing *= 1 - lotteryProbability(item, profile, options);
    byCity.set(city, entry);
  }

  const rows = [];
  for (const entry of byCity.values()) {
    rows.push({
      id: entry.id,
      label: entry.label,
      totalApartments: entry.totalApartments,
      maxSubscribers: entry.maxSubscribers,
      lotteries: entry.lotteries,
      percentage: (1 - entry.losing) * 100,
    });
  }

  return rows.sort((a, b) => b.percentage - a.percentage);
}

/** Win % per lottery within one city, for the same profile. */
export function computeProjectWinProbabilities(
  items,
  cityName,
  profile = DEFAULT_PROFILE,
  options = {}
) {
  const city = decodeURIComponent(cityName).trim();
  const rows = [];

  for (const item of items) {
    if (cityOf(item) !== city) {
      continue;
    }
    rows.push({
      id: item.LotteryNumber ?? item.ProjectNumber,
      label: projectLabel(item),
      totalApartments: apartmentCount(item),
      maxSubscribers: num(item, 'TotalSubscribers'),
      percentage: lotteryProbability(item, profile, options) * 100,
    });
  }

  return rows.sort((a, b) => b.percentage - a.percentage);
}

/**
 * Chance of winning at least one lottery anywhere in the data, for a profile.
 *
 * This is the number behind the guide's central advice: breadth beats choice,
 * because registration costs nothing once the תעודת זכאות is in hand.
 */
export function computeOverallProbability(items, profile = DEFAULT_PROFILE, options = {}) {
  let losing = 1;
  for (const item of items) {
    losing *= 1 - lotteryProbability(item, profile, options);
  }
  return (1 - losing) * 100;
}
