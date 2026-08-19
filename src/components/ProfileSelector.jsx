import { SERVICE_OPTIONS } from '../utils/winProbability.js';

// Lets the visitor say who they are, because the win chance depends on it far
// more than on the city: the reserved quotas mean a בן מקום and someone with no
// priority reading the same bar are looking at numbers that differ by ~18×.
// Native radios and a checkbox rather than custom widgets, so keyboard and
// screen-reader behaviour come for free in an RTL layout.
export default function ProfileSelector({ profile, onChange }) {
  function selectService(serviceId) {
    onChange({ ...profile, service: serviceId });
  }

  function toggleLocal(event) {
    onChange({ ...profile, local: event.target.checked });
  }

  return (
    <section className="profile-panel" aria-label="הפרופיל שלי">
      <h2 className="profile-title">הסיכוי שלי</h2>
      <p className="profile-intro">
        ההגרלה נערכת בחמישה שלבים עם מכסות שמורות, ולכן הסיכוי תלוי בפרופיל שלכם.
        בחרו כדי לראות את המספרים שלכם.
      </p>

      <div className="profile-controls">
        <fieldset className="profile-fieldset">
          <legend className="profile-legend">שירות מילואים או נכות</legend>
          <div className="profile-options">
            {SERVICE_OPTIONS.map((option) => (
              <label className="profile-option" key={option.id}>
                <input
                  type="radio"
                  name="service"
                  value={option.id}
                  checked={profile.service === option.id}
                  onChange={() => selectService(option.id)}
                />
                <span>{option.label}</span>
              </label>
            ))}
          </div>
        </fieldset>

        <fieldset className="profile-fieldset">
          <legend className="profile-legend">זיקה לעיר</legend>
          <div className="profile-options">
            <label className="profile-option">
              <input type="checkbox" checked={profile.local} onChange={toggleLocal} />
              <span>אני בן/בת מקום</span>
            </label>
          </div>
        </fieldset>
      </div>
    </section>
  );
}
