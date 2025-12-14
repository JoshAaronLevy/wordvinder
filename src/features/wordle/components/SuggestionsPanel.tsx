import { useEffect, useState } from 'react'
import { Card } from 'primereact/card'
import { Message } from 'primereact/message'
import { Tag } from 'primereact/tag'
import useMinimumDelay from '../../../shared/hooks/useMinimumDelay'

type SuggestionsPanelProps = {
  suggestions: string[]
  hasAttempts: boolean
  isDictionaryLoading: boolean
  dictionaryError: string | null
}

function SuggestionsPanel({
  suggestions,
  hasAttempts,
  isDictionaryLoading,
  dictionaryError,
}: SuggestionsPanelProps) {
  const count = suggestions.length
  const hasMatches = count > 0
  const [isRecomputing, setIsRecomputing] = useState(false)
  const showFiltering = useMinimumDelay(isRecomputing, 200)
  const [animateIn, setAnimateIn] = useState(false)

  useEffect(() => {
    if (!hasAttempts || isDictionaryLoading || dictionaryError) {
      setIsRecomputing(false)
      return
    }

    setIsRecomputing(true)
    const frame = window.requestAnimationFrame(() => setIsRecomputing(false))
    return () => window.cancelAnimationFrame(frame)
  }, [suggestions, hasAttempts, isDictionaryLoading, dictionaryError])

  useEffect(() => {
    if (!hasAttempts || !hasMatches) {
      setAnimateIn(false)
      return
    }

    setAnimateIn(true)
    const timeout = window.setTimeout(() => setAnimateIn(false), 250)
    return () => window.clearTimeout(timeout)
  }, [suggestions, hasAttempts, hasMatches])

  return (
    <Card className="wordle-card" title="Possible words">
      {dictionaryError ? (
        <Message severity="error" text={dictionaryError} />
      ) : isDictionaryLoading ? (
        <Message severity="info" text="Loading dictionary data..." />
      ) : (
        <>
          {hasAttempts && (
            <div className="suggestions-summary">
              <Tag value={`${count} matches`} severity="info" />
            </div>
          )}

          {showFiltering && !dictionaryError && !isDictionaryLoading && hasAttempts && (
            <div className="results-progress" aria-live="polite">
              Filtering possible words…
            </div>
          )}

          {!hasAttempts ? (
            <Message
              severity="info"
              text="Enter at least one attempt to generate possible matches."
            />
          ) : !hasMatches ? (
            <Message
              severity="warn"
              text="No matches yet. Add or adjust attempts to refine suggestions."
            />
          ) : (
            <div
              className={`suggestions-grid${animateIn ? ' suggestions-enter' : ''}`}
              aria-live="polite"
            >
              {suggestions.map((word) => (
                <span key={word} className="suggestion-pill">
                  {word.toUpperCase()}
                </span>
              ))}
            </div>
          )}
        </>
      )}
    </Card>
  )
}

export default SuggestionsPanel
