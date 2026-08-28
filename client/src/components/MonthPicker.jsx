import { monthLabel } from '../format.js';

export default function MonthPicker({ year, month, onChange }) {
  function shift(delta) {
    let m = month + delta;
    let y = year;
    if (m < 1) {
      m = 12;
      y -= 1;
    }
    if (m > 12) {
      m = 1;
      y += 1;
    }
    onChange(y, m);
  }

  function goToday() {
    const now = new Date();
    onChange(now.getFullYear(), now.getMonth() + 1);
  }

  return (
    <div className="month-picker">
      <button type="button" onClick={() => shift(-1)} aria-label="Luna anterioara">
        &lsaquo;
      </button>
      <span className="month-picker-label">
        {monthLabel(month)} {year}
      </span>
      <button type="button" onClick={() => shift(1)} aria-label="Luna urmatoare">
        &rsaquo;
      </button>
      <button type="button" className="btn-link" onClick={goToday}>
        Azi
      </button>
    </div>
  );
}
