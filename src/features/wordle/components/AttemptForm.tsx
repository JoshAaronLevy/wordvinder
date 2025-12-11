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

const stateOptions: { label: string; value: LetterState }[] = [
  { label: 'Absent', value: 'absent' },
  { label: 'Present', value: 'present' },
  { label: 'Correct', value: 'correct' },
]

function AttemptForm({ onSubmit, isDisabled }: AttemptFormProps) {
  const [letters, setLetters] = useState<string[]>(Array(LETTER_COUNT).fill(''))
  const [states, setStates] = useState<LetterState[]>(Array(LETTER_COUNT).fill('absent'))

  const isComplete = useMemo(
    () => letters.every((letter) => letter.length === 1),
    [letters],
  )

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

  const resetForm = () => {
    setLetters(Array(LETTER_COUNT).fill(''))
    setStates(Array(LETTER_COUNT).fill('absent'))
  }

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!isComplete || isDisabled) return

    const attempt: Attempt = {
      letters: letters.map((letter, index) => ({
        letter,
        state: states[index],
      })),
    }
    onSubmit(attempt)
    resetForm()
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
                optionLabel="label"
                optionValue="value"
                onChange={(e) => handleStateChange(index, e.value)}
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
          <Button type="button" label="Clear letters" outlined onClick={resetForm} />
        </div>
      </form>
    </Card>
  )
}

export default AttemptForm
