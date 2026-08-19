import { Link, useParams } from 'react-router-dom';
import { useMemo } from 'react';
import WinProbabilityChart from '../components/WinProbabilityChart.jsx';
import ProfileSelector from '../components/ProfileSelector.jsx';
import useLotteryData from '../hooks/useLotteryData.js';
import useProfile from '../hooks/useProfile.js';
import { computeProjectWinProbabilities } from '../utils/winProbability.js';

export default function CityPage() {
  const { cityName } = useParams();
  const { items, loading, error } = useLotteryData();
  const [profile, setProfile] = useProfile();
  const city = decodeURIComponent(cityName ?? '');

  const projectStats = useMemo(
    () => computeProjectWinProbabilities(items, cityName ?? '', profile),
    [items, cityName, profile]
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

      <ProfileSelector profile={profile} onChange={setProfile} />

      <WinProbabilityChart
        data={projectStats}
        loading={loading}
        title="אחוז זכייה לפי פרויקט*"
        ariaLabel={`אחוז זכייה לפי פרויקט ב${city}`}
        scrollHint="יש עוד פרויקטים — החליקו לצדדים"
        wideColumns
      />

      <footer className="footnote">
        * הסיכוי בכל הגרלה מחושב לפי חמשת שלבי ההגרלה והמכסות השמורות בה, עבור
        הפרופיל שבחרתם. הרשמה להגרלה נוספת אינה עולה דבר, ולכן הסיכוי המצטבר
        בהרשמה לכל ההגרלות בעיר גבוה מכל אחת מהן בנפרד.
      </footer>
    </main>
  );
}
