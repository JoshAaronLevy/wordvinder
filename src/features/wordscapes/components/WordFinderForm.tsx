import { useMemo, useState, type FormEvent } from 'react'
import { Button } from 'primereact/button'
import { Card } from 'primereact/card'
import { Dropdown } from 'primereact/dropdown'
import { InputText } from 'primereact/inputtext'
import { Message } from 'primereact/message'
import { toAlphaUpper } from '../../../shared/utils/string'
import type { WordFinderSubmission } from '../types'

type Option = {
  label: string
  value: number
}

type WordFinderFormProps = {
  onSubmit: (payload: WordFinderSubmission) => void
  onReset: () => void
}

const letterCountOptions: Option[] = [4, 5, 6, 7, 8].map((count) => ({
  label: `${count} letters`,
  value: count,
}))

const wordLengthOptions: Option[] = [3, 4, 5, 6, 7, 8].map((len) => ({
  label: `${len} letters`,
  value: len,
}))

function WordFinderForm({ onSubmit, onReset }: WordFinderFormProps) {
  const [letterCount, setLetterCount] = useState<number | null>(null)
  const [wordLength, setWordLength] = useState<number | null>(null)
  const [letters, setLetters] = useState<string[]>([])
  const [submitted, setSubmitted] = useState(false)

  const letterInputsVisible = !!letterCount

  const normalizedLetters = useMemo(
    () => letters.map((l) => l.trim().toUpperCase()),
    [letters],
  )

  const lettersIncomplete =
    !letterCount ||
    normalizedLetters.length !== letterCount ||
    normalizedLetters.some((l) => l.length !== 1)

  const canSubmit = !lettersIncomplete

  const handleLetterCountChange = (value: number | null) => {
    setLetterCount(value)
    setSubmitted(false)
    if (!value) {
      setLetters([])
      return
    }
    const nextLetters = Array.from({ length: value }, (_, idx) => normalizedLetters[idx] ?? '')
    setLetters(nextLetters)
  }

  const handleLetterChange = (index: number, value: string) => {
    const next = [...letters]
    next[index] = toAlphaUpper(value)
    setLetters(next)
  }

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setSubmitted(true)
    if (!canSubmit || !letterCount) return

    onSubmit({
      letters: normalizedLetters,
      letterCount,
      wordLength: wordLength ?? undefined,
    })
  }

  const handleReset = () => {
    setLetterCount(null)
    setWordLength(null)
    setLetters([])
    setSubmitted(false)
    onReset()
  }

  const showLetterError = submitted && lettersIncomplete

  return (
    <Card className="wordscapes-card" title="Set up your level">
      <form className="wordscapes-form" onSubmit={handleSubmit}>
        <div className="field-grid">
          <div className="field">
            <label className="label" htmlFor="word-length">
              Target word length (optional)
            </label>
            <Dropdown
              id="word-length"
              value={wordLength}
              options={wordLengthOptions}
              onChange={(e) => setWordLength(e.value)}
              placeholder="All lengths (3–8)"
              showClear
              aria-label="Target word length"
            />
          </div>
          <div className="field">
            <label className="label" htmlFor="letter-count">
              Number of available letters
            </label>
            <Dropdown
              id="letter-count"
              value={letterCount}
              options={letterCountOptions}
              onChange={(e) => handleLetterCountChange(e.value)}
              placeholder="Choose 4–8 letters"
              aria-label="Number of available letters"
            />
            {!letterInputsVisible && (
              <Message severity="info" text="Select how many letters to reveal inputs." />
            )}
          </div>
        </div>

        {letterInputsVisible && (
          <div className="letters-panel">
            <div className="letters-header">
              <h4>Enter your letters</h4>
              <span className="muted">Letters only, one per box. Duplicates are allowed.</span>
            </div>
            <div className="letters-grid">
              {Array.from({ length: letterCount ?? 0 }).map((_, idx) => (
                <div key={idx} className="letter-input">
                  <InputText
                    inputMode="text"
                    maxLength={1}
                    value={letters[idx] ?? ''}
                    onChange={(e) => handleLetterChange(idx, e.target.value)}
                    aria-label={`Letter ${idx + 1}`}
                    aria-invalid={showLetterError}
                    autoComplete="off"
                    spellCheck={false}
                  />
                </div>
              ))}
            </div>
            {showLetterError && (
              <Message severity="warn" text="Fill every letter box with a single letter." />
            )}
          </div>
        )}

        <div className="actions">
          <Button
            type="submit"
            label="Find words"
            icon="pi pi-search"
            disabled={!canSubmit}
            aria-disabled={!canSubmit}
          />
          <Button type="button" label="Reset" severity="secondary" outlined onClick={handleReset} />
        </div>
      </form>
    </Card>
  )
}

export default WordFinderForm
