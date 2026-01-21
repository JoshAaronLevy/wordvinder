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
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { faCheck, faDice, faImage, faMagnifyingGlass, faWandMagicSparkles } from '@fortawesome/free-solid-svg-icons'

function WordscapesPage() {
  const [submission, setSubmission] = useState<WordFinderSubmission | null>(null)
  const [results, setResults] = useState<WordGroup[]>([])
  const [wordsByLength, setWordsByLength] = useState<Record<number, string[]> | null>(null)
  const [isDictionaryLoading, setIsDictionaryLoading] = useState(true)
  const [dictionaryError, setDictionaryError] = useState<string | null>(null)
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [analysisDialogVisible, setAnalysisDialogVisible] = useState(false)
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [analysisComplete, setAnalysisComplete] = useState(false)
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [suggestionsComplete, setSuggestionsComplete] = useState(false)
  const [selectedScreenshot, setSelectedScreenshot] = useState<File | null>(null)
  const [formAccordionIndex, setFormAccordionIndex] = useState<number | null>(null)
  const [activeIndex, setActiveIndex] = useState(0);
  const stepDelayMs = 2000;
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
    const backgroundColor = isActiveItem ? 'var(--primary-color)' : 'var(--surface-b)';
    const textColor = isActiveItem ? 'var(--surface-b)' : 'var(--text-color-secondary)';

    return (
      <span
        className="inline-flex align-items-center justify-content-center align-items-center border-circle border-primary border-1 h-3rem w-3rem z-1 cursor-pointer"
        style={{ backgroundColor: backgroundColor, color: textColor, marginTop: '-25px' }}
        onClick={() => setActiveIndex(itemIndex)}
      >
        <FontAwesomeIcon icon={item.icon} />
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
      return
    }
    const matches = findMatchingWords(payload, wordsByLength)
    setResults(solvedWords.length ? filterSolvedWords(matches, solvedWords) : matches)
  }

  const handleSubmit = (payload: WordFinderSubmission) => {
    runSuggestions(payload)
  }

  const handleReset = () => {
    setSubmission(null)
    setResults([])
  }

  const handleFormAccordionChange = (event: AccordionTabChangeEvent) => {
    const nextIndex = Array.isArray(event.index) ? event.index[0] ?? null : event.index ?? null
    setFormAccordionIndex(typeof nextIndex === 'number' ? nextIndex : null)
  }

  const handleScreenshotUpload = async (event: { files: File[] }) => {
    const [file] = event.files
    if (!file) return
    setSelectedFile(file)
    setAnalysisDialogVisible(true)
    setActiveIndex(0)
    setAnalysisComplete(false)
    setSuggestionsComplete(false)

    const advanceAfterDelay = () => new Promise<void>((resolve) => {
      window.setTimeout(resolve, stepDelayMs)
    })

    const uploadFile = await compressImageIfNeeded(file, {
      thresholdBytes: 2 * 1024 * 1024,
      maxSizeMB: 0.95,
      maxWidthOrHeight: 1920,
    })

    const imagePayload = {
      kind: 'wordvinder.screenshot.upload.v1',
      file: {
        name: file.name,
        type: file.type,
        size: file.size,
        lastModified: file.lastModified,
      },
    }

    console.log('[WordVinder] Selected screenshot file:', file)

    if (uploadFile !== file) {
      console.log('[WordVinder] Compressed screenshot for upload:', {
        originalBytes: file.size,
        compressedBytes: uploadFile.size,
        type: uploadFile.type,
        name: uploadFile.name,
      })
    }

    console.log('[WordVinder] Image payload:', imagePayload)

    try {
      await advanceAfterDelay()
      setActiveIndex(1)

      const result = await analyzeBoard(uploadFile)
      console.log('[WordVinder] Board analysis response:', result)
      if (result.ok) {
        setAnalysisComplete(true)
        await advanceAfterDelay()
        setActiveIndex(2)
        const nextSubmission = mapBoardToSubmission(result.board)
        runSuggestions(nextSubmission, result.board.solvedWords)
        setSuggestionsComplete(true)
        setSelectedScreenshot(file)
        await advanceAfterDelay()
        setActiveIndex(3)
        await advanceAfterDelay()
        setAnalysisDialogVisible(false)
      } else {
        setAnalysisDialogVisible(false)
      }
    } catch (err) {
      console.warn('[WordVinder] Board analysis failed:', err)
      setAnalysisDialogVisible(false)
    }
  }

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
                chooseLabel="Upload Screenshot"
                auto
                multiple={false}
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
