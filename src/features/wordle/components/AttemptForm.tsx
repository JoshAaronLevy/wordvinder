import { useMemo, useState, type FormEvent } from 'react'
import { Button } from 'primereact/button'
import { Card } from 'primereact/card'
import { InputText } from 'primereact/inputtext'
import { SelectButton } from 'primereact/selectbutton'
import { toAlphaUpper } from '../../../shared/utils/string'
import type { Attempt, AttemptHints, LetterState } from '../types'
import { WORDLE_LETTER_COUNT } from '../types'

type AttemptFormProps = {
  onSubmit: (attempt: Attempt) => void
  isDisabled?: boolean
  hints: AttemptHints
}

type StateOption = {
  label: string
  value: LetterState
}

const stateOptions: StateOption[] = [
  { label: 'Correct', value: 'correct' },
  { label: 'Present', value: 'present' },
  { label: 'Absent', value: 'absent' },
]

const renderStateOption = (option: StateOption) => (
  <span className="letter-state-option">
    <span className="sr-only">{option.label}</span>
    <span className={`letter-state-swatch ${option.value}`} aria-hidden="true" />
  </span>
)

function AttemptForm({ onSubmit, isDisabled, hints }: AttemptFormProps) {
  const { positionHints, letterStates } = hints
  const [letters, setLetters] = useState<string[]>(Array(WORDLE_LETTER_COUNT).fill(''))
  const [stateSelections, setStateSelections] = useState<(LetterState | null)[]>(
    Array(WORDLE_LETTER_COUNT).fill(null),
  )
  const states = useMemo(
    () =>
      stateSelections.map((state, index) => {
        if (positionHints[index]) {
          return 'correct'
        }
        return state
      }),
    [stateSelections, positionHints],
  )

  const areLettersFilled = useMemo(
    () => letters.every((letter) => letter.length === 1),
    [letters],
  )
  const areStatesSelected = useMemo(() => states.every((state) => state !== null), [states])
  const isComplete = areLettersFilled && areStatesSelected

  const determineStateFromLetter = (letter: string, index: number): LetterState | null => {
    if (!letter) {
      return positionHints[index] ? 'correct' : null
    }

    const upper = letter.toUpperCase()
    const correctLetter = positionHints[index]
    if (correctLetter && upper === correctLetter) {
      return 'correct'
    }

    const knownState = letterStates[upper]
    if (!knownState) {
      return null
    }

    if (knownState === 'correct') {
      return 'present'
    }

    return knownState
  }

  const handleLetterChange = (index: number, value: string) => {
    const formatted = toAlphaUpper(value)
    const next = [...letters]
    next[index] = formatted
    setLetters(next)

    const derivedState = determineStateFromLetter(formatted, index)
    if (positionHints[index]) return

    setStateSelections((prev) => {
      if (prev[index] === derivedState) return prev
      const updated = [...prev]
      updated[index] = derivedState
      return updated
    })
  }

  const handleStateChange = (index: number, value: LetterState) => {
    if (positionHints[index]) return

    const next = [...stateSelections]
    next[index] = value
    setStateSelections(next)
  }

  const resetForm = (preserveCorrect = false) => {
    setLetters(Array(WORDLE_LETTER_COUNT).fill(''))
    if (preserveCorrect) {
      setStateSelections((prev) =>
        prev.map((_, index) => {
          if (!positionHints[index] && states[index] === 'correct') {
            return 'correct'
          }
          return null
        }),
      )
      return
    }

    setStateSelections(Array(WORDLE_LETTER_COUNT).fill(null))
  }

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!areLettersFilled || !areStatesSelected || isDisabled) return

    const attempt: Attempt = {
      letters: letters.map((letter, index) => ({
        letter,
        state: states[index]!,
      })),
    }
    onSubmit(attempt)
    resetForm(true)
  }

  return (
    <Card className="wordle-card" title="Enter attempt">
      <form className="wordle-form" onSubmit={handleSubmit}>
        <div className="letter-grid">
          {Array.from({ length: WORDLE_LETTER_COUNT }).map((_, index) => {
            const state = states[index]
            const inputClassName = state ? `letter-input ${state}` : 'letter-input'
            return (
              <div key={index} className="letter-cell">
                <InputText
                  value={letters[index]}
                  onChange={(e) => handleLetterChange(index, e.target.value)}
                  maxLength={1}
                  aria-label={`Letter ${index + 1}`}
                  placeholder={positionHints[index] ?? undefined}
                  className={`${inputClassName} focus-ring-target`}
                />
                <SelectButton
                  value={states[index]}
                  options={stateOptions}
                  optionValue="value"
                  onChange={(e) => handleStateChange(index, e.value)}
                  itemTemplate={renderStateOption}
                  className="letter-state-select"
                  aria-label={`State for letter ${index + 1}`}
                />
              </div>
            )
          })}
        </div>

        <div className="actions">
          <Button
            type="submit"
            label="Add attempt"
            icon="pi pi-plus"
            disabled={!isComplete || isDisabled}
            className="interactive-pressable"
          />
          <Button
            type="button"
            label="Clear letters"
            outlined
            onClick={() => resetForm()}
            className="interactive-pressable"
          />
        </div>
      </form>
    </Card>
  )
}

export default AttemptForm
