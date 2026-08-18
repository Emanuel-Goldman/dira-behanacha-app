import { Link } from 'react-router-dom';

const RESEARCH_URL = '/research';

const dateFmt = new Intl.DateTimeFormat('he-IL', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
});

// What the home page shows between lottery rounds, when the scraper found no
// open lottery. Without it the page renders "אין נתונים להצגה" and looks broken,
// which is the state a visitor hits for weeks at a time — the ministry
// publishes in occasional batches, so a gap is normal rather than a failure.
//
// No countdown and no alert signup: the upstream API publishes no date for the
// next round, and there is no backend to collect an email address.
export default function NoOpenLotteries({ fetchedAt }) {
  return (
    <section className="between-rounds" aria-labelledby="between-rounds-title">
      <h2 className="between-rounds-title" id="between-rounds-title">
        אין כרגע הגרלות פתוחות להרשמה
      </h2>

      <p className="between-rounds-lead">
        משרד הבינוי והשיכון מפרסם הגרלות במקבצים, ובין מקבץ למקבץ אין הגרלה
        שאפשר להירשם אליה. זה מצב רגיל ולא תקלה — הדף מתעדכן מעצמו, וברגע
        שייפתח המקבץ הבא הנתונים יופיעו כאן.
      </p>

      {fetchedAt && (
        <p className="between-rounds-checked">
          נבדק לאחרונה: {dateFmt.format(fetchedAt)}
        </p>
      )}

      <h3 className="between-rounds-subtitle">מה כדאי לעשות עכשיו</h3>

      <ul className="between-rounds-actions">
        <li>
          <strong>להוציא תעודת זכאות.</strong> בלעדיה אי אפשר להירשם להגרלה,
          והוצאתה לוקחת זמן — כדאי שתהיה מוכנה לפני שהמקבץ הבא נפתח.{' '}
          <Link to="/guide">למדריך הוצאת תעודת זכאות</Link>
        </li>
        <li>
          <strong>להבין איך ההגרלה באמת עובדת.</strong> ההגרלה מתנהלת בחמישה
          שלבים לפי קבוצות זכאות, וסיכויי הזכייה האמיתיים שונים מאוד מאדם לאדם.{' '}
          <a href={RESEARCH_URL}>למחקר על סיכויי הזכייה</a>
        </li>
      </ul>
    </section>
  );
}
