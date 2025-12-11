import { Button } from 'primereact/button'
import { Card } from 'primereact/card'
import { useNavigate } from 'react-router-dom'

function QuartilesPage() {
  const navigate = useNavigate()

  return (
    <section className="page">
      <Card className="stub-card" title="Quartiles helper">
        <p className="muted">
          Stage 3 will bring the tile board, selection controls, and word combination results using
          the migrated generator logic.
        </p>
        <div className="actions">
          <Button
            label="Back home"
            icon="pi pi-arrow-left"
            severity="secondary"
            outlined
            onClick={() => navigate('/')}
          />
        </div>
      </Card>
    </section>
  )
}

export default QuartilesPage
