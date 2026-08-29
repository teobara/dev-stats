import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api.js';
import { formatMoney } from '../format.js';

const emptyForm = { name: '', role: '', email: '', monthly_cost: '' };

export default function Developers() {
  const [developers, setDevelopers] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  function load() {
    setLoading(true);
    api
      .getDevelopers()
      .then(setDevelopers)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }

  useEffect(load, []);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.name.trim()) return;
    try {
      await api.createDeveloper({
        ...form,
        monthly_cost: Number(form.monthly_cost) || 0,
      });
      setForm(emptyForm);
      load();
    } catch (err) {
      setError(err.message);
    }
  }

  async function remove(dev) {
    if (!window.confirm(`Stergi programatorul "${dev.name}"? Se sterg si alocarile si veniturile lui.`)) return;
    try {
      await api.deleteDeveloper(dev.id);
      load();
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div className="page">
      <div className="page-header">
        <h1>Programatori</h1>
      </div>

      {error && <p className="error-text">{error}</p>}

      <div className="card">
        <h2>Adauga programator</h2>
        <form className="inline-form" onSubmit={handleSubmit}>
          <input
            placeholder="Nume"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            required
          />
          <input
            placeholder="Rol / tehnologie (optional)"
            value={form.role}
            onChange={(e) => setForm({ ...form, role: e.target.value })}
          />
          <input
            placeholder="Email (optional)"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
          />
          <input
            type="number"
            placeholder="Cost lunar (EUR)"
            value={form.monthly_cost}
            onChange={(e) => setForm({ ...form, monthly_cost: e.target.value })}
            style={{ width: '9rem' }}
          />
          <button type="submit" className="btn-primary">
            Adauga
          </button>
        </form>
      </div>

      <div className="card">
        {loading && <p>Se incarca...</p>}
        {!loading && developers.length === 0 && (
          <p className="muted">Nu ai adaugat inca niciun programator.</p>
        )}
        {!loading && developers.length > 0 && (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Nume</th>
                  <th>Cost lunar</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {developers.map((dev) => (
                  <tr key={dev.id}>
                    <td>
                      <Link to={`/developers/${dev.id}`}>{dev.name}</Link>
                    </td>
                    <td>{formatMoney(dev.monthly_cost)}</td>
                    <td className="actions-cell">
                      <button type="button" className="btn-danger-ghost" onClick={() => remove(dev)}>
                        Sterge
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
