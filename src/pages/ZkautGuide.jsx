import { Link } from 'react-router-dom';

const STEPS = [
  {
    title: 'בדוק שאתה עומד בתנאי הזכאות',
    body: 'ודא שאין בבעלותך יותר מ־⅓ מדירה ב־3 השנים האחרונות, ושאתה שייך לאחת מקטגוריות הזכאות (ראו למטה).',
  },
  {
    title: 'בחר חברת אכלוס ופנה אליה',
    body: 'יש שלוש חברות אכלוס מורשות. ניתן לפנות לכל אחת מהן - אין חובה לפנות לחברה שמנהלת את הפרויקט שמעניין אותך.',
  },
  {
    title: 'מלא טופס בקשה ושלם 200 ₪',
    body: 'הגשת בקשה מקוונת דרך אתר חברת האכלוס - ללא צורך במסמכים. הגשה פיזית או במקרים מיוחדים - נדרשים מסמכים (ראו למטה).',
  },
  {
    title: 'קבל את האישור',
    body: 'תוך עד 10 ימי עסקים תקבל אישור זכאות עם מספר זכאות. מספר זה משמש גם כסיסמה ראשונית באתר ההגרלות.',
  },
  {
    title: 'הירשם לאתר ההגרלות',
    body: 'היכנס לאתר dira.moch.gov.il עם תעודת זהות ומספר הזכאות, ובחר הגרלות להרשמה.',
  },
];

const COMPANIES = [
  {
    name: 'אלונים',
    short: '*2850',
    href: 'https://www.alonim.co.il',
    label: 'alonim.co.il',
  },
  {
    name: 'מילגם',
    short: '*6078',
    href: 'https://shikun.milgam.co.il',
    label: 'milgam.co.il',
  },
  {
    name: 'מעוף',
    short: '*9344',
    href: 'https://www.shikun-maof.co.il',
    label: 'shikun-maof.co.il',
  },
];

const ELIGIBILITY_GROUPS = [
  {
    label: 'זוגות נשואים / ידועים בציבור',
    detail: 'המנהלים משק בית משותף',
  },
  {
    label: 'זוגות עתידיים לנישואין',
    detail: 'בתוך 3 חודשים ממועד הגשת הבקשה',
  },
  {
    label: 'הורים עם ילד מתחת לגיל 21',
    detail: 'כולל הורים יחידניים, גרושים ואלמנים/ות',
  },
  {
    label: 'רווקים מגיל 35 ומעלה',
    detail: 'כולל פרודים ואלמנים ללא ילדים',
  },
  {
    label: 'בעלי מוגבלות מגיל 21',
    detail: 'נכות 75%+ מביטוח לאומי / משרד הביטחון',
  },
];

const DOCUMENTS = [
  'תעודות זהות (מקור + צילום)',
  'גרושים / פרודים: פסיקתא / הסכם גירושין (עד 10 שנים)',
  'זוגות עתידיים: הצהרה חתומה בפני עורך-דין / אישור רבני',
  'הורים יחידניים: הסכם גירושין מאושר בית-משפט + תצהיר',
  'בעלי מוגבלות: אישור נכות מביטוח לאומי / משרד הביטחון',
  'משפרי דיור: חוזה רכישה, חוזה מכירה, או נסח טאבו',
];

const COSTS = [
  { label: 'אישור חדש', amount: '200 ₪' },
  { label: 'חידוש בתוך 60 יום מפקיעה', amount: '50 ₪' },
  { label: 'חידוש לאחר פקיעה (מעל 60 יום)', amount: '200 ₪' },
  { label: 'תוקף האישור', amount: 'שנה אחת', highlight: true },
];

