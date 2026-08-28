import { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { api } from '../api.js';
import { formatMoney, monthLabel } from '../format.js';

const now = new Date();
const emptyCostForm = {
  year: now.getFullYear(),
  month: now.getMonth() + 1,
  amount: '',
  note: '',
};

export default function DeveloperDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [developer, setDeveloper] = useState(null);
  const [trend, setTrend] = useState(null);
  const [costForm, setCostForm] = useState(emptyCostForm);
  const [error, setError] = useState('');

  function load() {
    api.getDeveloper(id).then(setDeveloper).catch((err) => setError(err.message));
    api.getDeveloperTrend(id, 12).then(setTrend).catch((err) => setError(err.message));
  }

  useEffect(load, [id]);

  async function handleCostSubmit(e) {
    e.preventDefault();
    try {
      await api.setDeveloperCost(id, {
        ...costForm,
        amount: Number(costForm.amount) || 0,
      });
      setCostForm({ ...emptyCostForm, year: costForm.year, month: costForm.month });
      load();
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleRemove() {
    if (!window.confirm(`Stergi programatorul "${developer.name}"?`)) return;
    try {
      await api.deleteDeveloper(id);
      navigate('/developers');
    } catch (err) {
      setError(err.message);
    }
  }

  if (!developer) {
    return <div className="page">{error ? <p className="error-text">{error}</p> : <p>Se incarca...</p>}</div>;
  }

  return (
    <div className="page">
      <div className="page-header">
        <h1>{developer.name}</h1>
        <button type="button" className="btn-danger-ghost" onClick={handleRemove}>
          Sterge programator
        </button>
      </div>

      {error && <p className="error-text">{error}</p>}

      <div className="card">
        <h2>Proiecte alocate</h2>
        {developer.projects.length === 0 && <p className="muted">Nu este alocat pe niciun proiect.</p>}
        {developer.projects.length > 0 && (
          <ul className="plain-list">
            {developer.projects.map((p) => (
              <li key={p.id}>
                <Link to={`/projects/${p.id}`}>{p.name}</Link>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="card">
        <h2>Adauga cost lunar</h2>
        <p className="muted">
          Suma platita acestui programator (salariu, colaborare etc.) pentru luna selectata.
        </p>
        <form className="inline-form" onSubmit={handleCostSubmit}>
          <select
            value={costForm.month}
            onChange={(e) => setCostForm({ ...costForm, month: Number(e.target.value) })}
          >
            {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
              <option key={m} value={m}>
                {monthLabel(m)}
              </option>
            ))}
          </select>
          <input
            type="number"
            value={costForm.year}
            onChange={(e) => setCostForm({ ...costForm, year: Number(e.target.value) })}
            style={{ width: '6rem' }}
          />
          <input
            type="number"
            placeholder="Suma (EUR)"
            value={costForm.amount}
            onChange={(e) => setCostForm({ ...costForm, amount: e.target.value })}
            required
          />
          <input
            placeholder="Nota (optional)"
            value={costForm.note}
            onChange={(e) => setCostForm({ ...costForm, note: e.target.value })}
          />
          <button type="submit" className="btn-primary">
            Salveaza
          </button>
        </form>
      </div>

      <div className="card">
        <h2>Venit, cost si profit lunar (ultimele 12 luni)</h2>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Luna</th>
                <th>Venit atribuit</th>
                <th>Cost</th>
                <th>Profit</th>
              </tr>
            </thead>
            <tbody>
              {trend &&
                trend.points
                  .slice()
                  .reverse()
                  .map((p) => (
                    <tr key={`${p.year}-${p.month}`}>
                      <td>
                        {monthLabel(p.month)} {p.year}
                      </td>
                      <td>{formatMoney(p.income)}</td>
                      <td>{formatMoney(p.cost)}</td>
                      <td className={p.profit >= 0 ? 'text-positive' : 'text-negative'}>
                        {formatMoney(p.profit)}
                      </td>
                    </tr>
                  ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
