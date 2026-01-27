/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useMemo, useState } from 'react'
import { Dialog } from 'primereact/dialog'
import { FileUpload } from 'primereact/fileupload'
import { Accordion, AccordionTab } from 'primereact/accordion'
import type { AccordionTabChangeEvent } from 'primereact/accordion'
import { Button } from 'primereact/button'
import { ConfirmDialog, confirmDialog } from 'primereact/confirmdialog'
import { Dropdown } from 'primereact/dropdown'
import { InputNumber } from 'primereact/inputnumber'
import { InputText } from 'primereact/inputtext'
import { Message } from 'primereact/message'
import ResultsPanel from '../components/ResultsPanel'
import WordFinderForm from '../components/WordFinderForm'
import { findMatchingWords } from '../logic/wordSearch'
import type { WordFinderSubmission, WordGroup } from '../types'
import { getWordscapesWordsByLength } from '../../../shared/dictionary/englishWords'
import '../wordscapes.css'
import { analyzeBoard, isWordscapesBoardState } from '../../../services/analyzeBoard'
import type { WordscapesBoardState } from '../../../services/analyzeBoard'
import {
  confirmStateToSubmission,
  filterSolvedWords,
  getSolvedWordsFromBoard,
  normalizeConfirmStateFromBoard,
} from '../logic/boardAdapter'
import type { ConfirmBoardState } from '../logic/boardAdapter'
import { compressImageIfNeeded } from '../../../shared/utils/imageCompression'
import { Image } from 'primereact/image'
import { Steps } from 'primereact/steps'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faCheck, faDice, faImage, faMagnifyingGlass, faWandMagicSparkles } from '@fortawesome/free-solid-svg-icons'
import { toAlphaUpper } from '../../../shared/utils/string'
import { useAppContext } from '../../../app/AppContext'

const wordLengthChoices = [3, 4, 5, 6, 7, 8, 9, 10, 11, 12]
const letterCountRange = { min: 5, max: 8 }

