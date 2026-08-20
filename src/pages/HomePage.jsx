import { Link } from 'react-router-dom';
import { useMemo } from 'react';
import NoOpenLotteries from '../components/NoOpenLotteries.jsx';
import WinProbabilityChart from '../components/WinProbabilityChart.jsx';
import ProfileSelector from '../components/ProfileSelector.jsx';
import useLotteryData from '../hooks/useLotteryData.js';
import useProfile from '../hooks/useProfile.js';
import {
  computeCityWinProbabilities,
  computeOverallProbability,
} from '../utils/winProbability.js';

const SOURCE_URL = 'https://dira.moch.gov.il/ProjectsList';

const percentFmt = new Intl.NumberFormat('he-IL', {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});

export default function HomePage() {
  const { data, items, loading, error } = useLotteryData();
  const [profile, setProfile] = useProfile();

  const cityStats = useMemo(
    () => computeCityWinProbabilities(items, profile),
    [items, profile]
  );
  const overall = useMemo(
    () => computeOverallProbability(items, profile),
    [items, profile]
  );

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

      <ProfileSelector profile={profile} onChange={setProfile} />

      {/* The headline number the guide is built on: breadth beats choice,
          because registering for another lottery costs nothing. */}
      {items.length > 0 && (
        <p className="profile-summary">
          אם תירשמו לכל {items.length} ההגרלות הפתוחות, הסיכוי שלכם לזכות באחת מהן
          הוא <strong>{percentFmt.format(overall)}%</strong>.
        </p>
      )}

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
          * ההגרלה נערכת בחמישה שלבים לפי סדר: נכים, לוחמי מילואים, משרתי מילואים,
          בני מקום וכלל הזכאים. מי שלא זכה בשלב אחד ממשיך לשלב הבא, ודירות שלא נוצלו
          במכסה עוברות הלאה. לכן הסיכוי בעיר הוא הסיכוי לזכות לפחות באחת מההגרלות
          שלה, לפי הפרופיל שבחרתם, ולא מספר הדירות חלקי מספר הנרשמים.{' '}
          <a href="/research" target="_blank" rel="noreferrer">
            המחקר המלא שמאחורי החישוב
          </a>
          .
        </footer>
      )}
    </main>
  );
}
