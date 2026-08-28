import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api.js';
import { formatMoney } from '../format.js';
import MonthPicker from '../components/MonthPicker.jsx';
import StatCard from '../components/StatCard.jsx';
import BarRow from '../components/BarRow.jsx';

const now = new Date();

export default function Dashboard() {
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    api
      .getMonthlySummary(year, month)
      .then((res) => {
        if (!cancelled) {
          setData(res);
          setError('');
        }
      })
      .catch((err) => {
        if (!cancelled) setError(err.message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [year, month]);

  const maxAbsProfit = data ? Math.max(1, ...data.rows.map((r) => Math.abs(r.profit))) : 1;

  return (
    <div className="page">
      <div className="page-header">
        <h1>Dashboard lunar</h1>
        <MonthPicker
          year={year}
          month={month}
          onChange={(y, m) => {
            setYear(y);
            setMonth(m);
          }}
        />
      </div>

      {error && <p className="error-text">{error}</p>}
      {loading && <p>Se incarca...</p>}

      {data && !loading && (
        <>
          <div className="stat-row">
            <StatCard label="Venit total" value={formatMoney(data.totals.income)} />
            <StatCard label="Cost total" value={formatMoney(data.totals.cost)} />
            <StatCard
              label="Profit total"
              value={formatMoney(data.totals.profit)}
              tone={data.totals.profit >= 0 ? 'positive' : 'negative'}
            />
          </div>

          <div className="card">
            <h2>Profit per programator</h2>
            {data.rows.length === 0 && <p className="muted">Nu exista programatori inca.</p>}
            {data.rows.map((row) => (
              <BarRow
                key={row.developer_id}
                label={row.name}
                value={row.profit}
                max={maxAbsProfit}
                tone={row.profit >= 0 ? 'positive' : 'negative'}
              />
            ))}
          </div>

          <div className="card">
            <h2>Detaliu pe programatori</h2>
            {data.rows.length === 0 ? (
              <p className="muted">Adauga programatori si proiecte ca sa vezi cifre aici.</p>
            ) : (
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Programator</th>
                      <th>Rol</th>
                      <th>Venit atribuit</th>
                      <th>Cost</th>
                      <th>Profit</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.rows.map((row) => (
                      <tr key={row.developer_id}>
                        <td>
                          <Link to={`/developers/${row.developer_id}`}>{row.name}</Link>
                        </td>
                        <td className="muted">{row.role || '-'}</td>
                        <td>{formatMoney(row.income)}</td>
                        <td>{formatMoney(row.cost)}</td>
                        <td className={row.profit >= 0 ? 'text-positive' : 'text-negative'}>
                          {formatMoney(row.profit)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
