import { Fragment, useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../api.js';
import { formatMoney, monthLabel } from '../format.js';

const now = new Date();
const emptyRevenueForm = {
  developer_id: '',
  year: now.getFullYear(),
  month: now.getMonth() + 1,
  amount: '',
  note: '',
};

export default function ProjectDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [project, setProject] = useState(null);
  const [allDevelopers, setAllDevelopers] = useState([]);
  const [error, setError] = useState('');

  const [assignDeveloperId, setAssignDeveloperId] = useState('');
  const [revenueForm, setRevenueForm] = useState(emptyRevenueForm);

  function load() {
    api.getProject(id).then(setProject).catch((err) => setError(err.message));
    api.getDevelopers().then(setAllDevelopers).catch((err) => setError(err.message));
  }

  useEffect(load, [id]);

  const unassignedDevelopers = allDevelopers.filter(
    (d) => !project?.developers.some((pd) => pd.id === d.id)
  );

  // Grupam istoricul pe luna, ca sa aratam si un total incasat de proiect in luna aia
  // (suma tuturor programatorilor), pe langa fiecare suma individuala.
  const revenueByMonth = useMemo(() => {
    if (!project) return [];
    const groups = new Map();
    for (const r of project.revenue) {
      const key = `${r.year}-${r.month}`;
      if (!groups.has(key)) groups.set(key, { year: r.year, month: r.month, entries: [], total: 0 });
      const g = groups.get(key);
      g.entries.push(r);
      g.total += r.amount;
    }
    return Array.from(groups.values());
  }, [project]);

  async function handleAssign(e) {
    e.preventDefault();
    if (!assignDeveloperId) return;
    try {
      await api.assignDeveloper(id, Number(assignDeveloperId));
      setAssignDeveloperId('');
      load();
    } catch (err) {
      setError(err.message);
    }
  }

  async function removeAssignment(developerId) {
    if (!window.confirm('Elimini acest programator de pe proiect? Istoricul lui de venituri pe acest proiect ramane.')) return;
    try {
      await api.removeAssignment(id, developerId);
      load();
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleRevenueSubmit(e) {
    e.preventDefault();
    if (!revenueForm.developer_id) {
      setError('Alege un programator.');
      return;
    }
    try {
      await api.setProjectRevenue(id, {
        ...revenueForm,
        developer_id: Number(revenueForm.developer_id),
        amount: Number(revenueForm.amount) || 0,
      });
      setRevenueForm({ ...emptyRevenueForm, year: revenueForm.year, month: revenueForm.month });
      load();
    } catch (err) {
      setError(err.message);
    }
  }

  async function removeRevenue(developerId, year, month) {
    if (!window.confirm('Stergi aceasta suma?')) return;
    try {
      await api.deleteProjectRevenue(id, developerId, year, month);
      load();
    } catch (err) {
      setError(err.message);
    }
  }

  async function removeProject() {
    if (!window.confirm(`Stergi proiectul "${project.name}"?`)) return;
    try {
      await api.deleteProject(id);
      navigate('/projects');
    } catch (err) {
      setError(err.message);
    }
  }

  if (!project) {
    return <div className="page">{error ? <p className="error-text">{error}</p> : <p>Se incarca...</p>}</div>;
  }

  return (
    <div className="page">
      <div className="page-header">
        <h1>{project.name}</h1>
        <button type="button" className="btn-danger-ghost" onClick={removeProject}>
          Sterge proiect
        </button>
      </div>

      {error && <p className="error-text">{error}</p>}

      <div className="card">
        <h2>Programatori alocati</h2>
        <p className="muted">
          Fiecare programator alocat aici poate primi propria suma, separata, in fiecare luna (mai
          jos). Un proiect cu mai multi programatori are o suma pentru fiecare dintre ei.
        </p>
        {project.developers.length === 0 && <p className="muted">Niciun programator alocat inca.</p>}
        {project.developers.length > 0 && (
          <ul className="plain-list">
            {project.developers.map((d) => (
              <li key={d.id} className="list-row">
                <span>{d.name}</span>
                <button type="button" className="btn-danger-ghost" onClick={() => removeAssignment(d.id)}>
                  Elimina
                </button>
              </li>
            ))}
          </ul>
        )}

        {unassignedDevelopers.length > 0 && (
          <form className="inline-form" onSubmit={handleAssign} style={{ marginTop: '1rem' }}>
            <select
              value={assignDeveloperId}
              onChange={(e) => setAssignDeveloperId(e.target.value)}
              required
            >
              <option value="">Alege programator...</option>
              {unassignedDevelopers.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
            <button type="submit" className="btn-primary">
              Aloca pe proiect
            </button>
          </form>
        )}
      </div>

      <div className="card">
        <h2>Adauga suma lunara</h2>
        <p className="muted">
          Suma incasata datorita acestui programator, pe acest proiect, in luna selectata.
        </p>
        {project.developers.length === 0 ? (
          <p className="muted">Aloca mai intai un programator pe proiect, ca sa poti adauga o suma.</p>
        ) : (
          <form className="inline-form" onSubmit={handleRevenueSubmit}>
            <select
              value={revenueForm.developer_id}
              onChange={(e) => setRevenueForm({ ...revenueForm, developer_id: e.target.value })}
              required
            >
              <option value="">Programator...</option>
              {project.developers.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
            <select
              value={revenueForm.month}
              onChange={(e) => setRevenueForm({ ...revenueForm, month: Number(e.target.value) })}
            >
              {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                <option key={m} value={m}>
                  {monthLabel(m)}
                </option>
              ))}
            </select>
            <input
              type="number"
              value={revenueForm.year}
              onChange={(e) => setRevenueForm({ ...revenueForm, year: Number(e.target.value) })}
              style={{ width: '6rem' }}
            />
            <input
              type="number"
              placeholder="Suma (EUR)"
              value={revenueForm.amount}
              onChange={(e) => setRevenueForm({ ...revenueForm, amount: e.target.value })}
              required
            />
            <input
              placeholder="Nota (optional)"
              value={revenueForm.note}
              onChange={(e) => setRevenueForm({ ...revenueForm, note: e.target.value })}
            />
            <button type="submit" className="btn-primary">
              Salveaza
            </button>
          </form>
        )}
      </div>

      <div className="card">
        <h2>Istoric venituri</h2>
        {revenueByMonth.length === 0 && <p className="muted">Nu exista inca venituri inregistrate.</p>}
        {revenueByMonth.length > 0 && (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Luna</th>
                  <th>Programator</th>
                  <th>Suma</th>
                  <th>Nota</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {revenueByMonth.map((group) => (
                  <Fragment key={`${group.year}-${group.month}`}>
                    {group.entries.map((r, idx) => (
                      <tr key={r.id}>
                        <td>{idx === 0 ? `${monthLabel(group.month)} ${group.year}` : ''}</td>
                        <td>{r.developer_name}</td>
                        <td>{formatMoney(r.amount)}</td>
                        <td className="muted">{r.note || '-'}</td>
                        <td className="actions-cell">
                          <button
                            type="button"
                            className="btn-danger-ghost"
                            onClick={() => removeRevenue(r.developer_id, r.year, r.month)}
                          >
                            Sterge
                          </button>
                        </td>
                      </tr>
                    ))}
                    {group.entries.length > 1 && (
                      <tr key={`${group.year}-${group.month}-total`} className="total-row">
                        <td></td>
                        <td>Total luna</td>
                        <td>{formatMoney(group.total)}</td>
                        <td></td>
                        <td></td>
                      </tr>
                    )}
                  </Fragment>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
