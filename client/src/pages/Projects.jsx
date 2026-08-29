import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api.js';
import { formatMoney } from '../format.js';

const emptyForm = { name: '', client: '', description: '' };

export default function Projects() {
  const [projects, setProjects] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  function load() {
    setLoading(true);
    api
      .getProjects()
      .then(setProjects)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }

  useEffect(load, []);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.name.trim()) return;
    try {
      await api.createProject(form);
      setForm(emptyForm);
      load();
    } catch (err) {
      setError(err.message);
    }
  }

  async function remove(project) {
    if (!window.confirm(`Stergi proiectul "${project.name}"? Se sterg si alocarile si veniturile lui.`)) return;
    try {
      await api.deleteProject(project.id);
      load();
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div className="page">
      <div className="page-header">
        <h1>Proiecte</h1>
      </div>

      {error && <p className="error-text">{error}</p>}

      <div className="card">
        <h2>Adauga proiect</h2>
        <form className="inline-form" onSubmit={handleSubmit}>
          <input
            placeholder="Nume proiect"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            required
          />
          <input
            placeholder="Client (optional)"
            value={form.client}
            onChange={(e) => setForm({ ...form, client: e.target.value })}
          />
          <input
            placeholder="Descriere (optional)"
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
          />
          <button type="submit" className="btn-primary">
            Adauga
          </button>
        </form>
      </div>

      <div className="card">
        {loading && <p>Se incarca...</p>}
        {!loading && projects.length === 0 && <p className="muted">Nu ai adaugat inca niciun proiect.</p>}
        {!loading && projects.length > 0 && (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Proiect</th>
                  <th>Programatori</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {projects.map((p) => (
                  <tr key={p.id}>
                    <td>
                      <Link to={`/projects/${p.id}`}>{p.name}</Link>
                      <div className="project-total">{formatMoney(p.total_revenue)}</div>
                    </td>
                    <td className="muted">
                      {p.developers.length === 0 ? '-' : p.developers.map((d) => d.name).join(', ')}
                    </td>
                    <td className="actions-cell">
                      <button type="button" className="btn-danger-ghost" onClick={() => remove(p)}>
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
