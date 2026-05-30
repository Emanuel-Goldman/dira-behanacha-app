import { useMemo } from 'react';
import WinProbabilityChart from '../components/WinProbabilityChart.jsx';
import useLotteryData from '../hooks/useLotteryData.js';
import { computeCityWinProbabilities } from '../utils/winProbability.js';

const SOURCE_URL = 'https://dira.moch.gov.il/ProjectsList';

export default function HomePage() {
  const { items, loading, error } = useLotteryData();
  const cityStats = useMemo(() => computeCityWinProbabilities(items), [items]);

  return (
    <main className="app" dir="rtl">
      <header className="hero">
        <h1>דירה בהנחה</h1>
        <p className="subtitle">
          הגרלות פתוחות להרשמה ב
          <a href={SOURCE_URL} target="_blank" rel="noreferrer">
            דירה בהנחה.
          </a>
        </p>

        <div className="status-bar">
          <span className="pill">
            {loading && items.length === 0
              ? 'טוען…'
              : `${cityStats.length} ערים · ${items.length} הגרלות`}
          </span>
        </div>

        {error && <div className="error">שגיאה בטעינה: {error}</div>}
      </header>

      <WinProbabilityChart
        data={cityStats}
        loading={loading}
        title="אחוז זכייה לפי עיר*"
        ariaLabel="אחוז זכייה לפי עיר"
        getBarHref={(row) => `/city/${encodeURIComponent(row.label)}`}
      />

      <footer className="footnote">
        * סיכוי הזכייה מחושבים על ידי סכימת הדירות המוצעות בעיר חלקי המספר
        המקסימלי של נרשמים באחד הפרוייקטים בעיר - מספר הדירות בעיר ÷ מקסימום
        הנרשמים בעיר × 100.
      </footer>
    </main>
  );
}
