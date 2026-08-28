import { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { api } from '../api.js';
import { formatMoney, monthLabel } from '../format.js';

export default function DeveloperDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [developer, setDeveloper] = useState(null);
  const [trend, setTrend] = useState(null);
  const [costInput, setCostInput] = useState('');
  const [targetInput, setTargetInput] = useState('');
  const [savingCost, setSavingCost] = useState(false);
  const [error, setError] = useState('');

  function load() {
    api
      .getDeveloper(id)
      .then((d) => {
        setDeveloper(d);
        setCostInput(String(d.monthly_cost ?? 0));
        setTargetInput(String(d.monthly_revenue_target ?? 0));
      })
      .catch((err) => setError(err.message));
    api.getDeveloperTrend(id, 12).then(setTrend).catch((err) => setError(err.message));
  }

  useEffect(load, [id]);

  async function handleCostSubmit(e) {
    e.preventDefault();
    setSavingCost(true);
    try {
      await api.updateDeveloper(id, {
        monthly_cost: Number(costInput) || 0,
        monthly_revenue_target: Number(targetInput) || 0,
      });
      load();
    } catch (err) {
      setError(err.message);
    } finally {
      setSavingCost(false);
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
        <h2>Cost lunar si tinta de venit</h2>
        <p className="muted">
          Doua sume fixe, care nu variaza de la o luna la alta — le poti schimba oricand aici.
        </p>
        <form className="inline-form" onSubmit={handleCostSubmit}>
          <label className="login-field" style={{ width: '10rem' }}>
            Cost lunar (EUR)
            <input
              type="number"
              value={costInput}
              onChange={(e) => setCostInput(e.target.value)}
              required
            />
          </label>
          <label className="login-field" style={{ width: '10rem' }}>
            Tinta venit (EUR)
            <input
              type="number"
              value={targetInput}
              onChange={(e) => setTargetInput(e.target.value)}
              required
            />
          </label>
          <button type="submit" className="btn-primary" disabled={savingCost}>
            {savingCost ? 'Se salveaza...' : 'Salveaza'}
          </button>
        </form>
      </div>

      <div className="card">
        <h2>Venit si profit lunar (ultimele 12 luni)</h2>
        <p className="muted">Costul e acelasi in fiecare luna — vezi mai sus cum il schimbi.</p>
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
