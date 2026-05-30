function apartmentCount(item) {
  return item.LotteryApparmentsNum ?? item.HousingUnits ?? 0;
}

function subscriberCount(item) {
  return item.TotalSubscribers ?? 0;
}

function projectLabel(item) {
  const place = item.NeighborhoodName?.trim() || item.ContractorDescription?.trim();
  const lottery = item.LotteryNumber ?? item.ProjectNumber;
  return place ? `${place} · ${lottery}` : `הגרלה ${lottery}`;
}

/** Group by city; win % = (sum apartments / max subscribers) × 100 */
export function computeCityWinProbabilities(items) {
  const byCity = new Map();

  for (const item of items) {
    const city = item.CityDescription?.trim() || 'לא ידוע';
    const apartments = apartmentCount(item);
    const subscribers = subscriberCount(item);

    const entry = byCity.get(city) ?? {
      id: city,
      label: city,
      totalApartments: 0,
      maxSubscribers: 0,
    };

    entry.totalApartments += apartments;
    entry.maxSubscribers = Math.max(entry.maxSubscribers, subscribers);
    byCity.set(city, entry);
  }

  return [...byCity.values()]
    .map(({ id, label, totalApartments, maxSubscribers }) => ({
      id,
      label,
      totalApartments,
      maxSubscribers,
      percentage:
        maxSubscribers > 0 ? (totalApartments / maxSubscribers) * 100 : 0,
    }))
    .sort((a, b) => b.percentage - a.percentage);
}

/** Per project in a city; win % = (apartments / subscribers) × 100 */
export function computeProjectWinProbabilities(items, cityName) {
  const city = decodeURIComponent(cityName).trim();

  return items
    .filter((item) => (item.CityDescription?.trim() || 'לא ידוע') === city)
    .map((item) => {
      const apartments = apartmentCount(item);
      const subscribers = subscriberCount(item);

      return {
        id: item.LotteryNumber ?? item.ProjectNumber,
        label: projectLabel(item),
        totalApartments: apartments,
        maxSubscribers: subscribers,
        percentage: subscribers > 0 ? (apartments / subscribers) * 100 : 0,
      };
    })
    .sort((a, b) => b.percentage - a.percentage);
}
