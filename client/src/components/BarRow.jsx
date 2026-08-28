export default function BarRow({ label, value, max, tone }) {
  const pct = max > 0 ? Math.min(100, Math.max(0, (Math.abs(value) / max) * 100)) : 0;
  return (
    <div className="bar-row">
      <div className="bar-row-label" title={label}>
        {label}
      </div>
      <div className="bar-row-track">
        <div className={`bar-row-fill${tone ? ` tone-${tone}` : ''}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
