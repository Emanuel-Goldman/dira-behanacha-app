import { Link, useParams } from 'react-router-dom';
import { useMemo } from 'react';
import WinProbabilityChart from '../components/WinProbabilityChart.jsx';
import useLotteryData from '../hooks/useLotteryData.js';
import { computeProjectWinProbabilities } from '../utils/winProbability.js';

export default function CityPage() {
  const { cityName } = useParams();
  const { items, loading, error } = useLotteryData();
  const city = decodeURIComponent(cityName ?? '');

  const projectStats = useMemo(
    () => computeProjectWinProbabilities(items, cityName ?? ''),
    [items, cityName]
  );

  return (
    <main className="app" dir="rtl">
      <header className="hero">
        <Link to="/" className="back-link">
          ← חזרה לכל הערים
        </Link>
        <h1>{city}</h1>
        <p className="subtitle">הגרלות פתוחות בעיר</p>

        <div className="status-bar">
          <span className="pill">
            {loading && items.length === 0
              ? 'טוען…'
              : `${projectStats.length} הגרלות`}
          </span>
        </div>

        {error && <div className="error">שגיאה בטעינה: {error}</div>}
      </header>

      <WinProbabilityChart
        data={projectStats}
        loading={loading}
        title="אחוז זכייה לפי פרויקט*"
        ariaLabel={`אחוז זכייה לפי פרויקט ב${city}`}
        wideColumns
      />

      <footer className="footnote">
        * סיכוי הזכייה מחושב עבור כל פרויקט: מספר דירות בפרויקט ÷ מספר נרשמים
        בפרויקט × 100.
      </footer>
    </main>
  );
}
