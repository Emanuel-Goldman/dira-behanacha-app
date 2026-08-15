"""Win-probability model for the "דירה בהנחה" lottery.

The site's current formula is `apartments / subscribers`, which is wrong for
every applicant: the draw is not one raffle but five sequential ones, each with
its own reserved slice of the apartments and its own pool of entrants. Whoever
loses a stage rolls into the next stage, so an applicant who belongs to several
groups is drawn several times.

Everything here is derived from fields the ministry's own API already returns
per lottery (see FIELDS below) rather than from hard-coded quota percentages,
because the quotas changed with every regulations version (B13 -> B20).

Usage:
    python odds_model.py <archive.json> [--round "הגרלה גדולה - מאי 2026"]
"""

from __future__ import annotations

import argparse
import collections
import json
import sys

# Fields the model reads off each lottery record.
#   LotteryApparmentsNum        total apartments drawn in this lottery
#   HousingUnitsForHandicapped  slice reserved for disabled applicants
#   HU_CombatReservist_L        slice reserved for combat reservists
#   HU_Reservists_L             slice reserved for rear-duty reservists
#   LocalHousing                slice reserved for בני מקום
#   Total*Subscribers           how many registered in each pool
FIELDS = (
    "LotteryApparmentsNum",
    "HousingUnitsForHandicapped",
    "HU_CombatReservist_L",
    "HU_Reservists_L",
    "LocalHousing",
    "TotalSubscribers",
    "TotalLocalSubscribers",
    "TotalHandicappedSubscribers",
    "TotalReservedDutySubscribers",
    "TotalCombatReservistSubscribers",
)

# Share of registrants who are reservists. The ministry published
# TotalReservedDutySubscribers for the Dec-2023..Dec-2024 rounds and then
# stopped, so for recent rounds we fall back on the last measured value.
# Measured nationally: 14.0%, 15.7%, 16.1%, 16.6% across those four rounds.
DEFAULT_RESERVIST_SHARE = 0.166

# Of those reservists, the share who qualify as combat. Not published in any
# round; the 25%/25% split of the quota between combat and rear duty is the
# only anchor, so this is the model's weakest number.
DEFAULT_COMBAT_FRACTION = 0.5


def num(item: dict, key: str) -> int:
    """Field value as an int, treating null and missing alike as zero."""
    return int(item.get(key) or 0)


def build_stages(item: dict, reservist_share: float, combat_fraction: float):
    """The five draws of one lottery, in the order they are actually run.

    Returns a list of (name, units, pool) where `pool` is how many households
    compete in that stage. Reservist pools are estimated — the API stopped
    reporting them — and are marked by the caller.
    """
    total_units = num(item, "LotteryApparmentsNum")
    subscribers = num(item, "TotalSubscribers")

    reservists = num(item, "TotalReservedDutySubscribers")
    if not reservists:
        reservists = round(subscribers * reservist_share)
    combat = num(item, "TotalCombatReservistSubscribers")
    if not combat:
        combat = round(reservists * combat_fraction)

    quota_units = [
        ("נכים", num(item, "HousingUnitsForHandicapped"), num(item, "TotalHandicappedSubscribers")),
        ("לוחמי מילואים", num(item, "HU_CombatReservist_L"), combat),
        ("משרתי מילואים", num(item, "HU_Reservists_L"), reservists),
        ("בני מקום", num(item, "LocalHousing"), num(item, "TotalLocalSubscribers")),
    ]

    # Whatever no quota claimed is drawn among everyone who has not won yet.
    reserved = sum(units for _, units, _ in quota_units)
    quota_units.append(("כלל הזכאים", max(total_units - reserved, 0), subscribers))
    return quota_units


def stage_probabilities(stages):
    """Per-stage win chance, with unclaimed units cascading to the next stage.

    A stage with more units than entrants cannot use them all; the surplus is
    added to the following stage rather than being lost, which is why a city
    with few reservists is quietly better for everyone else.
    """
    probabilities = {}
    carried = 0

    for name, units, pool in stages:
        available = units + carried
        if pool <= 0:
            # Nobody in this pool — the whole slice rolls forward.
            probabilities[name] = 0.0
            carried = available
            continue

        winners = min(available, pool)
        probabilities[name] = winners / pool
        carried = available - winners

    return probabilities


# Which stages each applicant profile is drawn in. A profile that loses one
# stage stays in the pool for the next, so the chances compound.
PROFILES = {
    "כללי": ["כלל הזכאים"],
    "בן מקום": ["בני מקום", "כלל הזכאים"],
    "מילואים עורף": ["משרתי מילואים", "כלל הזכאים"],
    "מילואים לוחם": ["לוחמי מילואים", "משרתי מילואים", "כלל הזכאים"],
    "לוחם + בן מקום": ["לוחמי מילואים", "משרתי מילואים", "בני מקום", "כלל הזכאים"],
    "נכה": ["נכים", "כלל הזכאים"],
}


