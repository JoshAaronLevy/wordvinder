import { useMemo, useState } from 'react'
import { Tag } from 'primereact/tag'
import AttemptsPanel from '../components/AttemptsPanel'
import AttemptForm from '../components/AttemptForm'
import SuggestionsPanel from '../components/SuggestionsPanel'
import { suggestWords } from '../logic/solver'
import type { Attempt } from '../types'

const MAX_ATTEMPTS = 6

function WordlePage() {
  const [attempts, setAttempts] = useState<Attempt[]>([])

  const hasAttempts = attempts.length > 0

  const suggestions = useMemo(
    () => (hasAttempts ? suggestWords(attempts) : []),
    [attempts, hasAttempts],
  )

  const handleAddAttempt = (attempt: Attempt) => {
    if (attempts.length >= MAX_ATTEMPTS) return
    setAttempts((prev) => [...prev, attempt])
  }

  const handleReset = () => setAttempts([])

  return (
    <section className="page">
      <div className="page-header">
        <div>
          <p className="eyebrow">Wordle Vinder (Finder)</p>
          <h1>Track attempts and narrow 5-letter answers</h1>
          <p className="muted">
            Enter each guess with tile states. Suggestions update after every row. Up to six
            attempts are supported.
          </p>
        </div>
        <div className="header-tags">
          <Tag value={`${attempts.length}/${MAX_ATTEMPTS} attempts`} severity="info" />
          <Tag value={`${suggestions.length} matches`} severity="success" />
        </div>
      </div>

      <div className="wordle-layout">
        <div className="wordle-column">
          <AttemptForm onSubmit={handleAddAttempt} isDisabled={attempts.length >= MAX_ATTEMPTS} />
          <AttemptsPanel attempts={attempts} onReset={handleReset} maxAttempts={MAX_ATTEMPTS} />
        </div>
        <div className="wordle-column">
          <SuggestionsPanel suggestions={suggestions} hasAttempts={hasAttempts} />
        </div>
      </div>
    </section>
  )
}

export default WordlePage
