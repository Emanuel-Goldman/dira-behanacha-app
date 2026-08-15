import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';

const percentFmt = new Intl.NumberFormat('he-IL', {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});

const BAR_HEIGHT_PX = 220;

export default function WinProbabilityChart({
  data,
  loading,
  title,
  ariaLabel,
  getBarHref,
  wideColumns = false,
  // Hebrew adjectives agree in gender, so each page passes its own wording
  // rather than the chart building a sentence around a noun it was handed.
  scrollHint = 'יש עוד נתונים — החליקו לצדדים',
}) {
  const barsRef = useRef(null);
  const [hasOverflow, setHasOverflow] = useState(false);

  // The bars scroll sideways on a narrow screen, and nothing on the page says so.
  // Watch the strip and show the hint only while it actually has more than fits.
  useEffect(() => {
    const bars = barsRef.current;
    if (!bars) return undefined;

    const updateOverflow = () => {
      setHasOverflow(bars.scrollWidth > bars.clientWidth + 1);
    };

    updateOverflow();
    const resizeObserver = new ResizeObserver(updateOverflow);
    resizeObserver.observe(bars);

    return () => resizeObserver.disconnect();
  }, [data, wideColumns]);

  if (loading && data.length === 0) {
    return <div className="chart-empty">טוען נתונים…</div>;
  }

  if (data.length === 0) {
    return <div className="chart-empty">אין נתונים להצגה.</div>;
  }

  const maxPercentage = Math.max(...data.map((d) => d.percentage), 1);
  const columnClass = wideColumns ? 'chart-column chart-column-wide' : 'chart-column';

  return (
    <section className="chart-panel" aria-label={ariaLabel ?? title}>
      <h2 className="chart-title">{title}</h2>

      <div className="chart-plot">
        <div className="chart-bars" ref={barsRef}>
          {data.map((row) => {
            const barHeight = (row.percentage / maxPercentage) * BAR_HEIGHT_PX;
            const href = getBarHref?.(row);
            const content = (
              <>
                <div className="chart-value">{percentFmt.format(row.percentage)}%</div>
                <div className="chart-bar-area" style={{ height: BAR_HEIGHT_PX }}>
                  <div
                    className="chart-bar-fill"
                    style={{ height: `${barHeight}px` }}
                  />
                </div>
                <div className="chart-label" title={row.label}>
                  {row.label}
                </div>
              </>
            );

            if (href) {
              return (
                <Link
                  key={row.id}
                  to={href}
                  className={`${columnClass} chart-column-link`}
                  aria-label={`${row.label}, ${percentFmt.format(row.percentage)} אחוז זכייה`}
                >
                  {content}
                </Link>
              );
            }

            return (
              <div className={columnClass} key={row.id}>
                {content}
              </div>
            );
          })}
        </div>
      </div>
      {hasOverflow && (
        <p className="chart-scroll-hint">↔ {scrollHint}</p>
      )}
    </section>
  );
}
