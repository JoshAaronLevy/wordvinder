import { Button } from 'primereact/button'
import { Card } from 'primereact/card'
import type { Attempt } from '../types'

type AttemptsPanelProps = {
  attempts: Attempt[]
  onReset: () => void
  maxAttempts: number
}

function AttemptsPanel({ attempts, onReset, maxAttempts }: AttemptsPanelProps) {
  const remaining = Math.max(0, maxAttempts - attempts.length)

  return (
    <Card
      className="wordle-card"
      title="Your attempts"
      subTitle={`${attempts.length}/${maxAttempts} entered`}
    >
      <div className="attempts-list">
        {attempts.length === 0 && <p className="muted">No attempts yet. Enter a row to begin.</p>}

        {attempts.map((attempt, idx) => (
          <div key={idx} className="attempt-row">
            {attempt.letters.map((slot, letterIdx) => (
              <span
                key={`${idx}-${letterIdx}`}
                className={`attempt-tag letter-state-${slot.state}`}
                aria-label={`${slot.letter.toUpperCase()} is ${slot.state}`}
              >
                {slot.letter.toUpperCase()}
              </span>
            ))}
          </div>
        ))}
      </div>

      <div className="attempts-footer">
        <span className="muted">Remaining rows: {remaining}</span>
        <Button
          type="button"
          label="Reset attempts"
          icon="pi pi-refresh"
          severity="secondary"
          outlined
          onClick={onReset}
          disabled={!attempts.length}
        />
      </div>
    </Card>
  )
}

export default AttemptsPanel
