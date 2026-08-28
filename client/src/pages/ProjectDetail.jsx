import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../api.js';
import { formatMoney, monthLabel } from '../format.js';

const now = new Date();
const emptyRevenueForm = {
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

  const [assignForm, setAssignForm] = useState({ developer_id: '', share_percent: 100 });
  const [revenueForm, setRevenueForm] = useState(emptyRevenueForm);

  function load() {
    api.getProject(id).then(setProject).catch((err) => setError(err.message));
    api.getDevelopers().then(setAllDevelopers).catch((err) => setError(err.message));
  }

  useEffect(load, [id]);

  const unassignedDevelopers = allDevelopers.filter(
    (d) => !project?.developers.some((pd) => pd.id === d.id)
  );

  const totalShare = project ? project.developers.reduce((sum, d) => sum + d.share_percent, 0) : 0;

  async function handleAssign(e) {
    e.preventDefault();
    if (!assignForm.developer_id) return;
    try {
      await api.assignDeveloper(id, {
        developer_id: Number(assignForm.developer_id),
        share_percent: Number(assignForm.share_percent) || 0,
      });
      setAssignForm({ developer_id: '', share_percent: 100 });
      load();
    } catch (err) {
      setError(err.message);
    }
  }

  async function updateShare(developerId, sharePercent) {
    try {
      await api.updateAssignment(id, developerId, { share_percent: Number(sharePercent) || 0 });
      load();
    } catch (err) {
      setError(err.message);
    }
  }

  async function removeAssignment(developerId) {
    if (!window.confirm('Elimini acest programator de pe proiect?')) return;
    try {
      await api.removeAssignment(id, developerId);
      load();
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleRevenueSubmit(e) {
    e.preventDefault();
    try {
      await api.setProjectRevenue(id, {
        ...revenueForm,
        amount: Number(revenueForm.amount) || 0,
      });
      setRevenueForm({ ...emptyRevenueForm, year: revenueForm.year, month: revenueForm.month });
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
          Procentul reprezinta ce parte din venitul lunar al proiectului se atribuie fiecarui
          programator, pentru calculul veniturilor lui in Dashboard.
        </p>
        {totalShare !== 100 && project.developers.length > 0 && (
          <p className="warning-text">Atentie: procentele alocate insumeaza {totalShare}%, nu 100%.</p>
        )}
        {project.developers.length === 0 && <p className="muted">Niciun programator alocat inca.</p>}
        {project.developers.length > 0 && (
          <table>
            <thead>
              <tr>
                <th>Programator</th>
                <th>% din venit</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {project.developers.map((d) => (
                <tr key={d.id}>
                  <td>{d.name}</td>
                  <td>
                    <input
                      type="number"
                      defaultValue={d.share_percent}
                      className="share-input"
                      onBlur={(e) => updateShare(d.id, e.target.value)}
                    />{' '}
                    %
                  </td>
                  <td className="actions-cell">
                    <button type="button" className="btn-danger-ghost" onClick={() => removeAssignment(d.id)}>
                      Elimina
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {unassignedDevelopers.length > 0 && (
          <form className="inline-form" onSubmit={handleAssign} style={{ marginTop: '1rem' }}>
            <select
              value={assignForm.developer_id}
              onChange={(e) => setAssignForm({ ...assignForm, developer_id: e.target.value })}
              required
            >
              <option value="">Alege programator...</option>
              {unassignedDevelopers.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
            <input
              type="number"
              value={assignForm.share_percent}
              onChange={(e) => setAssignForm({ ...assignForm, share_percent: e.target.value })}
              style={{ width: '5rem' }}
            />
            <span className="muted">%</span>
            <button type="submit" className="btn-primary">
              Aloca
            </button>
          </form>
        )}
      </div>

      <div className="card">
        <h2>Adauga venit lunar</h2>
        <p className="muted">Suma totala incasata pentru acest proiect, in luna selectata.</p>
        <form className="inline-form" onSubmit={handleRevenueSubmit}>
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
            placeholder="Suma incasata (RON)"
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
      </div>

      <div className="card">
        <h2>Istoric venituri</h2>
        {project.revenue.length === 0 && <p className="muted">Nu exista inca venituri inregistrate.</p>}
        {project.revenue.length > 0 && (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Luna</th>
                  <th>Suma incasata</th>
                  <th>Nota</th>
                </tr>
              </thead>
              <tbody>
                {project.revenue.map((r) => (
                  <tr key={`${r.year}-${r.month}`}>
                    <td>
                      {monthLabel(r.month)} {r.year}
                    </td>
                    <td>{formatMoney(r.amount)}</td>
                    <td className="muted">{r.note || '-'}</td>
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
