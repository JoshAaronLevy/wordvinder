import { Button } from 'primereact/button'
import { Card } from 'primereact/card'
import { Divider } from 'primereact/divider'
import { Tag } from 'primereact/tag'
import './App.css'

function App() {
  return (
    <div className="app-shell">
      <Card className="app-card" title="word-vinder setup">
        <p className="muted">
          Vite + React + TypeScript are running with PrimeReact, PrimeFlex, PrimeIcons, and
          React Router already wired. Next stages will add layout, routing, and the three game
          helpers.
        </p>
        <Divider />
        <div className="tag-row">
          <Tag value="PrimeReact" icon="pi pi-prime" severity="info" />
          <Tag value="PrimeFlex" icon="pi pi-sliders-h" severity="success" />
          <Tag value="PrimeIcons" icon="pi pi-bolt" severity="warning" />
          <Tag value="React Router" icon="pi pi-directions" severity="info" />
        </div>
        <div className="actions">
          <Button
            label="View plan"
            icon="pi pi-book"
            onClick={() => window.open('/mvp-implementation-plan.md', '_blank', 'noreferrer')}
          />
          <Button
            label="PrimeReact docs"
            icon="pi pi-external-link"
            severity="secondary"
            outlined
            onClick={() => window.open('https://primereact.org', '_blank', 'noreferrer')}
          />
        </div>
      </Card>
    </div>
  )
}

export default App
