function apartmentCount(item) {
  return item.LotteryApparmentsNum ?? item.HousingUnits ?? 0;
}

function subscriberCount(item) {
  return item.TotalSubscribers ?? 0;
}

/** Group by city; win % = (sum apartments / max subscribers) × 100 */
export function computeCityWinProbabilities(items) {
  const byCity = new Map();

  for (const item of items) {
    const city = item.CityDescription?.trim() || 'לא ידוע';
    const apartments = apartmentCount(item);
    const subscribers = subscriberCount(item);

    const entry = byCity.get(city) ?? {
      city,
      totalApartments: 0,
      maxSubscribers: 0,
    };

    entry.totalApartments += apartments;
    entry.maxSubscribers = Math.max(entry.maxSubscribers, subscribers);
    byCity.set(city, entry);
  }

  return [...byCity.values()]
    .map(({ city, totalApartments, maxSubscribers }) => ({
      city,
      totalApartments,
      maxSubscribers,
      percentage:
        maxSubscribers > 0 ? (totalApartments / maxSubscribers) * 100 : 0,
    }))
    .sort((a, b) => b.percentage - a.percentage);
}
