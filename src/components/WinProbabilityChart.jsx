const percentFmt = new Intl.NumberFormat('he-IL', {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});

const BAR_HEIGHT_PX = 220;

export default function WinProbabilityChart({ data, loading }) {
  if (loading && data.length === 0) {
    return <div className="chart-empty">טוען נתונים…</div>;
  }

  if (data.length === 0) {
    return <div className="chart-empty">אין נתונים להצגה.</div>;
  }

  const maxPercentage = Math.max(...data.map((d) => d.percentage), 1);

  return (
    <section className="chart-panel" aria-label="אחוז זכייה לפי עיר">
      <h2 className="chart-title">אחוז זכייה לפי עיר*</h2>

      <div className="chart-plot">
        <div className="chart-bars">
          {data.map((row) => {
            const barHeight = (row.percentage / maxPercentage) * BAR_HEIGHT_PX;

            return (
              <div className="chart-column" key={row.city}>
                <div className="chart-value">{percentFmt.format(row.percentage)}%</div>
                <div className="chart-bar-area" style={{ height: BAR_HEIGHT_PX }}>
                  <div
                    className="chart-bar-fill"
                    style={{ height: `${barHeight}px` }}
                  />
                </div>
                <div className="chart-label" title={row.city}>
                  {row.city}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