export default function ZkautGuide() {
  return (
    <main className="app" dir="rtl">
      <header className="hero">
        <Link to="/" className="back-link">
          ← חזרה לדף הראשי
        </Link>
        <h1>מדריך הוצאת אישור זכאות</h1>
        <p className="subtitle">
          כיצד להשיג אישור זכאות לתוכנית דירה בהנחה - שלב אחר שלב
        </p>
      </header>

      <section className="guide-section">
        <h2 className="guide-section-title">שלבי התהליך</h2>
        <ol className="guide-steps">
          {STEPS.map((step, index) => (
            <li key={step.title} className="guide-step">
              <span className="guide-step-num">{index + 1}</span>
              <div>
                <p className="guide-step-title">{step.title}</p>
                <p className="guide-step-body">{step.body}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      <section className="guide-section">
        <h2 className="guide-section-title">חברות האכלוס המורשות</h2>
        <p className="guide-body-text">
          ניתן לפנות לכל אחת משלוש החברות - אין קשר בין חברת האכלוס לבין
          הפרויקט שבו תרצו להירשם.
        </p>
        <div className="guide-companies">
          {COMPANIES.map((company) => (
            <div key={company.name} className="guide-company-card">
              <p className="guide-company-name">{company.name}</p>
              <p className="guide-company-phone">{company.short}</p>
              <a
                className="guide-company-link"
                href={company.href}
                target="_blank"
                rel="noreferrer"
              >
                {company.label}
              </a>
            </div>
          ))}
        </div>
      </section>

      <section className="guide-section">
        <h2 className="guide-section-title">מי זכאי?</h2>
        <ul className="guide-eligibility-list">
          {ELIGIBILITY_GROUPS.map((group) => (
            <li key={group.label} className="guide-eligibility-item">
              <span className="guide-eligibility-label">{group.label}</span>
              <span className="guide-eligibility-detail">{group.detail}</span>
            </li>
          ))}
        </ul>

        <h3 className="guide-sub-title">מצב דיור</h3>
        <div className="guide-two-col">
          <div className="guide-info-card">
            <h4 className="guide-sub-title">חסרי דירה</h4>
            <p className="guide-body-text">
              אין בבעלותכם יותר מ־⅓ מדירה, אין שכירות מוגנת ואין התיישבות
              חקלאית - ב־3 השנים האחרונות.
            </p>
          </div>
          <div className="guide-info-card">
            <h4 className="guide-sub-title">משפרי דיור</h4>
            <p className="guide-body-text">
              בעלי דירה קיימת - חובה למכור את הדירה הקודמת תוך 12 חודשים
              מקבלת המפתחות לדירה החדשה.
            </p>
          </div>
        </div>
      </section>

      <section className="guide-section">
        <h2 className="guide-section-title">מסמכים נדרשים</h2>
        <p className="guide-body-text">
          בקשה מקוונת - ללא מסמכים. הגשה פיזית או מקרים מיוחדים:
        </p>
        <ul className="guide-docs-list">
          {DOCUMENTS.map((doc) => (
            <li key={doc}>{doc}</li>
          ))}
        </ul>
      </section>

      <section className="guide-section">
        <h2 className="guide-section-title">עלויות ותוקף</h2>
        <div className="guide-costs">
          {COSTS.map((row) => (
            <div
              key={row.label}
              className={
                row.highlight
                  ? 'guide-cost-row guide-cost-row--highlight'
                  : 'guide-cost-row'
              }
            >
              <span className="guide-cost-label">{row.label}</span>
              <span className="guide-cost-amount">{row.amount}</span>
            </div>
          ))}
        </div>
        <p className="guide-note">
          זוכים שהאישור שלהם פג תוקף יכולים לחדש ב־50 ₪ גם לאחר 60 יום. המשרד
          רשאי לבדוק מחדש את הזכאות לפי שיקול דעתו.
        </p>
      </section>

      <footer className="footnote">
        מקורות:{' '}
        <a href="https://www.kolzchut.org.il" target="_blank" rel="noreferrer">
          כל-זכות
        </a>
        {' · '}
        <a href="https://dira.moch.gov.il" target="_blank" rel="noreferrer">
          משרד הבינוי והשיכון
        </a>
      </footer>
    </main>
  );
}
