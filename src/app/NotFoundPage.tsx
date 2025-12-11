import { Button } from 'primereact/button'
import { Card } from 'primereact/card'
import { useNavigate } from 'react-router-dom'

function NotFoundPage() {
  const navigate = useNavigate()

  return (
    <section className="page">
      <Card className="stub-card" title="Page not found">
        <p className="muted">That route does not exist yet. Head back to the home page.</p>
        <Button label="Go home" icon="pi pi-arrow-left" onClick={() => navigate('/')} />
      </Card>
    </section>
  )
}

export default NotFoundPage
