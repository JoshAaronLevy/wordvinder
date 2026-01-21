import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type FormEvent,
  type KeyboardEvent,
} from 'react'
import { Button } from 'primereact/button'
import { Card } from 'primereact/card'
import { Dropdown } from 'primereact/dropdown'
import { InputText } from 'primereact/inputtext'
import { Message } from 'primereact/message'
import { MultiSelect } from 'primereact/multiselect'
import type { MultiSelectChangeEvent } from 'primereact/multiselect'
import { toAlphaUpper } from '../../../shared/utils/string'
import type { WordFinderSubmission } from '../types'

type Option = {
  label: string
  value: number
}

type WordFinderFormProps = {
  onSubmit: (payload: WordFinderSubmission) => void
  onReset: () => void
  isDictionaryReady: boolean
}

const letterCountOptions: Option[] = [3, 4, 5, 6, 7].map((count) => ({
  label: `${count} letters`,
  value: count,
}))

const wordLengthChoices = [3, 4, 5, 6, 7]

const letterWheelSize = 260
const letterNodeSize = 58
const DEFAULT_LETTER_COUNT = 4

function WordFinderForm({ onSubmit, onReset, isDictionaryReady }: WordFinderFormProps) {
  const [letterCount, setLetterCount] = useState<number>(DEFAULT_LETTER_COUNT)
  const [wordLengths, setWordLengths] = useState<number[]>([])
  const [letters, setLetters] = useState<string[]>(Array.from({ length: DEFAULT_LETTER_COUNT }, () => ''))
  const [submitted, setSubmitted] = useState(false)
  const letterInputRefs = useRef<(HTMLInputElement | null)[]>([])

  const normalizedLetters = useMemo(
    () => letters.map((l) => l.trim().toUpperCase()),
    [letters],
  )

  const lettersIncomplete =
    normalizedLetters.length !== letterCount || normalizedLetters.some((l) => l.length !== 1)

  const canSubmit = !lettersIncomplete && isDictionaryReady
  const wordLengthOptions = useMemo<Option[]>(
    () =>
      wordLengthChoices
        .filter((len) => len <= letterCount)
        .map((len) => ({ label: `${len} letters`, value: len })),
    [letterCount],
  )
  const wordLengthPlaceholder =
    letterCount <= 3 ? `${letterCount} letters` : `All lengths (3–${letterCount})`

  const handleLetterCountChange = (value: number | null) => {
    const nextCount = value ?? DEFAULT_LETTER_COUNT
    setLetterCount(nextCount)
    setSubmitted(false)
    const nextLetters = Array.from({ length: nextCount }, (_, idx) => normalizedLetters[idx] ?? '')
    setLetters(nextLetters)
    setWordLengths((current) => current.filter((len) => len <= nextCount))
  }

  const handleLetterChange = (index: number, value: string) => {
    const next = [...letters]
    next[index] = toAlphaUpper(value)
    setLetters(next)
  }

  const focusLetterInput = (index: number) => {
    const node = letterInputRefs.current[index]
    if (!node) return
    node.focus()
    node.select()
  }

  const handleLetterKeyUp = (index: number, event: KeyboardEvent<HTMLInputElement>) => {
    if (event.metaKey || event.ctrlKey || event.altKey) return
    if (!/^[a-z]$/i.test(event.key)) return
    handleLetterChange(index, event.key)
    const nextIndex = index + 1
    if (nextIndex < letterCount) {
      focusLetterInput(nextIndex)
    }
  }

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setSubmitted(true)
    if (!canSubmit || !letterCount) return

    onSubmit({
      letters: normalizedLetters,
      letterCount,
      wordLengths: wordLengths.length ? wordLengths : undefined,
    })
  }

  const handleReset = () => {
    setWordLengths([])
    setLetters(Array.from({ length: letterCount }, () => ''))
    setSubmitted(false)
    onReset()
  }

  const showLetterError = submitted && lettersIncomplete

  const handleWordLengthsChange = (event: MultiSelectChangeEvent) => {
    setWordLengths((event.value as number[]) ?? [])
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setWordLengths((current) => {
      const next = current.filter((len) => len <= letterCount)
      return next.length === current.length ? current : next
    })
  }, [letterCount])

  const letterPositions = useMemo<CSSProperties[]>(() => {
    if (!letterCount) return []
    const center = letterWheelSize / 2
    const radius = center - letterNodeSize / 2 - 6
    return Array.from({ length: letterCount }, (_, idx) => {
      const angle = (2 * Math.PI * idx) / letterCount - Math.PI / 2
      const x = center + radius * Math.cos(angle)
      const y = center + radius * Math.sin(angle)
      return {
        top: `${y}px`,
        left: `${x}px`,
        width: `${letterNodeSize}px`,
        height: `${letterNodeSize}px`,
      }
    })
  }, [letterCount])

  return (
    <Card className="wordscapes-card">
      <form className="wordscapes-form" onSubmit={handleSubmit}>
        {!isDictionaryReady && (
          <Message severity="info" text="Loading dictionary data. You can prepare letters now." />
        )}
        <div className="field-grid">
          <div className="field">
            <label className="label" htmlFor="letter-count">
              Number of available letters (Select between 4 and 7)
            </label>
            <Dropdown
              id="letter-count"
              value={letterCount}
              options={letterCountOptions}
              onChange={(e) => handleLetterCountChange(e.value)}
              placeholder="Choose 4–7 letters"
              aria-label="Number of available letters"
              className="focus-ring-target"
            />
          </div>
          <div className="field">
            <label className="label" htmlFor="word-lengths">
              Target word lengths
            </label>
            <MultiSelect
              id="word-lengths"
              value={wordLengths}
              options={wordLengthOptions}
              onChange={handleWordLengthsChange}
              optionLabel="label"
              optionValue="value"
              display="chip"
              placeholder={wordLengthPlaceholder}
              showClear
              aria-label="Target word lengths"
              className="focus-ring-target"
            />
          </div>
        </div>
        <div className="letters-panel">
          <div
            className="letter-wheel"
            style={{ width: `${letterWheelSize}px`, height: `${letterWheelSize}px` }}
          >
            {letterPositions.map((style, idx) => (
              <div key={idx} className="letter-node" style={style}>
                <InputText
                  inputMode="text"
                  maxLength={1}
                  value={letters[idx] ?? ''}
                  ref={(element) => {
                    letterInputRefs.current[idx] = element
                  }}
                  onChange={(e) => handleLetterChange(idx, e.target.value)}
                  onKeyUp={(event) => handleLetterKeyUp(idx, event)}
                  aria-label={`Letter ${idx + 1}`}
                  aria-invalid={showLetterError}
                  autoComplete="off"
                  spellCheck={false}
                  className="focus-ring-target"
                />
              </div>
            ))}
          </div>
          {showLetterError && (
            <Message severity="warn" text="Fill every letter box with a single letter." />
          )}
        </div>

        <div className="actions">
          <Button
            type="submit"
            label="Find words"
            icon="pi pi-search"
            disabled={!canSubmit}
            aria-disabled={!canSubmit}
            className="interactive-pressable"
          />
          <Button
            type="button"
            label="Reset"
            severity="secondary"
            outlined
            onClick={handleReset}
            className="interactive-pressable"
          />
        </div>
      </form>
    </Card>
  )
}

export default WordFinderForm
