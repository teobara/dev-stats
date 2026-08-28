import { NavLink } from 'react-router-dom';

export default function NavBar() {
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
    </header>
  );
}