def profile_probability(stage_probs: dict, profile: str) -> float:
    """Chance of winning at least one of the stages this profile is drawn in."""
    losing = 1.0
    for stage in PROFILES[profile]:
        losing *= 1.0 - stage_probs.get(stage, 0.0)
    return 1.0 - losing


def naive_probability(item: dict) -> float:
    """The formula the live site uses today, kept for comparison."""
    subscribers = num(item, "TotalSubscribers")
    if subscribers <= 0:
        return 0.0
    return num(item, "LotteryApparmentsNum") / subscribers


def analyse(items, reservist_share, combat_fraction):
    """Per-lottery odds for every profile, plus the naive figure."""
    rows = []
    for item in items:
        stages = build_stages(item, reservist_share, combat_fraction)
        probs = stage_probabilities(stages)
        rows.append(
            {
                "city": (item.get("CityDescription") or "").strip(),
                "lottery": item.get("LotteryNumber"),
                "neighborhood": (item.get("NeighborhoodName") or "").strip(),
                "units": num(item, "LotteryApparmentsNum"),
                "subscribers": num(item, "TotalSubscribers"),
                "local_subscribers": num(item, "TotalLocalSubscribers"),
                "price_per_sqm": item.get("PricePerUnit"),
                "naive": naive_probability(item),
                "stages": probs,
                "profiles": {name: profile_probability(probs, name) for name in PROFILES},
            }
        )
    return rows


def aggregate_by_city(rows):
    """One line per city, for someone who enters every lottery that city offers.

    Registration is per lottery, and the subscriber counts show that people who
    want a city sign up for all of its lotteries — the four Beit Dagan draws
    have the same ~24,600 entrants each. So the city-level chance is the chance
    of winning at least one of them, 1 - prod(1 - p), not the average of them.
    """
    cities = collections.defaultdict(
        lambda: {
            "units": 0,
            "subscribers": 0,
            "local_subscribers": 0,
            "lotteries": 0,
            "losing": collections.defaultdict(lambda: 1.0),
            "losing_naive": 1.0,
        }
    )
    for row in rows:
        entry = cities[row["city"]]
        entry["units"] += row["units"]
        # Subscribers repeat across a city's lotteries, so the largest single
        # count is the closest thing to the number of households wanting in.
        entry["subscribers"] = max(entry["subscribers"], row["subscribers"])
        entry["local_subscribers"] = max(entry["local_subscribers"], row["local_subscribers"])
        entry["lotteries"] += 1
        entry["losing_naive"] *= 1.0 - row["naive"]
        for name, value in row["profiles"].items():
            entry["losing"][name] *= 1.0 - value

    out = []
    for city, entry in cities.items():
        out.append(
            {
                "city": city,
                "units": entry["units"],
                "lotteries": entry["lotteries"],
                "subscribers": entry["subscribers"],
                "local_subscribers": entry["local_subscribers"],
                "naive": 1.0 - entry["losing_naive"],
                "profiles": {name: 1.0 - value for name, value in entry["losing"].items()},
            }
        )
    return sorted(out, key=lambda r: -r["profiles"]["כללי"])


def main(argv=None):
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("archive", help="JSON array of lottery records from the ministry API")
    parser.add_argument("--round", dest="round_name", help="Filter to one SpecialLotteryDescription")
    parser.add_argument("--reservist-share", type=float, default=DEFAULT_RESERVIST_SHARE)
    parser.add_argument("--combat-fraction", type=float, default=DEFAULT_COMBAT_FRACTION)
    parser.add_argument("--json", dest="json_out", help="Write the per-city table to this path")
    args = parser.parse_args(argv)

    items = json.load(open(args.archive, encoding="utf-8"))
    if args.round_name:
        items = [i for i in items if i.get("SpecialLotteryDescription") == args.round_name]
    if not items:
        print("no lotteries matched", file=sys.stderr)
        return 1

    rows = analyse(items, args.reservist_share, args.combat_fraction)
    by_city = aggregate_by_city(rows)

    header = f"{'עיר':<16}{'דירות':>7}{'נרשמים':>9}{'נאיבי':>8}{'כללי':>8}{'בן מקום':>10}{'עורף':>8}{'לוחם':>8}"
    print(header)
    print("-" * len(header))
    for row in by_city:
        p = row["profiles"]
        print(
            f"{row['city']:<16}{row['units']:>7}{row['subscribers']:>9}"
            f"{100 * row['naive']:>7.1f}%{100 * p['כללי']:>7.1f}%"
            f"{100 * p['בן מקום']:>9.1f}%{100 * p['מילואים עורף']:>7.1f}%"
            f"{100 * p['מילואים לוחם']:>7.1f}%"
        )

    total_units = sum(r["units"] for r in rows)
    print(f"\nלוטריות: {len(rows)}   דירות: {total_units}   ערים: {len(by_city)}")

    if args.json_out:
        json.dump(by_city, open(args.json_out, "w", encoding="utf-8"), ensure_ascii=False, indent=2)
        print(f"נכתב: {args.json_out}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
