import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
  type PointerEvent,
} from 'react'
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

type ResultTab = 'candidates' | 'next'

type LetterDetail = {
  letter: string
  probability: number
  contribution: number
}

type NextGuess = {
  word: string
  score: number
  duplicates: number
  details: LetterDetail[]
}

const NEXT_GUESS_LIMIT = 12
const REPEAT_PENALTY = 1.5

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
  const [activeTab, setActiveTab] = useState<ResultTab>('candidates')
  const [penalizeRepeats, setPenalizeRepeats] = useState(true)
  const [toastMessage, setToastMessage] = useState<string | null>(null)
  const toastTimeoutRef = useRef<number | null>(null)
  const toastMetaRef = useRef<{ text: string; timestamp: number }>({ text: '', timestamp: 0 })
  const [openInfoWord, setOpenInfoWord] = useState<string | null>(null)
  const tabRefs = useRef<Record<ResultTab, HTMLButtonElement | null>>({
    candidates: null,
    next: null,
  })

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

  useEffect(
    () => () => {
      if (toastTimeoutRef.current) {
        window.clearTimeout(toastTimeoutRef.current)
      }
    },
    [],
  )

  const letterSplitScores = useMemo(() => {
    const containsCount = new Map<string, number>()
    suggestions.forEach((word) => {
      const uniqueLetters = new Set(word.toUpperCase().split(''))
      uniqueLetters.forEach((letter) => {
        containsCount.set(letter, (containsCount.get(letter) ?? 0) + 1)
      })
    })
    const total = suggestions.length || 1
    const splitScores = new Map<
      string,
      {
        probability: number
        contribution: number
      }
    >()
    containsCount.forEach((count, letter) => {
      const probability = count / total
      const contribution = probability * (1 - probability)
      splitScores.set(letter, { probability, contribution })
    })
    return splitScores
  }, [suggestions])

  const nextGuessSuggestions = useMemo(() => {
    if (!suggestions.length) return []
    const guesses: NextGuess[] = suggestions.map((word) => {
      const letters = word.toUpperCase().split('')
      const unique = new Set(letters)
      let score = 0
      const details: LetterDetail[] = []
      unique.forEach((letter) => {
        const letterData = letterSplitScores.get(letter)
        if (letterData) {
          score += letterData.contribution
          details.push({
            letter,
            probability: letterData.probability,
            contribution: letterData.contribution,
          })
        }
      })
      const duplicates = letters.length - unique.size
      if (penalizeRepeats && duplicates > 0) {
        score -= duplicates * REPEAT_PENALTY
      }
      details.sort((a, b) => b.contribution - a.contribution)
      return { word, score, duplicates, details }
    })

    return guesses
      .sort((a, b) => {
        if (b.score === a.score) {
          return a.word.localeCompare(b.word)
        }
        return b.score - a.score
      })
      .slice(0, NEXT_GUESS_LIMIT)
  }, [letterSplitScores, penalizeRepeats, suggestions])

  const announceToast = (text: string) => {
    // eslint-disable-next-line react-hooks/purity
    const now = Date.now()
    if (toastMetaRef.current.text === text && now - toastMetaRef.current.timestamp < 1200) {
      return
    }
    toastMetaRef.current = { text, timestamp: now }
    setToastMessage(text)
    if (toastTimeoutRef.current) {
      window.clearTimeout(toastTimeoutRef.current)
    }
    toastTimeoutRef.current = window.setTimeout(() => setToastMessage(null), 2000)
  }

  const fallbackCopy = (text: string) => {
    try {
      const textarea = document.createElement('textarea')
      textarea.value = text
      textarea.setAttribute('readonly', '')
      textarea.style.position = 'absolute'
      textarea.style.left = '-9999px'
      document.body.appendChild(textarea)
      const selection = document.getSelection()
      const selected = selection && selection.rangeCount > 0 ? selection.getRangeAt(0) : null
      textarea.select()
      const success = document.execCommand('copy')
      if (selected && selection) {
        selection.removeAllRanges()
        selection.addRange(selected)
      }
      document.body.removeChild(textarea)
      return success
    } catch (error) {
      console.error('Fallback copy failed', error)
      return false
    }
  }

  const handleCopyGuess = async (word: string) => {
    const normalized = word.toUpperCase()
    let didCopy = false
    if (navigator.clipboard?.writeText) {
      try {
        await navigator.clipboard.writeText(word)
        didCopy = true
      } catch (error) {
        console.error('Clipboard write failed', error)
      }
    }
    if (!didCopy) {
      didCopy = fallbackCopy(word)
    }
    if (didCopy) {
      announceToast(`Copied "${normalized}"`)
    } else {
      announceToast('Copy failed. Select the word and press Ctrl/Cmd+C.')
    }
  }

  const handleCopyAndCloseInfo = (word: string) => {
    setOpenInfoWord(null)
    void handleCopyGuess(word)
  }

  const handleRowKeyDown = (event: KeyboardEvent<HTMLDivElement>, word: string) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      handleCopyAndCloseInfo(word)
    }
  }

  const handleTabChange = (tab: ResultTab) => {
    setActiveTab(tab)
  }

  const handleTabKeyDown = (event: KeyboardEvent<HTMLButtonElement>, tab: ResultTab) => {
    if (event.key !== 'ArrowRight' && event.key !== 'ArrowLeft' && event.key !== 'Home' && event.key !== 'End') {
      return
    }

    event.preventDefault()
    const order: ResultTab[] = ['candidates', 'next']
    const currentIndex = order.indexOf(tab)

    if (event.key === 'Home') {
      tabRefs.current.candidates?.focus()
      return
    }

    if (event.key === 'End') {
      tabRefs.current.next?.focus()
      return
    }

    const offset = event.key === 'ArrowRight' ? 1 : -1
    const nextIndex = (currentIndex + offset + order.length) % order.length
    const nextTab = order[nextIndex]
    tabRefs.current[nextTab]?.focus()
  }

  useEffect(() => {
    setOpenInfoWord(null)
  }, [activeTab, penalizeRepeats, suggestions])

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

          <div className="results-tabs" role="tablist" aria-label="Wordle helper results">
            <button
              type="button"
              ref={(element) => {
                tabRefs.current.candidates = element
              }}
              role="tab"
              id="wordle-tab-candidates"
              aria-controls="wordle-tabpanel-candidates"
              aria-selected={activeTab === 'candidates'}
              tabIndex={activeTab === 'candidates' ? 0 : -1}
              className={`results-tab interactive-pressable focus-ring-target${
                activeTab === 'candidates' ? ' is-active' : ''
              }`}
              onClick={() => handleTabChange('candidates')}
              onKeyDown={(event) => handleTabKeyDown(event, 'candidates')}
            >
              Candidates
            </button>
            <button
              type="button"
              ref={(element) => {
                tabRefs.current.next = element
              }}
              role="tab"
              id="wordle-tab-next"
              aria-controls="wordle-tabpanel-next"
              aria-selected={activeTab === 'next'}
              tabIndex={activeTab === 'next' ? 0 : -1}
              className={`results-tab interactive-pressable focus-ring-target${
                activeTab === 'next' ? ' is-active' : ''
              }`}
              onClick={() => handleTabChange('next')}
              onKeyDown={(event) => handleTabKeyDown(event, 'next')}
            >
              Next Guess
            </button>
          </div>

          <div className="results-tabpanels">
            <div
              role="tabpanel"
              id="wordle-tabpanel-candidates"
              aria-labelledby="wordle-tab-candidates"
              hidden={activeTab !== 'candidates'}
            >
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
            </div>

            <div
              role="tabpanel"
              id="wordle-tabpanel-next"
              aria-labelledby="wordle-tab-next"
              hidden={activeTab !== 'next'}
            >
              <p className="next-guess-helper">
                Ranked to maximize new letter coverage based on remaining candidates.
              </p>
              <div className="next-guess-controls">
                <label className="penalize-toggle focus-ring-target">
                  <input
                    type="checkbox"
                    checked={penalizeRepeats}
                    onChange={(event) => setPenalizeRepeats(event.target.checked)}
                  />
                  <span>Penalize repeated letters</span>
                </label>
              </div>
              {!hasAttempts ? (
                <Message
                  severity="info"
                  text="Add your first attempt to unlock tailored next-guess ideas."
                />
              ) : !hasMatches ? (
                <Message
                  severity="warn"
                  text="No viable candidates yet, so no next-guess recommendations."
                />
              ) : !nextGuessSuggestions.length ? (
                <Message severity="info" text="Next guesses will appear once matches load." />
              ) : (
                <div className="next-guess-list" aria-live="polite">
                  {nextGuessSuggestions.map(({ word, score, duplicates, details }, index) => {
                    const infoKey = `${word}-${index}`
                    const infoId = `next-guess-info-${infoKey}`
                    const isInfoOpen = openInfoWord === infoKey
                    const topDetails = details.slice(0, 3)
                    return (
                      <div
                        key={`${word}-${index}`}
                        role="button"
                        tabIndex={0}
                        className="next-guess-row interactive-pressable focus-ring-target"
                        onClick={() => handleCopyAndCloseInfo(word)}
                        onKeyDown={(event) => handleRowKeyDown(event, word)}
                        aria-label={`Copy ${word.toUpperCase()} as next guess`}
                      >
                        <div className="next-guess-word-block">
                          <span className="next-guess-word">{word.toUpperCase()}</span>
                          <span className="next-guess-meta">
                            Score {score.toFixed(1)} ·{' '}
                            {duplicates ? 'repeat penalty applied' : 'all unique letters'}
                          </span>
                        </div>
                        <div className="next-guess-actions">
                          <span className="next-guess-copy-hint">Tap to copy</span>
                          <div
                            className="next-guess-info"
                            onPointerEnter={(event: PointerEvent<HTMLDivElement>) => {
                              if (event.pointerType === 'mouse') {
                                setOpenInfoWord(infoKey)
                              }
                            }}
                            onPointerLeave={(event: PointerEvent<HTMLDivElement>) => {
                              if (event.pointerType === 'mouse') {
                                setOpenInfoWord((current) => (current === infoKey ? null : current))
                              }
                            }}
                          >
                            <button
                              type="button"
                              className="next-guess-info-button focus-ring-target"
                              aria-expanded={isInfoOpen}
                              aria-controls={infoId}
                              aria-label={`Why is ${word.toUpperCase()} recommended?`}
                              onClick={(event) => {
                                event.stopPropagation()
                                event.preventDefault()
                                setOpenInfoWord((current) => (current === infoKey ? null : infoKey))
                              }}
                              onFocus={() => setOpenInfoWord(infoKey)}
                              onBlur={() =>
                                setOpenInfoWord((current) => (current === infoKey ? null : current))
                              }
                            >
                              <span aria-hidden="true">Why?</span>
                              <span className="sr-only">Why this guess?</span>
                            </button>
                            <div
                              role="tooltip"
                              id={infoId}
                              className={`next-guess-tooltip${isInfoOpen ? ' is-visible' : ''}`}
                            >
                              <p className="next-guess-tooltip-title">Top letters</p>
                              <ul className="next-guess-tooltip-list">
                                {topDetails.map(({ letter, probability, contribution }) => (
                                  <li key={letter} className="next-guess-tooltip-item">
                                    <span className="next-guess-letter">{letter}</span>
                                    <span className="next-guess-tooltip-meta">
                                      p={(probability * 100).toFixed(0)}% · split=
                                      {contribution.toFixed(2)}
                                    </span>
                                  </li>
                                ))}
                              </ul>
                              <p className="next-guess-tooltip-penalty">
                                {penalizeRepeats && duplicates > 0
                                  ? 'Repeat penalty applied'
                                  : 'No repeat penalty'}
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>

          <div className="sr-only" aria-live="polite">
            {toastMessage ?? ''}
          </div>
          {toastMessage && <div className="wordle-toast">{toastMessage}</div>}
        </>
      )}
    </Card>
  )
}

export default SuggestionsPanel
