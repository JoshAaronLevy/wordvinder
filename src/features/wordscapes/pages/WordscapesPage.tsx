import { useEffect, useState } from 'react'
import { Dialog } from 'primereact/dialog'
import { FileUpload } from 'primereact/fileupload'
import ResultsPanel from '../components/ResultsPanel'
import WordFinderForm from '../components/WordFinderForm'
import { findMatchingWords } from '../logic/wordSearch'
import type { WordFinderSubmission, WordGroup } from '../types'
import { getWordscapesWordsByLength } from '../../../shared/dictionary/englishWords'
import '../wordscapes.css'
import { analyzeBoard } from '../../../services/analyzeBoard'
import { filterSolvedWords, mapBoardToSubmission } from '../logic/boardAdapter'

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
    if (!analysisDialogVisible || !suggestionsComplete) return
    const timeout = window.setTimeout(() => {
      setAnalysisDialogVisible(false)
    }, 2000)
    return () => window.clearTimeout(timeout)
  }, [analysisDialogVisible, suggestionsComplete])

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

  const handleScreenshotUpload = async (event: { files: File[] }) => {
    const [file] = event.files
    if (!file) return
    setSelectedFile(file)
    setAnalysisDialogVisible(true)
    setAnalysisComplete(false)
    setSuggestionsComplete(false)

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
    console.log('[WordVinder] Image payload:', imagePayload)

    try {
      const result = await analyzeBoard(file)
      console.log('[WordVinder] Board analysis response:', result)
      if (result.ok) {
        setAnalysisComplete(true)
        const nextSubmission = mapBoardToSubmission(result.board)
        runSuggestions(nextSubmission, result.board.solvedWords)
        setSuggestionsComplete(true)
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
              {selectedFile && (
                <small className="muted wordscapes-upload-filename">Selected: {selectedFile.name}</small>
              )}
            </div>
          </div>
          <WordFinderForm
            onSubmit={handleSubmit}
            onReset={handleReset}
            isDictionaryReady={!!wordsByLength && !isDictionaryLoading && !dictionaryError}
          />
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
        header="AI Board Analysis"
        visible={analysisDialogVisible}
        modal
        closable={false}
        closeOnEscape={false}
        dismissableMask={false}
        draggable={false}
        resizable={false}
        className="wordscapes-analysis-dialog"
        onHide={() => setAnalysisDialogVisible(false)}
      >
        <div className="analysis-steps">
          <div className="analysis-step">1. Running AI Board Analysis</div>
          <div className={`analysis-step${analysisComplete ? '' : ' is-muted'}`}>
            2. Identifying Possible Words
          </div>
          <div className={`analysis-step${suggestionsComplete ? '' : ' is-muted'}`}>3. Finished!</div>
        </div>
      </Dialog>
    </section>
  )
}

export default WordscapesPage
