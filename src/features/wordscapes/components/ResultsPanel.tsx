import { useEffect, useMemo, useRef, useState } from 'react'
import { Accordion, AccordionTab } from 'primereact/accordion'
import type { AccordionTabChangeEvent } from 'primereact/accordion'
import { Card } from 'primereact/card'
import { Message } from 'primereact/message'
import { Tag } from 'primereact/tag'
import type { WordFinderSubmission, WordGroup } from '../types'

type ResultsPanelProps = {
  submission: WordFinderSubmission | null
  results: WordGroup[]
  isDictionaryLoading: boolean
  dictionaryError: string | null
}

function ResultsPanel({ submission, results, isDictionaryLoading, dictionaryError }: ResultsPanelProps) {
  const hasSubmission = !!submission
  const hasResults = results.length > 0
  const totalCount = results.reduce((sum, group) => sum + group.words.length, 0)
  const resultsSignature = useMemo(() => {
    if (!results.length) return 'empty'
    return results.map((group) => `${group.length}:${group.words.join('|')}`).join(';')
  }, [results])

  const defaultActiveIndex = useMemo(() => {
    if (!hasResults) return null
    let smallestIndex = 0
    let smallestLength = results[0].length
    for (let index = 1; index < results.length; index += 1) {
      if (results[index].length < smallestLength) {
        smallestLength = results[index].length
        smallestIndex = index
      }
    }
    return smallestIndex
  }, [hasResults, results])

  const [selection, setSelection] = useState<{ index: number | null; signature: string }>({
    index: null,
    signature: '',
  })
  const [pinnedWords, setPinnedWords] = useState<string[]>([])
  const [animateResults, setAnimateResults] = useState(false)
  const [toastMessage, setToastMessage] = useState<{ text: string; tone: 'success' | 'error' } | null>(
    null,
  )
  const toastTimeoutRef = useRef<number | null>(null)
  const toastMetaRef = useRef<{ text: string; timestamp: number }>({ text: '', timestamp: 0 })

  const activeIndex =
    selection.signature === resultsSignature
      ? selection.index ?? defaultActiveIndex
      : defaultActiveIndex

  const handleAccordionChange = (event: AccordionTabChangeEvent) => {
    const nextIndex = Array.isArray(event.index) ? event.index[0] : event.index
    setSelection({
      index: typeof nextIndex === 'number' ? nextIndex : null,
      signature: resultsSignature,
    })
  }

  const describeTargetLengths = () => {
    if (!submission?.wordLengths?.length) return 'All (3–8)'
    const lengths = [...submission.wordLengths].sort((a, b) => a - b)
    if (lengths.length === 1) return `${lengths[0]} letters`
    if (lengths.length === 2) return `${lengths[0]} & ${lengths[1]} letters`
    return `${lengths.slice(0, -1).join(', ')} & ${lengths[lengths.length - 1]} letters`
  }

  useEffect(() => {
    if (!hasResults) {
      setAnimateResults(false)
      return
    }

    setAnimateResults(true)
    const timeout = window.setTimeout(() => setAnimateResults(false), 250)
    return () => window.clearTimeout(timeout)
  }, [resultsSignature, hasResults])

  useEffect(
    () => () => {
      if (toastTimeoutRef.current) {
        window.clearTimeout(toastTimeoutRef.current)
      }
    },
    [],
  )

  const announceToast = (text: string, tone: 'success' | 'error') => {
    const now = Date.now()
    if (toastMetaRef.current.text === text && now - toastMetaRef.current.timestamp < 1200) {
      return
    }
    toastMetaRef.current = { text, timestamp: now }
    setToastMessage({ text, tone })
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

  const pinnedWordSet = useMemo(() => new Set(pinnedWords), [pinnedWords])

  const handleCopyWord = async (word: string) => {
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
      announceToast(`Copied '${normalized}'`, 'success')
    } else {
      announceToast("Copy failed. Select the word and press Ctrl/Cmd+C.", 'error')
    }
  }

  const togglePinnedWord = (word: string) => {
    setPinnedWords((current) => {
      if (current.includes(word)) {
        return current.filter((item) => item !== word)
      }
      return [...current, word]
    })
  }

  const removePinnedWord = (word: string) => {
    setPinnedWords((current) => current.filter((item) => item !== word))
  }

  const clearPinnedWords = () => {
    setPinnedWords([])
  }

  const renderPinnedPanel = () => (
    <div className="pinned-panel" aria-live="polite">
      <div className="pinned-header">
        <span className="pinned-title">Pinned</span>
        {pinnedWords.length > 0 && (
          <button
            type="button"
            className="pinned-clear-button focus-ring-target"
            onClick={clearPinnedWords}
          >
            Clear pinned
          </button>
        )}
      </div>
      {pinnedWords.length === 0 ? (
        <div className="pinned-empty">Pin words to keep them handy.</div>
      ) : (
        <div className="pinned-list">
          {pinnedWords.map((word) => (
            <div key={word} className="pinned-pill">
              <button
                type="button"
                className="pinned-word-button focus-ring-target"
                onClick={() => handleCopyWord(word)}
              >
                {word}
              </button>
              <button
                type="button"
                className="pinned-remove-button focus-ring-target"
                aria-label={`Unpin ${word}`}
                onClick={() => removePinnedWord(word)}
              >
                <span aria-hidden="true">&times;</span>
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )

  return (
    <Card className="wordscapes-card" title="Word results">
      {dictionaryError ? (
        <Message severity="error" text={dictionaryError} />
      ) : isDictionaryLoading ? (
        <Message severity="info" text="Loading dictionary data..." />
      ) : (
        <>
          {!hasSubmission && (
            <div className="wordscapes-placeholder">
              <Message severity="info" text="Possible words will appear here after you enter letters." />
              <ul className="placeholder-list">
                <li>Alphabetized matches grouped by word length</li>
                <li>Filter to specific lengths or view all 3–8 letter words</li>
              </ul>
            </div>
          )}

          {hasSubmission && submission && !hasResults && (
            <div className="wordscapes-empty" aria-live="polite">
              <Message severity="warn" text="No matches found for your letters." />
              <div className="results-summary">
                <div className="summary-row">
                  <span className="summary-label">Target lengths:</span>
                  <span className="summary-value">{describeTargetLengths()}</span>
                </div>
                <div className="summary-row">
                  <span className="summary-label">Letters:</span>
                  <div className="letters-chip-row">
                    {submission.letters.map((letter, idx) => (
                      <Tag key={`${letter}-${idx}`} value={letter} severity="secondary" />
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {pinnedWords.length > 0 && !hasResults && renderPinnedPanel()}

          {hasResults && (
            <div
              className={`wordscapes-results${animateResults ? ' wordscapes-results-enter' : ''}`}
              aria-live="polite"
            >
              <div className="results-summary compact">
                <div className="summary-row">
                  <span className="summary-label">Target lengths:</span>
                  <span className="summary-value">{describeTargetLengths()}</span>
                </div>
                <div className="summary-row">
                  <span className="summary-label">Total matches:</span>
                  <Tag value={totalCount} severity="info" />
                </div>
              </div>
              {renderPinnedPanel()}
              {toastMessage && (
                <div
                  className={`wordscapes-toast${toastMessage.tone === 'error' ? ' is-error' : ''}`}
                  role="status"
                  aria-live="polite"
                >
                  {toastMessage.text}
                </div>
              )}
              <div className="results-scroll">
                <Accordion activeIndex={activeIndex} onTabChange={handleAccordionChange}>
                  {results.map((group) => (
                    <AccordionTab
                      key={group.length}
                      header={`${group.length}-letter words - ${group.words.length}`}
                    >
                      <ul className="word-list">
                        {group.words.map((word) => {
                          const isPinned = pinnedWordSet.has(word)
                          return (
                            <li key={word} className="word-list-item">
                              <div className="word-list-card">
                                <button
                                  type="button"
                                  className="word-list-button interactive-pressable"
                                  onClick={(event) => {
                                    event.stopPropagation()
                                    handleCopyWord(word)
                                  }}
                                >
                                  {word}
                                </button>
                                <button
                                  type="button"
                                  className={`word-pin-button focus-ring-target${isPinned ? ' is-pinned' : ''}`}
                                  aria-pressed={isPinned}
                                  aria-label={`${isPinned ? 'Unpin' : 'Pin'} ${word}`}
                                  onClick={(event) => {
                                    event.stopPropagation()
                                    togglePinnedWord(word)
                                  }}
                                >
                                  <svg
                                    aria-hidden="true"
                                    width="16"
                                    height="16"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="1.7"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                  >
                                    <path d="M8.5 3.5h7l.75 6.5a2 2 0 0 1-.93 1.94L13 13.5V18l-2 3v-7.5l-3.32-1.56a2 2 0 0 1-.93-1.94z" />
                                  </svg>
                                </button>
                              </div>
                            </li>
                          )
                        })}
                      </ul>
                    </AccordionTab>
                  ))}
                </Accordion>
              </div>
            </div>
          )}
        </>
      )}
    </Card>
  )
}

export default ResultsPanel
