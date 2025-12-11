import { useMemo, useState } from 'react'
import { NavLink, Route, Routes, useNavigate } from 'react-router-dom'
import { Button } from 'primereact/button'
import { Card } from 'primereact/card'
import { Divider } from 'primereact/divider'
import { InputText } from 'primereact/inputtext'
import { Tag } from 'primereact/tag'
import './App.css'

const SAMPLE_WORDS = [
  'lexicon',
  'cipher',
  'riddle',
  'anagram',
  'puzzle',
  'clue',
  'solver',
  'matrix',
  'syntax',
  'vocabulary',
  'letters',
  'pattern',
]

function App() {
  return (
    <div className="app-shell">
      <Header />
      <main className="app-main">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/finder" element={<FinderPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </main>
    </div>
  )
}

function Header() {
  const navigate = useNavigate()

  return (
    <header className="app-header">
      <NavLink to="/" className="brand">
        <span className="brand-icon pi pi-compass" aria-hidden />
        <span className="brand-name">Word Vinder</span>
      </NavLink>

      <nav className="nav-links">
        <NavLink to="/" className={({ isActive }) => linkClass(isActive)}>
          Home
        </NavLink>
        <NavLink to="/finder" className={({ isActive }) => linkClass(isActive)}>
          Word Finder
        </NavLink>
      </nav>

      <Button
        label="Try it"
        icon="pi pi-play"
        severity="info"
        onClick={() => navigate('/finder')}
      />
    </header>
  )
}

function HomePage() {
  const navigate = useNavigate()

  return (
    <section className="app-content">
      <Card className="hero-card" title="PrimeReact is wired up">
        <p className="muted">
          PrimeReact styles, icons, and utilities are available globally. React
          Router is ready so you can add screens as you build Word Vinder.
        </p>
        <div className="button-row">
          <Button
            label="Open word finder"
            icon="pi pi-search"
            onClick={() => navigate('/finder')}
          />
          <Button
            label="PrimeReact docs"
            icon="pi pi-external-link"
            severity="secondary"
            outlined
            onClick={() =>
              window.open('https://primereact.org', '_blank', 'noreferrer')
            }
          />
        </div>
        <div className="tag-row">
          <Tag value="PrimeReact 10" icon="pi pi-prime" severity="info" />
          <Tag value="PrimeFlex" icon="pi pi-sliders-h" severity="success" />
          <Tag value="PrimeIcons" icon="pi pi-bolt" severity="warning" />
          <Tag value="React Router 7" icon="pi pi-directions" severity="info" />
        </div>
        <Divider />
        <div className="grid highlights">
          <Card title="Routing" subTitle="react-router-dom">
            <p>
              Define your screens with <code>Routes</code> and <code>Route</code>{' '}
              components. Navigation is handled by <code>NavLink</code> and the
              <code>useNavigate</code> hook.
            </p>
          </Card>
          <Card title="UI kit" subTitle="PrimeReact + PrimeFlex">
            <p>
              Components, icons, and utility classes are already imported in{' '}
              <code>main.tsx</code>. Use them anywhere without extra setup.
            </p>
          </Card>
          <Card title="Theming" subTitle="Lara light">
            <p>
              The Lara light blue theme is active. Swap the theme import in{' '}
              <code>main.tsx</code> to try a different look.
            </p>
          </Card>
        </div>
      </Card>
    </section>
  )
}

function FinderPage() {
  const [query, setQuery] = useState('')

  const matches = useMemo(() => {
    const cleaned = query.trim().toLowerCase()

    if (!cleaned) {
      return SAMPLE_WORDS
    }

    return SAMPLE_WORDS.filter((word) => word.toLowerCase().includes(cleaned))
  }, [query])

  return (
    <section className="app-content">
      <Card className="finder-card" title="Word Finder">
        <p className="muted">
          Type letters or a pattern to filter a sample word list. Replace this
          with your own word logic to power the game.
        </p>

        <div className="finder-form">
          <span className="p-input-icon-left flex-1">
            <i className="pi pi-search" />
            <InputText
              value={query}
              aria-label="Word filter"
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Start typing to filter..."
              className="flex-1"
            />
          </span>
          <Button
            label="Clear"
            icon="pi pi-times"
            severity="secondary"
            outlined
            onClick={() => setQuery('')}
            disabled={!query}
          />
        </div>

        <Divider />

        <div className="results">
          {matches.length ? (
            matches.map((word) => (
              <Tag
                key={word}
                value={word}
                icon="pi pi-hashtag"
                severity="info"
                className="result-tag"
              />
            ))
          ) : (
            <div className="empty-state">
              <i className="pi pi-info-circle" aria-hidden />
              <p>No matching words yet. Try a different pattern.</p>
            </div>
          )}
        </div>
      </Card>
    </section>
  )
}

function NotFoundPage() {
  return (
    <section className="app-content">
      <Card>
        <div className="empty-state">
          <i className="pi pi-compass" aria-hidden />
          <p>That page was not found. Use the navigation above to continue.</p>
        </div>
      </Card>
    </section>
  )
}

function linkClass(isActive: boolean) {
  return `nav-link ${isActive ? 'is-active' : ''}`
}

export default App
