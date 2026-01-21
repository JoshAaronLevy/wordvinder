import { useEffect, useMemo, useRef, useState } from 'react'
import { Accordion, AccordionTab } from 'primereact/accordion'
import type { AccordionTabChangeEvent } from 'primereact/accordion'
import { Card } from 'primereact/card'
import { Message } from 'primereact/message'
import { Tag } from 'primereact/tag'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faArrowsRotate } from '@fortawesome/free-solid-svg-icons'
import type { WordFinderSubmission, WordGroup } from '../types'

type ResultsPanelProps = {
  submission: WordFinderSubmission | null
  results: WordGroup[]
  isDictionaryLoading: boolean
  dictionaryError: string | null
  showRetryControls: boolean
  onRetry: () => void
  retryDisabled: boolean
  retryLimitReached: boolean
}

function ResultsPanel({
  submission,
  results,
  isDictionaryLoading,
  dictionaryError,
  showRetryControls,
  onRetry,
  retryDisabled,
  retryLimitReached,
}: ResultsPanelProps) {
  const hasSubmission = !!submission
  const hasResults = results.length > 0
  // const totalCount = results.reduce((sum, group) => sum + group.words.length, 0)
  const resultsSignature = useMemo(() => {
    if (!results.length) return 'empty'
    return results.map((group) => `${group.length}:${group.words.join('|')}`).join(';')
  }, [results])

  const [activeIndex, setActiveIndex] = useState<number | null>(null)
  const [usedWords, setUsedWords] = useState<string[]>([])
  const [animateResults, setAnimateResults] = useState(false)
  const [toastMessage, setToastMessage] = useState<{ text: string; tone: 'success' | 'error' } | null>(
    null,
  )
  const toastTimeoutRef = useRef<number | null>(null)
  const toastMetaRef = useRef<{ text: string; timestamp: number }>({ text: '', timestamp: 0 })

  const singleLengthTarget = useMemo(() => {
    if (!submission?.wordLengths || submission.wordLengths.length !== 1) return null
    return submission.wordLengths[0]
  }, [submission])

  useEffect(() => {
    if (!results.length) {
      setActiveIndex(null)
      return
    }

    if (singleLengthTarget === null) {
      setActiveIndex(null)
      return
    }

    const targetIndex = results.findIndex((group) => group.length === singleLengthTarget)
    setActiveIndex(targetIndex >= 0 ? targetIndex : null)
  }, [singleLengthTarget, results])

  const handleAccordionChange = (event: AccordionTabChangeEvent) => {
    const nextIndex = Array.isArray(event.index) ? event.index[0] ?? null : event.index ?? null
    setActiveIndex(typeof nextIndex === 'number' ? nextIndex : null)
  }

  const describeTargetLengths = () => {
    if (!submission?.wordLengths?.length) return 'All (3–7)'
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
    // eslint-disable-next-line react-hooks/purity
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

  const usedWordSet = useMemo(() => new Set(usedWords), [usedWords])

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

  const toggleUsedWord = (word: string) => {
    setUsedWords((current) => {
      if (current.includes(word)) {
        return current.filter((item) => item !== word)
      }
      return [...current, word]
    })
  }

  useEffect(() => {
    setUsedWords([])
  }, [resultsSignature])

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
                <li>Filter to specific lengths or view all 3–7 letter words</li>
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

          {hasResults && (
            <div
              className={`wordscapes-results${animateResults ? ' wordscapes-results-enter' : ''}`}
              aria-live="polite"
            >
              {/* <div className="results-summary compact">
                <div className="summary-row">
                  <span className="summary-label">Target lengths:</span>
                  <span className="summary-value">{describeTargetLengths()}</span>
                </div>
                <div className="summary-row">
                  <span className="summary-label">Total matches:</span>
                  <Tag value={totalCount} severity="info" />
                </div>
              </div> */}
              {toastMessage && (
                <div
                  className={`wordscapes-toast${toastMessage.tone === 'error' ? ' is-error' : ''}`}
                  role="status"
                  aria-live="polite"
                >
                  {toastMessage.text}
                </div>
              )}
              {showRetryControls && (
                <div className="wordscapes-retry">
                  <div className="wordscapes-retry-row">
                    <span className="wordscapes-retry-label">AI analysis incorrect?</span>
                    <button
                      type="button"
                      className="wordscapes-retry-button"
                      onClick={onRetry}
                      disabled={retryDisabled}
                    >
                      <FontAwesomeIcon icon={faArrowsRotate} />
                      Retry
                    </button>
                  </div>
                  {retryLimitReached && (
                    <div className="wordscapes-retry-hint">
                      Retry limit reached. Upload a new screenshot to try again.
                    </div>
                  )}
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
                          const isUsed = usedWordSet.has(word)
                          return (
                            <li key={word} className="word-list-item">
                              <div className="word-list-card">
                                <button
                                  type="button"
                                  className={`word-list-button interactive-pressable${isUsed ? ' is-used' : ''}`}
                                  aria-pressed={isUsed}
                                  onClick={(event) => {
                                    event.stopPropagation()
                                    toggleUsedWord(word)
                                    handleCopyWord(word)
                                  }}
                                >
                                  {word}
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
