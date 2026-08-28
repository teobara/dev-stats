export default function StatCard({ label, value, tone, note }) {
  return (
    <div className={`stat-card${tone ? ` tone-${tone}` : ''}`}>
      <div className="stat-card-label">{label}</div>
      <div className="stat-card-value">{value}</div>
      {note && <div className="stat-card-note">{note}</div>}
    </div>
  );
}