function WordscapesPage() {
  const { difyPingStatus } = useAppContext()
  const [submission, setSubmission] = useState<WordFinderSubmission | null>(null)
  const [results, setResults] = useState<WordGroup[]>([])
  const [wordsByLength, setWordsByLength] = useState<Record<number, string[]> | null>(null)
  const [isDictionaryLoading, setIsDictionaryLoading] = useState(true)
  const [dictionaryError, setDictionaryError] = useState<string | null>(null)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [analysisDialogVisible, setAnalysisDialogVisible] = useState(false)
  const [analysisComplete, setAnalysisComplete] = useState(false)
  const [suggestionsComplete, setSuggestionsComplete] = useState(false)
  const [selectedScreenshot, setSelectedScreenshot] = useState<File | null>(null)
  const [formAccordionIndex, setFormAccordionIndex] = useState<number | null>(null)
  const [analysisAttempts, setAnalysisAttempts] = useState(0)
  const [lastSubmissionSource, setLastSubmissionSource] = useState<'upload' | 'manual' | null>(null)
  const [extractedBoard, setExtractedBoard] = useState<WordscapesBoardState | null>(null)
  const [confirmState, setConfirmState] = useState<ConfirmBoardState | null>(null)
  const [isMobile, setIsMobile] = useState(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return false
    return window.matchMedia('(max-width: 640px)').matches
  })
  const [activeIndex, setActiveIndex] = useState(0);
  const stepCount = 5;
  const maxAnalysisAttempts = 3
  const [completedSteps, setCompletedSteps] = useState<boolean[]>(
    Array(stepCount).fill(false)
  );
  const confirmStepIndex = 2
  const analysisSteps = [
    {
      icon: faImage,
      template: (item: any) => itemRenderer(item, 0),
      summary: 'Validating Image'
    },
    {
      icon: faWandMagicSparkles,
      template: (item: any) => itemRenderer(item, 1),
      summary: 'Analyzing Board State'
    },
    {
      icon: faMagnifyingGlass,
      template: (item: any) => itemRenderer(item, 2),
      summary: 'Confirm Board State'
    },
    {
      icon: faMagnifyingGlass,
      template: (item: any) => itemRenderer(item, 3),
      summary: 'Identifying Possible Words'
    },
    {
      icon: faDice,
      template: (item: any) => itemRenderer(item, 4),
      summary: 'Complete! Now go finish that level!'
    }
  ];

  const getStepVisuals = (item: any, itemIndex: number) => {
    const isActiveItem = activeIndex === itemIndex;
    const isCompleted = completedSteps[itemIndex];
    const backgroundColor = isCompleted
      ? 'var(--green-500)'
      : isActiveItem
        ? 'var(--primary-color)'
        : 'var(--surface-b)';
    const textColor = isCompleted
      ? 'var(--surface-0)'
      : isActiveItem
        ? 'var(--surface-b)'
        : 'var(--text-color-secondary)';
    const icon = isCompleted ? faCheck : item.icon;

    return { backgroundColor, textColor, icon };
  };

  const itemRenderer = (item: any, itemIndex: any) => {
    const { backgroundColor, textColor, icon } = getStepVisuals(item, itemIndex);

    return (
      <span
        className="inline-flex align-items-center justify-content-center align-items-center border-circle border-primary border-1 h-3rem w-3rem z-1 cursor-pointer"
        style={{ backgroundColor: backgroundColor, color: textColor, marginTop: '-25px' }}
        onClick={() => setActiveIndex(itemIndex)}
      >
        <FontAwesomeIcon icon={icon} />
      </span>
    );
  };

  useEffect(() => {
    let isMounted = true
    getWordscapesWordsByLength()
      .then((map) => {
        if (!isMounted) return
        setWordsByLength(map)
        setDictionaryError(null)
      })
      .catch((error: Error) => {
        if (!isMounted) return
        console.error(error)
        setWordsByLength(null)
        setDictionaryError('Unable to load dictionary data.')
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

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return
    const mediaQuery = window.matchMedia('(max-width: 640px)')
    const handleChange = () => setIsMobile(mediaQuery.matches)
    handleChange()
    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', handleChange)
      return () => mediaQuery.removeEventListener('change', handleChange)
    }
    mediaQuery.addListener(handleChange)
    return () => mediaQuery.removeListener(handleChange)
  }, [])

  useEffect(() => {
    if (!analysisDialogVisible) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setAnalysisComplete(false)
      setSuggestionsComplete(false)
      if (extractedBoard || confirmState) {
        setExtractedBoard(null)
        setConfirmState(null)
      }
    }
  }, [analysisDialogVisible, extractedBoard, confirmState])

  useEffect(() => {
    if (analysisDialogVisible) return
    const timeout = window.setTimeout(() => {
      setCompletedSteps(Array(stepCount).fill(false))
      setActiveIndex(0)
    }, 500)
    return () => window.clearTimeout(timeout)
  }, [analysisDialogVisible, stepCount])

  const screenshotPreviewUrl = useMemo(() => {
    if (!selectedScreenshot) return null
    return URL.createObjectURL(selectedScreenshot)
  }, [selectedScreenshot])

  const isConfirmReady = useMemo(() => {
    if (!confirmState) return false
    const letters = confirmState.letters ?? []
    const lettersInRange =
      letters.length >= letterCountRange.min && letters.length <= letterCountRange.max
    const lettersValid = letters.every((letter) => /^[A-Z]$/.test(letter.trim().toUpperCase()))
    const missing = confirmState.missingByLength ?? []
    const lengths = missing.map((entry) => entry.length)
    const lengthsUnique = new Set(lengths).size === lengths.length
    const lengthsValid = missing.every(
      (entry) =>
        Number.isInteger(entry.length) && entry.length >= 3 && entry.length <= 12,
    )
    const countsValid = missing.every(
      (entry) =>
        entry.count === null ||
        (Number.isInteger(entry.count) && entry.count >= 0 && entry.count <= 20),
    )
    return lettersInRange && lettersValid && lengthsUnique && lengthsValid && countsValid
  }, [confirmState])

  const handleConfirmLetterChange = (index: number, value: string) => {
    setConfirmState((prev) => {
      if (!prev) return prev
      const nextLetters = [...prev.letters]
      nextLetters[index] = toAlphaUpper(value)
      return { ...prev, letters: nextLetters }
    })
  }

  const handleMissingLengthChange = (index: number, value: number | null) => {
    if (value === null) return
    setConfirmState((prev) => {
      if (!prev) return prev
      const nextMissing = prev.missingByLength.map((entry, idx) =>
        idx === index ? { ...entry, length: value } : entry,
      )
      return { ...prev, missingByLength: nextMissing }
    })
  }

  const handleMissingCountChange = (index: number, value: number | null) => {
    setConfirmState((prev) => {
      if (!prev) return prev
      const nextMissing = prev.missingByLength.map((entry, idx) =>
        idx === index ? { ...entry, count: value } : entry,
      )
      return { ...prev, missingByLength: nextMissing }
    })
  }

  const handleAddMissingLength = () => {
    setConfirmState((prev) => {
      if (!prev) return prev
      const used = new Set(prev.missingByLength.map((entry) => entry.length))
      const nextLength = wordLengthChoices.find((length) => !used.has(length))
      if (!nextLength) return prev
      return {
        ...prev,
        missingByLength: [...prev.missingByLength, { length: nextLength, count: null }],
      }
    })
  }

  const handleRemoveMissingLength = (index: number) => {
    setConfirmState((prev) => {
      if (!prev) return prev
      const nextMissing = prev.missingByLength.filter((_, idx) => idx !== index)
      return { ...prev, missingByLength: nextMissing }
    })
  }

  useEffect(() => {
    return () => {
      if (screenshotPreviewUrl) URL.revokeObjectURL(screenshotPreviewUrl)
    }
  }, [screenshotPreviewUrl])

  const runSuggestions = (payload: WordFinderSubmission, solvedWords: string[] = []) => {
    setSubmission(payload)
    if (!wordsByLength) {
      setResults([])
      return {
        dictionaryReady: false,
        totalMatches: 0,
        filteredMatches: 0,
        groupedMatches: [] as Array<{ length: number; count: number }>,
        solvedWordsCount: solvedWords.length,
        submission: payload,
      }
    }
    const matches = findMatchingWords(payload, wordsByLength)
    const filteredMatches = solvedWords.length ? filterSolvedWords(matches, solvedWords) : matches
    const totalMatches = matches.reduce((sum, group) => sum + group.words.length, 0)
    const filteredMatchesCount = filteredMatches.reduce((sum, group) => sum + group.words.length, 0)
    const groupedMatches = filteredMatches.map((group) => ({ length: group.length, count: group.words.length }))
    setResults(filteredMatches)
    return {
      dictionaryReady: true,
      totalMatches,
      filteredMatches: filteredMatchesCount,
      groupedMatches,
      solvedWordsCount: solvedWords.length,
      submission: payload,
    }
  }

  const handleSubmit = (payload: WordFinderSubmission) => {
    setAnalysisAttempts(0)
    setLastSubmissionSource('manual')
    runSuggestions(payload)
  }

  const handleReset = () => {
    setSubmission(null)
    setResults([])
    setLastSubmissionSource(null)
  }

  const handleFormAccordionChange = (event: AccordionTabChangeEvent) => {
    const nextIndex = Array.isArray(event.index) ? event.index[0] ?? null : event.index ?? null
    setFormAccordionIndex(typeof nextIndex === 'number' ? nextIndex : null)
  }

  const incrementAnalysisAttempts = () => {
    setAnalysisAttempts((prev) => Math.min(prev + 1, maxAnalysisAttempts))
  }

  const delay = (ms: number) => new Promise<void>((resolve) => {
    window.setTimeout(resolve, ms)
  })

  const resetAnalysisState = () => {
    setAnalysisDialogVisible(false)
    setActiveIndex(0)
    setCompletedSteps(Array(stepCount).fill(false))
    setExtractedBoard(null)
    setConfirmState(null)
    setAnalysisComplete(false)
    setSuggestionsComplete(false)
  }

  const handleCancelConfirm = () => {
    confirmDialog({
      header: 'Cancel analysis?',
      message: 'Your extracted board details will be discarded.',
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Yes, cancel',
      rejectLabel: 'Keep reviewing',
      accept: resetAnalysisState,
    })
  }

  const handleReAnalyze = async () => {
    if (!selectedScreenshot || hasReachedRetryLimit) return
    setExtractedBoard(null)
    setConfirmState(null)
    setCompletedSteps(Array(stepCount).fill(false))
    await runImageAnalysis(selectedScreenshot, { resetResults: true })
  }

  const handleConfirm = async () => {
    if (!confirmState || !isConfirmReady) return
    const nextSubmission = confirmStateToSubmission(confirmState)
    const solvedWords = extractedBoard ? getSolvedWordsFromBoard(extractedBoard) : []
    const suggestionSummary = runSuggestions(nextSubmission, solvedWords)
    setSuggestionsComplete(true)
    setCompletedSteps((prev) => {
      const next = [...prev]
      next[confirmStepIndex] = true
      return next
    })
    await delay(1000)
    setActiveIndex(confirmStepIndex + 1)
    await delay(1000)
    setCompletedSteps((prev) => {
      const next = [...prev]
      next[confirmStepIndex + 1] = true
      return next
    })
    await delay(1000)
    setActiveIndex(confirmStepIndex + 2)
    await delay(100)
    setCompletedSteps((prev) => {
      const next = [...prev]
      next[confirmStepIndex + 2] = true
      return next
    })
    await delay(900)
    setAnalysisDialogVisible(false)
    console.log('[WordVinder] Board analysis complete:', {
      ...suggestionSummary,
      extractedBoard: extractedBoard ?? undefined,
      missingByLength: extractedBoard?.missingByLength,
      imageName: selectedScreenshot?.name,
      source: 'upload',
    })
  }

  const runImageAnalysis = async (file: File, options?: { resetResults?: boolean }) => {
    setSelectedFile(file)
    setAnalysisDialogVisible(true)
    setActiveIndex(0)
    setAnalysisComplete(false)
    setSuggestionsComplete(false)
    setExtractedBoard(null)
    setConfirmState(null)
    if (options?.resetResults) {
      setSubmission(null)
      setResults([])
    }

    try {
      const uploadFile = await compressImageIfNeeded(file, {
        thresholdBytes: 2 * 1024 * 1024,
        maxSizeMB: 0.95,
        maxWidthOrHeight: 1920,
      })
      await delay(1000)
      setCompletedSteps((prev) => {
        const next = [...prev]
        next[0] = true
        return next
      })
      await delay(1000)
      setActiveIndex(1)

      const result = await analyzeBoard(uploadFile, { query: 'WORDSCAPES' })
      console.log('[WordVinder] Image analysis response:', result)

      if (result.ok) {
        setAnalysisComplete(true)
        await delay(1000)
        setCompletedSteps((prev) => {
          const next = [...prev]
          next[1] = true
          return next
        })
        await delay(1000)
        setActiveIndex(2)
        if (isWordscapesBoardState(result.board)) {
          setExtractedBoard(result.board)
          setConfirmState(normalizeConfirmStateFromBoard(result.board))
          setSelectedScreenshot(file)
          setLastSubmissionSource('upload')
          incrementAnalysisAttempts()
        } else {
          console.warn('[WordVinder] Wordscapes analysis returned non-wordscapes board:', result.board)
          setAnalysisDialogVisible(false)
          incrementAnalysisAttempts()
        }
      } else {
        setAnalysisDialogVisible(false)
        incrementAnalysisAttempts()
      }
    } catch (err) {
      console.error('[WordVinder] Board analysis failed:', err)
      console.log('analysisComplete: ', analysisComplete)
      console.log('selectedFile: ', selectedFile)
      console.log('suggestionsComplete: ', suggestionsComplete)
      setAnalysisDialogVisible(false)
      incrementAnalysisAttempts()
    }
  }

  const handleScreenshotUpload = async (event: { files: File[] }) => {
    const [file] = event.files
    if (!file) return
    setAnalysisAttempts(0)
    await runImageAnalysis(file)
  }

  const handleRetry = async () => {
    if (!selectedScreenshot || analysisDialogVisible || hasReachedRetryLimit) return
    await runImageAnalysis(selectedScreenshot, { resetResults: true })
  }

  const hasReachedRetryLimit = analysisAttempts >= maxAnalysisAttempts
  const isUploadEnabled = difyPingStatus === 'ok'
  const showRetryControls = lastSubmissionSource === 'upload' && !!selectedScreenshot
  const isRetryDisabled = hasReachedRetryLimit || analysisDialogVisible
  const activeStep = analysisSteps[activeIndex]
  const activeStepVisuals = activeStep ? getStepVisuals(activeStep, activeIndex) : null
  const canAddMissingLength = useMemo(() => {
    if (!confirmState) return false
    const used = new Set(confirmState.missingByLength.map((entry) => entry.length))
    return wordLengthChoices.some((length) => !used.has(length))
  }, [confirmState])

  return (
    <section className="page wordscapes-page">
      <ConfirmDialog />
      <div className="page-header">
        <div>
          <p className="eyebrow">Wordscapes Vinder (Finder)</p>
          <h1>Filter words by letters and length</h1>
          <p className="muted">
            Choose 4–7 letters, optionally pick target word lengths, and instantly see valid matches
            grouped by length.
          </p>
        </div>
      </div>

      <div className="wordscapes-layout">
        <div className="wordscapes-column">
          <div className="wordscapes-upload">
            <div className="wordscapes-upload-stack">
              <FileUpload
                mode="basic"
                customUpload
                uploadHandler={handleScreenshotUpload}
                chooseOptions={{
                  label: 'Upload Screenshot',
                  icon: (
                    <span style={{ marginRight: '10px' }}>
                      <FontAwesomeIcon icon={faImage} />
                    </span>
                  ),
                }}
                disabled={!isUploadEnabled}
                auto
                multiple={false}
                onSelect={() => setAnalysisAttempts(0)}
                className="p-button-lg"
              />
              {selectedScreenshot && screenshotPreviewUrl && (
                <div className='uploaded-screenshot'>
                  <Image
                    src={screenshotPreviewUrl}
                    alt={selectedScreenshot.name}
                    width="110"
                    preview
                    imageStyle={{
                      borderRadius: '10px',
                      border: '1px solid var(--surface-border)',
                      objectFit: 'cover',
                    }}
                  />
                  <div style={{ fontSize: '0.9rem', opacity: 0.8 }}>
                    <div style={{ fontWeight: 600 }}>Selected screenshot</div>
                    <div>{selectedScreenshot.name}</div>
                    <div style={{ fontSize: '0.8rem', opacity: 0.75 }}>
                      {(selectedScreenshot.size / (1024 * 1024)).toFixed(2)} MB
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
          <Accordion activeIndex={formAccordionIndex} onTabChange={handleFormAccordionChange}>
            <AccordionTab header="No screenshot? Set up your board manually">
              <WordFinderForm
                onSubmit={handleSubmit}
                onReset={handleReset}
                isDictionaryReady={!!wordsByLength && !isDictionaryLoading && !dictionaryError}
              />
            </AccordionTab>
          </Accordion>
        </div>
        <div className="wordscapes-column">
          <ResultsPanel
            submission={submission}
            results={results}
            isDictionaryLoading={isDictionaryLoading}
            dictionaryError={dictionaryError}
            showRetryControls={showRetryControls}
            onRetry={handleRetry}
            retryDisabled={isRetryDisabled}
            retryLimitReached={hasReachedRetryLimit}
          />
        </div>
      </div>

      <Dialog
        visible={analysisDialogVisible}
        modal
        closable={false}
        closeOnEscape={false}
        dismissableMask={false}
        draggable={false}
        resizable={false}
        className="wordscapes-analysis-dialog"
        showHeader={false}
        footer={null}
        onHide={() => setAnalysisDialogVisible(false)}
      >
        {isMobile ? (
          <div className="analysis-step-single">
            <span
              className="analysis-step-single-icon inline-flex align-items-center justify-content-center align-items-center border-circle border-primary border-1 h-3rem w-3rem z-1"
              style={{
                backgroundColor: activeStepVisuals?.backgroundColor,
                color: activeStepVisuals?.textColor,
                marginTop: 0,
              }}
            >
              {activeStepVisuals && <FontAwesomeIcon icon={activeStepVisuals.icon} />}
            </span>
            <div className="analysis-steps">
              <div className="analysis-step-label">Step {activeIndex + 1} of {stepCount}</div>
              {activeStep?.summary && (
                <h2 key={activeIndex} className="analysis-step-summary" style={{ textAlign: 'center' }}>
                  {activeStep.summary}
                </h2>
              )}
            </div>
          </div>
        ) : (
          <>
            <Steps readOnly={false} model={analysisSteps} activeIndex={activeIndex} />
            <div className="analysis-steps">
              {analysisSteps[activeIndex]?.summary && (
                <h2 key={activeIndex} className="analysis-step-summary" style={{ textAlign: 'center' }}>
                  {analysisSteps[activeIndex].summary}
                </h2>
              )}
            </div>
          </>
        )}
        {activeIndex === confirmStepIndex && (
          <div className="analysis-confirm-panel">
            <div className="analysis-confirm-preview">
              {selectedScreenshot && screenshotPreviewUrl && (
                <Image
                  src={screenshotPreviewUrl}
                  alt={selectedScreenshot.name}
                  width="140"
                  preview
                  imageStyle={{
                    borderRadius: '10px',
                    border: '1px solid var(--surface-border)',
                    objectFit: 'cover',
                  }}
                />
              )}
            </div>
            {confirmState ? (
              <div className="analysis-confirm-form">
                <div className="analysis-confirm-section">
                  <div className="analysis-confirm-label">Letters</div>
                  <div className="analysis-confirm-letters">
                    {confirmState.letters.map((letter, index) => (
                      <InputText
                        key={`confirm-letter-${index}`}
                        inputMode="text"
                        maxLength={1}
                        value={letter}
                        onChange={(event) => handleConfirmLetterChange(index, event.target.value)}
                        aria-label={`Letter ${index + 1}`}
                        autoComplete="off"
                        spellCheck={false}
                        className="focus-ring-target"
                      />
                    ))}
                  </div>
                </div>
                <div className="analysis-confirm-section">
                  <div className="analysis-confirm-missing-header">
                    <div className="analysis-confirm-label">Missing words by length</div>
                    <Button
                      type="button"
                      label="Add length"
                      size="small"
                      onClick={handleAddMissingLength}
                      disabled={!canAddMissingLength}
                      aria-disabled={!canAddMissingLength}
                      className="interactive-pressable"
                    />
                  </div>
                  <div className="analysis-confirm-missing-list">
                    {confirmState.missingByLength.map((entry, index) => {
                      const usedLengths = new Set(
                        confirmState.missingByLength
                          .filter((_, rowIndex) => rowIndex !== index)
                          .map((row) => row.length),
                      )
                      const lengthOptions = wordLengthChoices.map((length) => ({
                        label: `${length}`,
                        value: length,
                        disabled: usedLengths.has(length),
                      }))
                      return (
                        <div key={`missing-row-${index}`} className="analysis-confirm-row">
                          <Dropdown
                            value={entry.length}
                            options={lengthOptions}
                            optionDisabled="disabled"
                            onChange={(event) => handleMissingLengthChange(index, event.value)}
                            placeholder="Length"
                            aria-label={`Missing word length ${index + 1}`}
                            className="focus-ring-target"
                          />
                          <InputNumber
                            value={entry.count ?? null}
                            min={0}
                            max={20}
                            placeholder="Count"
                            onValueChange={(event) => handleMissingCountChange(index, event.value ?? null)}
                            inputClassName="focus-ring-target"
                          />
                          <Button
                            type="button"
                            icon="pi pi-times"
                            severity="secondary"
                            text
                            onClick={() => handleRemoveMissingLength(index)}
                            aria-label={`Remove length ${entry.length}`}
                          />
                        </div>
                      )
                    })}
                  </div>
                </div>
                {!isConfirmReady && (
                  <Message
                    severity="warn"
                    text={`Enter ${letterCountRange.min}–${letterCountRange.max} letters (A–Z) and valid missing counts before confirming.`}
                  />
                )}
              </div>
            ) : (
              <Message severity="warn" text="Board data is not ready yet." />
            )}
          </div>
        )}
        {activeIndex === confirmStepIndex && (
          <div className="analysis-confirm-footer">
            <Button
              type="button"
              label="Cancel"
              severity="secondary"
              outlined
              onClick={handleCancelConfirm}
              className="interactive-pressable"
            />
            <Button
              type="button"
              label="Re-Analyze"
              severity="secondary"
              onClick={handleReAnalyze}
              disabled={!selectedScreenshot || hasReachedRetryLimit}
              aria-disabled={!selectedScreenshot || hasReachedRetryLimit}
              className="interactive-pressable"
            />
            <Button
              type="button"
              label="Confirm"
              onClick={handleConfirm}
              disabled={!isConfirmReady}
              aria-disabled={!isConfirmReady}
              className="interactive-pressable"
            />
          </div>
        )}
      </Dialog>
    </section>
  )
}

export default WordscapesPage
