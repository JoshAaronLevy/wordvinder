import { NavLink, Outlet } from 'react-router-dom'
import { navLinks } from '../routes'

function Layout() {
  return (
    <div className="layout">
      <header className="app-header">
        <NavLink to="/" className="brand">
          <span className="brand-icon pi pi-compass" aria-hidden />
          <span className="brand-name">Word Vinder</span>
        </NavLink>

        <nav className="nav-links">
          {navLinks.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) => `nav-link ${isActive ? 'is-active' : ''}`}
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
      </header>

      <main className="app-main">
        <div className="content">
          <Outlet />
        </div>
      </main>
    </div>
  )
}

export default Layout
