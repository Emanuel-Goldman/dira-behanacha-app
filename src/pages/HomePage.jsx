import { Link } from 'react-router-dom';
import { useMemo } from 'react';
import NoOpenLotteries from '../components/NoOpenLotteries.jsx';
import WinProbabilityChart from '../components/WinProbabilityChart.jsx';
import useLotteryData from '../hooks/useLotteryData.js';
import { computeCityWinProbabilities } from '../utils/winProbability.js';

const SOURCE_URL = 'https://dira.moch.gov.il/ProjectsList';

export default function HomePage() {
  const { data, items, loading, error } = useLotteryData();
  const cityStats = useMemo(() => computeCityWinProbabilities(items), [items]);

  // "No open lottery" is a real, expected state between rounds — not a load
  // failure and not a still-loading page. Only that case gets the explanatory
  // panel; a fetch that failed still belongs to the error message above, and a
  // fetch still in flight belongs to the chart's own loading state.
  const isBetweenRounds = !loading && !error && items.length === 0;

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
              : items.length === 0
                ? 'אין הגרלות פתוחות כרגע'
                : `${cityStats.length} ערים · ${items.length} הגרלות`}
          </span>
          <Link to="/guide" className="guide-nav-link">
            מדריך הוצאת אישור זכאות ←
          </Link>
        </div>

        {error && <div className="error">שגיאה בטעינה: {error}</div>}
      </header>

      {isBetweenRounds ? (
        <NoOpenLotteries fetchedAt={data?.fetchedAt} />
      ) : (
        <WinProbabilityChart
          data={cityStats}
          loading={loading}
          title="אחוז זכייה לפי עיר*"
          ariaLabel="אחוז זכייה לפי עיר"
          scrollHint="יש עוד ערים — החליקו לצדדים"
          getBarHref={(row) => `/city/${encodeURIComponent(row.label)}`}
        />
      )}

      {/* The footnote explains the chart's formula, so it goes with the chart. */}
      {!isBetweenRounds && (
        <footer className="footnote">
          * סיכוי הזכייה מחושבים על ידי סכימת הדירות המוצעות בעיר חלקי המספר
          המקסימלי של נרשמים באחד הפרוייקטים בעיר - מספר הדירות בעיר ÷ מקסימום
          הנרשמים בעיר × 100.
        </footer>
      )}
    </main>
  );
}
