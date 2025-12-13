import { useEffect, useMemo, useState } from 'react'
import { Tag } from 'primereact/tag'
import AttemptsPanel from '../components/AttemptsPanel'
import AttemptForm from '../components/AttemptForm'
import SuggestionsPanel from '../components/SuggestionsPanel'
import { suggestWords } from '../logic/solver'
import type { Attempt, AttemptHints, LetterState } from '../types'
import { WORDLE_LETTER_COUNT } from '../types'
import { getWordleWordList } from '../../../shared/dictionary/englishWords'

const MAX_ATTEMPTS = 6

const letterStatePriority: Record<LetterState, number> = {
  correct: 3,
  present: 2,
  absent: 1,
}

const buildAttemptHints = (attempts: Attempt[]): AttemptHints => {
  const positionHints: (string | null)[] = Array(WORDLE_LETTER_COUNT).fill(null)
  const letterStates: Record<string, LetterState> = {}

  attempts.forEach((attempt) => {
    attempt.letters.forEach((slot, index) => {
      const letter = slot.letter.toUpperCase()

      if (slot.state === 'correct') {
        positionHints[index] = letter
      }

      const existing = letterStates[letter]
      if (!existing || letterStatePriority[slot.state] > letterStatePriority[existing]) {
        letterStates[letter] = slot.state
      }
    })
  })

  return { positionHints, letterStates }
}

function WordlePage() {
  const [attempts, setAttempts] = useState<Attempt[]>([])
  const [wordList, setWordList] = useState<string[]>([])
  const [isDictionaryLoading, setIsDictionaryLoading] = useState(true)
  const [dictionaryError, setDictionaryError] = useState<string | null>(null)

  const hasAttempts = attempts.length > 0

  useEffect(() => {
    let isMounted = true
    getWordleWordList()
      .then((words) => {
        if (!isMounted) return
        setWordList(words)
        setDictionaryError(null)
      })
      .catch((error: Error) => {
        if (!isMounted) return
        console.error(error)
        setDictionaryError('Unable to load dictionary data.')
        setWordList([])
      })
      .finally(() => {
        if (isMounted) {
          setIsDictionaryLoading(false)
        }
      })

    return () => {
      isMounted = false
    }
  }, [])

  const suggestions = useMemo(() => {
    if (!hasAttempts || !wordList.length) {
      return []
    }
    return suggestWords(attempts, wordList)
  }, [attempts, hasAttempts, wordList])
  const attemptHints = useMemo(() => buildAttemptHints(attempts), [attempts])

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
          <AttemptForm
            onSubmit={handleAddAttempt}
            isDisabled={attempts.length >= MAX_ATTEMPTS}
            hints={attemptHints}
          />
          <AttemptsPanel attempts={attempts} onReset={handleReset} maxAttempts={MAX_ATTEMPTS} />
        </div>
        <div className="wordle-column">
          <SuggestionsPanel
            suggestions={suggestions}
            hasAttempts={hasAttempts}
            isDictionaryLoading={isDictionaryLoading}
            dictionaryError={dictionaryError}
          />
        </div>
      </div>
    </section>
  )
}

export default WordlePage
