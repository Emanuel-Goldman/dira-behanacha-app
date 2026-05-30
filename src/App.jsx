import { useEffect, useRef, useState } from 'react';
import { fetchOpenLotteries } from './api/dira.js';

const ONE_HOUR_MS = 60 * 60 * 1000;
const SOURCE_URL = 'https://dira.moch.gov.il/ProjectsList';

const dateFmt = new Intl.DateTimeFormat('he-IL', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
});

const numberFmt = new Intl.NumberFormat('he-IL');
const priceFmt = new Intl.NumberFormat('he-IL', {
  style: 'currency',
  currency: 'ILS',
  maximumFractionDigits: 0,
});
const timeFmt = new Intl.DateTimeFormat('he-IL', {
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
});

function formatDate(value) {
  if (!value) return '—';
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? '—' : dateFmt.format(d);
}

function projectInfoUrl(item) {
  const lotteryNumber = item.LotteryNumber ?? 0;
  return `https://dira.moch.gov.il/#!/${item.ProjectNumber}/${lotteryNumber}/ProjectInfo`;
}

export default function App() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [nextRefresh, setNextRefresh] = useState(null);
  const abortRef = useRef(null);

  async function load() {
    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;

    setLoading(true);
    setError(null);
    try {
      const result = await fetchOpenLotteries({ signal: ctrl.signal });
      setData(result);
      setLastUpdated(result.fetchedAt);
      setNextRefresh(new Date(Date.now() + ONE_HOUR_MS));
    } catch (err) {
      if (err.name !== 'AbortError') {
        setError(err.message ?? String(err));
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    const id = setInterval(load, ONE_HOUR_MS);
    return () => {
      clearInterval(id);
      abortRef.current?.abort();
    };
  }, []);

  const items = data?.items ?? [];

  return (
    <main className="app" dir="rtl">
      <header className="hero">
        <h1>Dira-Behanach</h1>
        <p className="subtitle">
          הגרלות פתוחות להרשמה ב<a href={SOURCE_URL} target="_blank" rel="noreferrer">דירה בהנחה</a>
        </p>

        <div className="status-bar">
          <span className="pill">
            {loading && !data ? 'טוען…' : `${items.length} מתוך ${data?.totalRecords ?? 0} הגרלות`}
          </span>
          <span className="meta">
            עודכן: {lastUpdated ? timeFmt.format(lastUpdated) : '—'}
          </span>
          <span className="meta">
            רענון הבא: {nextRefresh ? timeFmt.format(nextRefresh) : '—'}
          </span>
          <button className="refresh" onClick={load} disabled={loading}>
            {loading ? 'מרענן…' : 'רענן עכשיו'}
          </button>
        </div>

        {error && <div className="error">שגיאה בטעינה: {error}</div>}
      </header>

      <section className="table-wrap" aria-busy={loading}>
        <table className="lotteries">
          <thead>
            <tr>
              <th>הגרלה</th>
              <th>עיר</th>
              <th>שכונה / פרויקט</th>
              <th>קבלן</th>
              <th>זכאות</th>
              <th>סיום הרשמה</th>
              <th>דירות</th>
              <th>נרשמים</th>
              <th>מחיר למ״ר</th>
              <th>פרטים</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={`${item.ProjectNumber}-${item.LotteryNumber}`}>
                <td className="num">{item.LotteryNumber}</td>
                <td>{item.CityDescription || '—'}</td>
                <td>
                  <div className="project-name">{item.NeighborhoodName || item.ProjectName || '—'}</div>
                  {item.SpecialLotteryDescription && (
                    <div className="project-sub">{item.SpecialLotteryDescription}</div>
                  )}
                </td>
                <td className="contractor">{item.ContractorDescription || '—'}</td>
                <td>{item.EntitlementDescription || item.Entitlement || '—'}</td>
                <td>{formatDate(item.ApplicationEndDate)}</td>
                <td className="num">{numberFmt.format(item.LotteryApparmentsNum ?? item.HousingUnits ?? 0)}</td>
                <td className="num">{numberFmt.format(item.TotalSubscribers ?? 0)}</td>
                <td className="num price">
                  {item.PricePerUnit ? priceFmt.format(item.PricePerUnit) : '—'}
                </td>
                <td>
                  <a className="details" href={projectInfoUrl(item)} target="_blank" rel="noreferrer">
                    פרטים
                  </a>
                </td>
              </tr>
            ))}
            {!loading && items.length === 0 && !error && (
              <tr>
                <td colSpan={10} className="empty">אין כרגע הגרלות פתוחות להרשמה.</td>
              </tr>
            )}
          </tbody>
        </table>
      </section>
    </main>
  );
}
