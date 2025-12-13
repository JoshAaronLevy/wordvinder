import type { FocusEvent } from 'react'
import { useEffect, useState } from 'react'
import { NavLink, Outlet, useLocation } from 'react-router-dom'
import wordVinderLogo from '../../assets/Word-Vinder-Logo.png'
import { gameLinks } from '../routes'

type ThemeMode = 'light' | 'dark'

function Layout() {
  const location = useLocation()
  const [isGameMenuOpen, setIsGameMenuOpen] = useState(false)
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false)
  const [themeMode, setThemeMode] = useState<ThemeMode>('light')

  const isGameRouteActive = gameLinks.some((link) => location.pathname.startsWith(link.path))

  useEffect(() => {
    const storedTheme = localStorage.getItem('theme-mode')
    if (storedTheme === 'light' || storedTheme === 'dark') {
      setThemeMode(storedTheme)
      return
    }

    if (window.matchMedia?.('(prefers-color-scheme: dark)').matches) {
      setThemeMode('dark')
    }
  }, [])

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', themeMode)
    localStorage.setItem('theme-mode', themeMode)
  }, [themeMode])

  useEffect(() => {
    setIsGameMenuOpen(false)
    setIsMobileNavOpen(false)
  }, [location.pathname])

  const handleGameMenuBlur = (event: FocusEvent<HTMLDivElement>) => {
    if (!event.currentTarget.contains(event.relatedTarget)) {
      setIsGameMenuOpen(false)
    }
  }

  const toggleTheme = () => {
    setThemeMode((prev) => (prev === 'light' ? 'dark' : 'light'))
  }

  const toggleMobileNav = () => {
    setIsMobileNavOpen((prev) => !prev)
  }

  const closeMobileNav = () => {
    setIsMobileNavOpen(false)
  }

  return (
    <div className="layout">
      <header className="app-header">
        <NavLink to="/" className="brand">
          <img src={wordVinderLogo} alt="Word Vinder logo" className="brand-logo" />
          <span className="brand-name">Word Vinder</span>
        </NavLink>

        <button
          type="button"
          className="mobile-menu-toggle"
          aria-expanded={isMobileNavOpen}
          aria-label={isMobileNavOpen ? 'Close menu' : 'Open menu'}
          aria-controls="primary-navigation"
          onClick={toggleMobileNav}
        >
          <i className={`pi ${isMobileNavOpen ? 'pi-times' : 'pi-bars'}`} aria-hidden />
        </button>

        <nav className={`nav-links ${isMobileNavOpen ? 'is-open' : ''}`} id="primary-navigation">
          <NavLink to="/" className={({ isActive }) => `nav-link ${isActive ? 'is-active' : ''}`}>
            Home
          </NavLink>

          <div className="game-menu" onBlur={handleGameMenuBlur}>
            <button
              type="button"
              className={`nav-link menu-button ${isGameMenuOpen || isGameRouteActive ? 'is-active' : ''}`}
              aria-expanded={isGameMenuOpen}
              aria-haspopup="menu"
              onClick={() => setIsGameMenuOpen((open) => !open)}
            >
              <span>Game Type</span>
              <i
                className={`pi ${isGameMenuOpen ? 'pi-chevron-up' : 'pi-chevron-down'}`}
                aria-hidden
              />
            </button>

            <div className={`menu-panel ${isGameMenuOpen ? 'is-open' : ''}`} role="menu">
              {gameLinks.map((item) => (
                <NavLink
                  key={item.path}
                  to={item.path}
                  className={({ isActive }) => `menu-link ${isActive ? 'is-active' : ''}`}
                  role="menuitem"
                >
                  {item.label}
                </NavLink>
              ))}
            </div>
          </div>

          <button
            type="button"
            className="theme-toggle"
            onClick={toggleTheme}
            aria-label={`Switch to ${themeMode === 'light' ? 'dark' : 'light'} mode`}
            title={`Switch to ${themeMode === 'light' ? 'dark' : 'light'} mode`}
          >
            <i className={`pi ${themeMode === 'light' ? 'pi-moon' : 'pi-sun'}`} aria-hidden />
          </button>
        </nav>
      </header>

      <div
        className={`mobile-menu-backdrop ${isMobileNavOpen ? 'is-visible' : ''}`}
        onClick={closeMobileNav}
        aria-hidden
      />

      <main className="app-main">
        <div className="content">
          <Outlet />
        </div>
      </main>
    </div>
  )
}

export default Layout
