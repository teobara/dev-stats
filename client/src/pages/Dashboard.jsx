import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api.js';
import { formatMoney, formatSignedMoney } from '../format.js';
import MonthPicker from '../components/MonthPicker.jsx';
import StatCard from '../components/StatCard.jsx';

const now = new Date();

export default function Dashboard() {
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [expensesInput, setExpensesInput] = useState('');
  const [expensesNoteInput, setExpensesNoteInput] = useState('');
  const [expensesDivisorInput, setExpensesDivisorInput] = useState('');
  const [savingExpenses, setSavingExpenses] = useState(false);

  function loadSummary() {
    let cancelled = false;
    setLoading(true);
    api
      .getMonthlySummary(year, month)
      .then((res) => {
        if (!cancelled) {
          setData(res);
          setExpensesInput(String(res.fixed_monthly_expenses ?? 0));
          setExpensesNoteInput(res.fixed_expenses_note ?? '');
          setExpensesDivisorInput(String(res.fixed_expenses_divisor ?? 1));
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
  }

  useEffect(loadSummary, [year, month]);

  async function handleExpensesSubmit(e) {
    e.preventDefault();
    setSavingExpenses(true);
    try {
      await api.updateSettings({
        fixed_monthly_expenses: Number(expensesInput) || 0,
        fixed_expenses_note: expensesNoteInput,
        fixed_expenses_divisor: Number(expensesDivisorInput) || 1,
      });
      loadSummary();
    } catch (err) {
      setError(err.message);
    } finally {
      setSavingExpenses(false);
    }
  }

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
          <div className="card">
            <h2>Cheltuieli fixe lunare</h2>
            <form onSubmit={handleExpensesSubmit}>
              <input
                placeholder="Descriere (ex: cheltuieli fixe + salarii ...)"
                value={expensesNoteInput}
                onChange={(e) => setExpensesNoteInput(e.target.value)}
                style={{ width: '100%', marginBottom: '0.6rem' }}
              />
              <div className="inline-form">
                <input
                  type="number"
                  placeholder="Suma (EUR)"
                  value={expensesInput}
                  onChange={(e) => setExpensesInput(e.target.value)}
                  style={{ width: '10rem' }}
                  required
                />
                <span className="muted">impartita la</span>
                <input
                  type="number"
                  min="1"
                  step="1"
                  placeholder="Nr. programatori"
                  value={expensesDivisorInput}
                  onChange={(e) => setExpensesDivisorInput(e.target.value)}
                  style={{ width: '7rem' }}
                  required
                />
                <button type="submit" className="btn-primary" disabled={savingExpenses}>
                  {savingExpenses ? 'Se salveaza...' : 'Salveaza'}
                </button>
                <span className="muted">= {formatMoney(data.overhead_share)} / programator</span>
              </div>
            </form>
          </div>

          <div className="stat-row">
            <StatCard
              label="Venit total"
              value={formatMoney(data.totals.income)}
              note={`Din care ${formatMoney(data.recurring_income)} din mentenanta/incasari recurente`}
            />
            <StatCard
              label="Fata de tinta (total)"
              value={formatSignedMoney(data.totals.income_deficit)}
              tone={data.totals.income_deficit < 0 ? 'negative' : 'positive'}
              note="Sunt adunate doar sumele sub tinta (minusurile) - surplusurile nu se scad din total."
            />
            <StatCard label="Cost total" value={formatMoney(data.totals.cost)} />
            <StatCard
              label="Profit total"
              value={formatMoney(data.totals.profit)}
              tone={data.totals.profit >= 0 ? 'positive' : 'negative'}
            />
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
                      <th>Venit atribuit</th>
                      <th>Peste tinta</th>
                      <th>Sub tinta</th>
                      <th>Salariu</th>
                      <th>Cheltuieli fixe</th>
                      <th>Profit</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.rows.map((row) => (
                      <tr key={row.developer_id}>
                        <td>
                          <Link to={`/developers/${row.developer_id}`}>{row.name}</Link>
                          {row.projects.length > 0 && (
                            <div className="dev-project-list">
                              {row.projects.map((p) => (
                                <Link key={p.id} to={`/projects/${p.id}`}>
                                  {p.name}
                                </Link>
                              ))}
                            </div>
                          )}
                        </td>
                        <td className="text-bold">{formatMoney(row.income)}</td>
                        <td
                          className={row.income_surplus > 0 ? 'text-positive' : 'muted'}
                          title={`Tinta: ${formatMoney(row.income_target)}`}
                        >
                          {formatSignedMoney(row.income_surplus)}
                        </td>
                        <td
                          className={row.income_deficit < 0 ? 'text-negative' : 'muted'}
                          title={`Tinta: ${formatMoney(row.income_target)}`}
                        >
                          {formatSignedMoney(row.income_deficit)}
                        </td>
                        <td>{formatMoney(row.salary_cost)}</td>
                        <td>{formatMoney(row.overhead_share)}</td>
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
