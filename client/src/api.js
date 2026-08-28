const BASE = '/api';

async function request(path, options = {}) {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });

  if (!res.ok) {
    let message = `Eroare ${res.status}`;
    try {
      const data = await res.json();
      if (data && data.error) message = data.error;
    } catch (_) {
      /* ignoram raspunsuri fara body JSON */
    }
    throw new Error(message);
  }

  if (res.status === 204) return null;
  return res.json();
}

export const api = {
  login: (username, password) =>
    request('/auth/login', { method: 'POST', body: JSON.stringify({ username, password }) }),
  logout: () => request('/auth/logout', { method: 'POST' }),
  me: () => request('/auth/me'),

  getDevelopers: () => request('/developers'),
  getDeveloper: (id) => request(`/developers/${id}`),
  createDeveloper: (data) => request('/developers', { method: 'POST', body: JSON.stringify(data) }),
  updateDeveloper: (id, data) =>
    request(`/developers/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteDeveloper: (id) => request(`/developers/${id}`, { method: 'DELETE' }),
  setDeveloperCost: (id, data) =>
    request(`/developers/${id}/cost`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteDeveloperCost: (id, year, month) =>
    request(`/developers/${id}/cost/${year}/${month}`, { method: 'DELETE' }),

  getProjects: () => request('/projects'),
  getProject: (id) => request(`/projects/${id}`),
  createProject: (data) => request('/projects', { method: 'POST', body: JSON.stringify(data) }),
  updateProject: (id, data) =>
    request(`/projects/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteProject: (id) => request(`/projects/${id}`, { method: 'DELETE' }),
  assignDeveloper: (projectId, data) =>
    request(`/projects/${projectId}/developers`, { method: 'POST', body: JSON.stringify(data) }),
  updateAssignment: (projectId, developerId, data) =>
    request(`/projects/${projectId}/developers/${developerId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
  removeAssignment: (projectId, developerId) =>
    request(`/projects/${projectId}/developers/${developerId}`, { method: 'DELETE' }),
  setProjectRevenue: (projectId, data) =>
    request(`/projects/${projectId}/revenue`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteProjectRevenue: (projectId, year, month) =>
    request(`/projects/${projectId}/revenue/${year}/${month}`, { method: 'DELETE' }),

  getMonthlySummary: (year, month) => request(`/summary?year=${year}&month=${month}`),
  getDeveloperTrend: (id, months = 12) => request(`/summary/developer/${id}?months=${months}`),
};
