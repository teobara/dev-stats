import { NavLink } from 'react-router-dom';

export default function NavBar({ user, onLogout }) {
  return (
    <header className="navbar">
      <div className="navbar-brand">Dev Profit Tracker</div>
      <nav className="navbar-links">
        <NavLink to="/" end className={({ isActive }) => (isActive ? 'active' : '')}>
          Dashboard
        </NavLink>
        <NavLink to="/developers" className={({ isActive }) => (isActive ? 'active' : '')}>
          Programatori
        </NavLink>
        <NavLink to="/projects" className={({ isActive }) => (isActive ? 'active' : '')}>
          Proiecte
        </NavLink>
      </nav>
      <div className="navbar-user">
        {user && <span className="muted">{user.username}</span>}
        <a className="btn-link" href="/api/backup" download title="Descarca toate datele ca fisier JSON">
          Backup
        </a>
        <button type="button" className="btn-link" onClick={onLogout}>
          Deconectare
        </button>
      </div>
    </header>
  );
}
