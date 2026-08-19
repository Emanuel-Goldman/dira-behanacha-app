// Tests for the five-stage odds model ported from research/odds_model.py.
// Run with `npm test`, which uses Node's built-in test runner — the project has
// no test framework and this needs none.
//
// The anchors are the numbers the research validated against the real May 2026
// round: across קריית גת's nine lotteries a visitor with no priority reaches
// 1.6%, a בן מקום 28.3%, a rear-duty reservist 9.8% and a combat reservist
// 24.0%, while the figure the site used to display was 5.6% for all of them.
// Those come from the real API records in kiryatGat.fixture.js, so a change
// that moves them fails here instead of quietly shipping.

import assert from 'node:assert/strict';
import test from 'node:test';

import { KIRYAT_GAT_MAY_2026 } from './kiryatGat.fixture.js';
import {
  DEFAULT_PROFILE,
  computeCityWinProbabilities,
  computeOverallProbability,
  computeProjectWinProbabilities,
  lotteryProbability,
  stagesForProfile,
} from './winProbability.js';

const NO_PRIORITY = { service: 'none', local: false };
const LOCAL = { service: 'none', local: true };
const REAR = { service: 'reservist', local: false };
const COMBAT = { service: 'combat', local: false };
const HANDICAPPED = { service: 'handicapped', local: false };

/** The city-level win % for a profile across the whole fixture, to 1 decimal. */
function kiryatGat(profile) {
  const [city] = computeCityWinProbabilities(KIRYAT_GAT_MAY_2026, profile);
  return Math.round(city.percentage * 10) / 10;
}

test('a profile is entered in its own draws plus the general one', () => {
  assert.deepEqual(stagesForProfile(NO_PRIORITY), ['כלל הזכאים']);
  assert.deepEqual(stagesForProfile(LOCAL), ['בני מקום', 'כלל הזכאים']);
  assert.deepEqual(stagesForProfile(REAR), ['משרתי מילואים', 'כלל הזכאים']);
  assert.deepEqual(stagesForProfile(HANDICAPPED), ['נכים', 'כלל הזכאים']);
});

test('a combat reservist is drawn in the rear-duty stage as well', () => {
  assert.deepEqual(stagesForProfile(COMBAT), [
    'לוחמי מילואים',
    'משרתי מילואים',
    'כלל הזכאים',
  ]);
});

test('being a local adds the בני מקום draw to any service status', () => {
  assert.deepEqual(stagesForProfile({ service: 'combat', local: true }), [
    'לוחמי מילואים',
    'משרתי מילואים',
    'בני מקום',
    'כלל הזכאים',
  ]);
});

test('the default profile is someone with no priority', () => {
  assert.deepEqual(stagesForProfile(DEFAULT_PROFILE), ['כלל הזכאים']);
});

test('reproduces the published קריית גת figures for the May 2026 round', () => {
  assert.equal(kiryatGat(NO_PRIORITY), 1.6);
  assert.equal(kiryatGat(LOCAL), 28.3);
  assert.equal(kiryatGat(REAR), 9.8);
  assert.equal(kiryatGat(COMBAT), 24.0);
});

test('the fixture is the real round — 9 lotteries and 1,433 apartments', () => {
  const [city] = computeCityWinProbabilities(KIRYAT_GAT_MAY_2026, NO_PRIORITY);

  assert.equal(city.label, 'קריית גת');
  assert.equal(city.lotteries, 9);
  assert.equal(city.totalApartments, 1433);
  assert.equal(city.maxSubscribers, 25307);
});

test('the old single figure was far too high for most and too low for a local', () => {
  // The number the site used to show everybody: apartments ÷ subscribers,
  // combined across the city's lotteries the same way.
  let losing = 1;
  for (const item of KIRYAT_GAT_MAY_2026) {
    losing *= 1 - item.LotteryApparmentsNum / item.TotalSubscribers;
  }
  const oldFigure = (1 - losing) * 100;

  assert.equal(Math.round(oldFigure * 10) / 10, 5.6);
  // ~3.5x too high for someone with no priority, ~5x too low for a בן מקום.
  assert.ok(kiryatGat(NO_PRIORITY) < oldFigure / 3);
  assert.ok(kiryatGat(LOCAL) > oldFigure * 5);
});

test('an unused quota cascades into the next stage rather than being lost', () => {
  // Two disabled applicants for ten reserved units in this lottery: the eight
  // spare units must roll forward to the combat draw, which is the next one.
  const lottery = KIRYAT_GAT_MAY_2026[0];
  const generous = { ...lottery, HousingUnitsForHandicapped: 2000 };

  assert.ok(lotteryProbability(generous, COMBAT) > lotteryProbability(lottery, COMBAT));
  // Everyone in an over-supplied pool wins outright.
  assert.equal(lotteryProbability(generous, HANDICAPPED), 1);
});

