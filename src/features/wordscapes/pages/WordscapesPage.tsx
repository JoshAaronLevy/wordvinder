import { Button } from 'primereact/button'
import { Card } from 'primereact/card'
import { useNavigate } from 'react-router-dom'

function WordscapesPage() {
  const navigate = useNavigate()

  return (
    <section className="page">
      <Card className="stub-card" title="Wordscapes helper">
        <p className="muted">
          Stage 4 will include the Word Trip-style letter inputs, optional word-length filter, and
          grouped results using the migrated word search logic.
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

export default WordscapesPage
