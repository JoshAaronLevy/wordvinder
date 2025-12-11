import { Button } from 'primereact/button'
import { Card } from 'primereact/card'
import { useNavigate } from 'react-router-dom'

function WordlePage() {
  const navigate = useNavigate()

  return (
    <section className="page">
      <Card className="stub-card" title="Wordle helper">
        <p className="muted">
          Stage 2 will add the Wordle attempt form, attempt history, and suggestion list powered by
          the migrated solver logic.
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

export default WordlePage
