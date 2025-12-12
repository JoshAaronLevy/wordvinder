import { useMemo, useState, type FormEvent } from 'react'
import { Button } from 'primereact/button'
import { Card } from 'primereact/card'
import { InputText } from 'primereact/inputtext'
import { SelectButton } from 'primereact/selectbutton'
import { toAlphaUpper } from '../../../shared/utils/string'
import type { Attempt, LetterState } from '../types'

type AttemptFormProps = {
  onSubmit: (attempt: Attempt) => void
  isDisabled?: boolean
}

const LETTER_COUNT = 5

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

function AttemptForm({ onSubmit, isDisabled }: AttemptFormProps) {
  const [letters, setLetters] = useState<string[]>(Array(LETTER_COUNT).fill(''))
  const [states, setStates] = useState<(LetterState | null)[]>(Array(LETTER_COUNT).fill(null))

  const areLettersFilled = useMemo(
    () => letters.every((letter) => letter.length === 1),
    [letters],
  )
  const areStatesSelected = useMemo(() => states.every((state) => state !== null), [states])
  const isComplete = areLettersFilled && areStatesSelected

  const handleLetterChange = (index: number, value: string) => {
    const next = [...letters]
    next[index] = toAlphaUpper(value)
    setLetters(next)
  }

  const handleStateChange = (index: number, value: LetterState) => {
    const next = [...states]
    next[index] = value
    setStates(next)
  }

  const resetForm = (preserveCorrect = false) => {
    if (preserveCorrect) {
      const nextLetters = letters.map((letter, index) =>
        states[index] === 'correct' ? letter : '',
      )
      const nextStates = states.map((state) => (state === 'correct' ? state : null))
      setLetters(nextLetters)
      setStates(nextStates)
      return
    }
    setLetters(Array(LETTER_COUNT).fill(''))
    setStates(Array(LETTER_COUNT).fill(null))
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
          {Array.from({ length: LETTER_COUNT }).map((_, index) => (
            <div key={index} className="letter-cell">
              <label className="label">Letter {index + 1}</label>
              <InputText
                value={letters[index]}
                onChange={(e) => handleLetterChange(index, e.target.value)}
                maxLength={1}
                aria-label={`Letter ${index + 1}`}
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
          ))}
        </div>

        <div className="actions">
          <Button
            type="submit"
            label="Add attempt"
            icon="pi pi-plus"
            disabled={!isComplete || isDisabled}
          />
          <Button type="button" label="Clear letters" outlined onClick={() => resetForm()} />
        </div>
      </form>
    </Card>
  )
}

export default AttemptForm
