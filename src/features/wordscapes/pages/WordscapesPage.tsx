/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useMemo, useState } from 'react'
import { Dialog } from 'primereact/dialog'
import { FileUpload } from 'primereact/fileupload'
import { Accordion, AccordionTab } from 'primereact/accordion'
import type { AccordionTabChangeEvent } from 'primereact/accordion'
import ResultsPanel from '../components/ResultsPanel'
import WordFinderForm from '../components/WordFinderForm'
import { findMatchingWords } from '../logic/wordSearch'
import type { WordFinderSubmission, WordGroup } from '../types'
import { getWordscapesWordsByLength } from '../../../shared/dictionary/englishWords'
import '../wordscapes.css'
import { analyzeBoard } from '../../../services/analyzeBoard'
import { filterSolvedWords, mapBoardToSubmission } from '../logic/boardAdapter'
import { compressImageIfNeeded } from '../../../shared/utils/imageCompression'
import { Image } from 'primereact/image'
import { Steps } from 'primereact/steps'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faCheck, faDice, faImage, faMagnifyingGlass, faWandMagicSparkles } from '@fortawesome/free-solid-svg-icons'

function WordscapesPage() {
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
  const [activeIndex, setActiveIndex] = useState(0);
  const stepCount = 4;
  const maxAnalysisAttempts = 3
  const [completedSteps, setCompletedSteps] = useState<boolean[]>(
    Array(stepCount).fill(false)
  );
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
      summary: 'Identifying Possible Words'
    },
    {
      icon: faDice,
      template: (item: any) => itemRenderer(item, 3),
      summary: 'Complete! Now go finish that level!'
    }
  ];

  const itemRenderer = (item: any, itemIndex: any) => {
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
    if (!analysisDialogVisible) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setAnalysisComplete(false)
      setSuggestionsComplete(false)
    }
  }, [analysisDialogVisible])

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

  const runImageAnalysis = async (file: File, options?: { resetResults?: boolean }) => {
    setSelectedFile(file)
    setAnalysisDialogVisible(true)
    setActiveIndex(0)
    setAnalysisComplete(false)
    setSuggestionsComplete(false)
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

      const result = await analyzeBoard(uploadFile)
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
        const nextSubmission = mapBoardToSubmission(result.board)
        setLastSubmissionSource('upload')
        const suggestionSummary = runSuggestions(nextSubmission, result.board.solvedWords)
        setSuggestionsComplete(true)
        setSelectedScreenshot(file)
        await delay(1000)
        setCompletedSteps((prev) => {
          const next = [...prev]
          next[2] = true
          return next
        })
        await delay(1000)
        setActiveIndex(3)
        await delay(100)
        setCompletedSteps((prev) => {
          const next = [...prev]
          next[3] = true
          return next
        })
        await delay(900)
        setAnalysisDialogVisible(false)
        incrementAnalysisAttempts()
        console.log('[WordVinder] Board analysis complete:', {
          ...suggestionSummary,
          boardSummary: result.summary,
          unsolvedSlots: result.board.unsolvedSlots,
          imageName: file.name,
          source: 'upload',
        })
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
  const showRetryControls = lastSubmissionSource === 'upload' && !!selectedScreenshot
  const isRetryDisabled = hasReachedRetryLimit || analysisDialogVisible

  return (
    <section className="page wordscapes-page">
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
        <Steps readOnly={false} model={analysisSteps} activeIndex={activeIndex} />
        <div className="analysis-steps">
          {analysisSteps[activeIndex]?.summary && (
            <h2 key={activeIndex} className="analysis-step-summary" style={{ textAlign: 'center' }}>
              {analysisSteps[activeIndex].summary}
            </h2>
          )}
        </div>
      </Dialog>
    </section>
  )
}

export default WordscapesPage
