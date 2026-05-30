import { useEffect, useMemo, useRef, useState } from 'react';
import { fetchOpenLotteries } from './api/dira.js';
import WinProbabilityChart from './components/WinProbabilityChart.jsx';
import { computeCityWinProbabilities } from './utils/winProbability.js';

const ONE_HOUR_MS = 60 * 60 * 1000;
const SOURCE_URL = 'https://dira.moch.gov.il/ProjectsList';

export default function App() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
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
  const cityStats = useMemo(() => computeCityWinProbabilities(items), [items]);

  return (
    <main className="app" dir="rtl">
      <header className="hero">
        <h1>דירה בהנחה</h1>
        <p className="subtitle">
          הגרלות פתוחות להרשמה ב<a href={SOURCE_URL} target="_blank" rel="noreferrer">דירה בהנחה.</a>
        </p>

        <div className="status-bar">
          <span className="pill">
            {loading && !data ? 'טוען…' : `${cityStats.length} ערים · ${items.length} הגרלות`}
          </span>
        </div>

        {error && <div className="error">שגיאה בטעינה: {error}</div>}
      </header>

      <WinProbabilityChart data={cityStats} loading={loading} />
    </main>
  );
}