test('a city is the chance of winning at least one of its lotteries', () => {
  const [first] = KIRYAT_GAT_MAY_2026;
  const items = [first, { ...first, LotteryNumber: '9999' }];

  const single = lotteryProbability(first, NO_PRIORITY);
  const [city] = computeCityWinProbabilities(items, NO_PRIORITY);
  const expected = (1 - (1 - single) ** 2) * 100;

  assert.equal(city.lotteries, 2);
  assert.ok(Math.abs(city.percentage - expected) < 1e-9);
  // The old formula summed the apartments of both and divided by one
  // subscriber count, which counted the second lottery's units twice over.
  assert.ok(city.percentage < ((first.LotteryApparmentsNum * 2) / first.TotalSubscribers) * 100);
});

test('cities are sorted best first', () => {
  const [first] = KIRYAT_GAT_MAY_2026;
  const items = [
    { ...first, CityDescription: 'עיר קטנה', LotteryApparmentsNum: 10 },
    { ...first, CityDescription: 'עיר גדולה' },
  ];

  assert.deepEqual(
    computeCityWinProbabilities(items, NO_PRIORITY).map((row) => row.label),
    ['עיר גדולה', 'עיר קטנה']
  );
});

test('project rows cover only the requested city, encoded or not', () => {
  const rows = computeProjectWinProbabilities(
    KIRYAT_GAT_MAY_2026,
    'קריית גת',
    NO_PRIORITY
  );
  const encoded = computeProjectWinProbabilities(
    KIRYAT_GAT_MAY_2026,
    encodeURIComponent('קריית גת'),
    NO_PRIORITY
  );

  assert.equal(rows.length, 9);
  assert.deepEqual(encoded, rows);
  // Sorted best first, and labelled by neighbourhood and lottery number.
  assert.equal(rows[0].label, "שכ' מערבית · 2696");
  assert.ok(rows[0].percentage >= rows[8].percentage);
});

test('a city is worth more than its best single lottery', () => {
  const [city] = computeCityWinProbabilities(KIRYAT_GAT_MAY_2026, NO_PRIORITY);
  const projects = computeProjectWinProbabilities(
    KIRYAT_GAT_MAY_2026,
    'קריית גת',
    NO_PRIORITY
  );

  // The guide's central advice, as an assertion: entering more draws only helps.
  assert.ok(city.percentage > projects[0].percentage);
});

test('the overall figure spans every city in the data', () => {
  const [first] = KIRYAT_GAT_MAY_2026;
  const items = [
    { ...first, CityDescription: 'עיר א' },
    { ...first, CityDescription: 'עיר ב' },
  ];

  const overall = computeOverallProbability(items, NO_PRIORITY);
  const best = computeCityWinProbabilities(items, NO_PRIORITY)[0].percentage;

  assert.ok(overall > best);
});

test('empty data yields no rows and no chance, not NaN', () => {
  assert.deepEqual(computeCityWinProbabilities([], NO_PRIORITY), []);
  assert.deepEqual(computeProjectWinProbabilities([], 'קריית גת', NO_PRIORITY), []);
  assert.equal(computeOverallProbability([], NO_PRIORITY), 0);
});

test('a lottery nobody registered for reports zero, not a division by zero', () => {
  const empty = {
    ...KIRYAT_GAT_MAY_2026[0],
    TotalSubscribers: 0,
    TotalLocalSubscribers: 0,
    TotalHandicappedSubscribers: 0,
  };

  const chance = lotteryProbability(empty, NO_PRIORITY);
  assert.ok(Number.isFinite(chance));
  assert.equal(chance, 0);
});

test('missing and null quota fields are treated as zero', () => {
  const sparse = {
    CityDescription: 'עיר',
    LotteryNumber: '7',
    LotteryApparmentsNum: 100,
    TotalSubscribers: 1000,
    HousingUnitsForHandicapped: null,
    LocalHousing: null,
  };

  // With no quotas at all every unit is drawn in the general stage, so the
  // five-stage model has to agree with the simple division here.
  assert.ok(Math.abs(lotteryProbability(sparse, NO_PRIORITY) - 0.1) < 1e-9);
});

test('an unknown stored service status cannot silently change the odds', () => {
  const bogus = { service: 'astronaut', local: false };

  // stagesForProfile falls back to the general draw only, so a stale profile
  // from localStorage reads as no priority instead of throwing.
  assert.deepEqual(stagesForProfile(bogus), ['כלל הזכאים']);
  assert.equal(kiryatGat(bogus), kiryatGat(NO_PRIORITY));
});
