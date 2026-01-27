import { useEffect, useMemo, useState } from 'react'
import { Dialog } from 'primereact/dialog'
import { FileUpload } from 'primereact/fileupload'
import { Steps } from 'primereact/steps'
import { Button } from 'primereact/button'
import { InputText } from 'primereact/inputtext'
import { Message } from 'primereact/message'
import { Image } from 'primereact/image'
import { analyzeBoard, getApiBaseUrl, isScrabbleBoardState } from '../../../services/analyzeBoard'
import type { ScrabbleBoardState, ScrabbleRackTile } from '../../../services/analyzeBoard'
import { compressImageIfNeeded } from '../../../shared/utils/imageCompression'
import { useAppContext } from '../../../app/AppContext'
import ScrabbleRack from '../components/ScrabbleRack'
import '../scrabble.css'

const stepCount = 4
const maxAddLetters = 50
const scrabbleLetterPoints: Record<string, number> = {
  A: 1,
  B: 3,
  C: 3,
  D: 2,
  E: 1,
  F: 4,
  G: 2,
  H: 4,
  I: 1,
  J: 8,
  K: 5,
  L: 1,
  M: 3,
  N: 1,
  O: 1,
  P: 3,
  Q: 10,
  R: 1,
  S: 1,
  T: 1,
  U: 1,
  V: 4,
  W: 4,
  X: 8,
  Y: 4,
  Z: 10,
}

const buildEmptySteps = () => Array(stepCount).fill(false)
const cloneRack = (rack: ScrabbleRackTile[]) => rack.map((tile) => ({ ...tile }))
const createBlankTile = (): ScrabbleRackTile => ({ letter: null, isBlank: true, points: 0 })
const createLetterTile = (letter: string): ScrabbleRackTile => ({
  letter,
  isBlank: false,
  points: scrabbleLetterPoints[letter] ?? 0,
})
const normalizeLetter = (value: string) => {
  const match = value.toUpperCase().match(/[A-Z]/u)
  return match ? match[0] : ''
}
const getTileError = (tile: ScrabbleRackTile) => {
  if (tile.isBlank) return null
  if (!tile.letter || !/^[A-Z]$/u.test(tile.letter)) {
    return 'Enter A-Z or mark blank.'
  }
  return null
}

function ScrabblePage() {
  const { difyPingStatus } = useAppContext()
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [analysisDialogVisible, setAnalysisDialogVisible] = useState(false)
  const [activeIndex, setActiveIndex] = useState(0)
  const [completedSteps, setCompletedSteps] = useState<boolean[]>(buildEmptySteps())
  const [analysisComplete, setAnalysisComplete] = useState(false)
  const [selectedScreenshot, setSelectedScreenshot] = useState<File | null>(null)
  const [extractedScrabbleBoard, setExtractedScrabbleBoard] =
    useState<ScrabbleBoardState | null>(null)
  const [confirmedScrabbleBoard, setConfirmedScrabbleBoard] =
    useState<ScrabbleBoardState | null>(null)
  const [editableLetterPool, setEditableLetterPool] = useState<ScrabbleRackTile[]>([])
  const [addLettersInput, setAddLettersInput] = useState('')
  const [addLettersNote, setAddLettersNote] = useState<string | null>(null)
  const [generalError, setGeneralError] = useState<string | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [isMobile, setIsMobile] = useState(false)

  const isUploadEnabled = difyPingStatus === 'ok'
  const confirmStepIndex = 2
  const tileErrors = useMemo(() => {
    const errors: Record<number, string> = {}
    editableLetterPool.forEach((tile, index) => {
      const error = getTileError(tile)
      if (error) {
        errors[index] = error
      }
    })
    return errors
  }, [editableLetterPool])
  const hasTileErrors = Object.keys(tileErrors).length > 0
  const canConfirm = analysisComplete && Boolean(extractedScrabbleBoard) && !hasTileErrors

  const analysisSteps = useMemo(
    () => [
      {
        label: `Prepare image${completedSteps[0] ? ' (done)' : ''}`,
        summary: 'Preparing your image',
      },
      {
        label: `Analyze screenshot${completedSteps[1] ? ' (done)' : ''}`,
        summary: 'Analyzing screenshot',
      },
      {
        label: `Review extraction${completedSteps[2] ? ' (done)' : ''}`,
        summary: 'Review extraction',
      },
      {
        label: `Complete${completedSteps[3] ? ' (done)' : ''}`,
        summary: 'Complete',
      },
    ],
    [completedSteps]
  )
  const activeStep = analysisSteps[activeIndex]

  const screenshotPreviewUrl = useMemo(() => {
    if (!selectedScreenshot) return null
    return URL.createObjectURL(selectedScreenshot)
  }, [selectedScreenshot])

  useEffect(() => {
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
    return () => {
      if (screenshotPreviewUrl) URL.revokeObjectURL(screenshotPreviewUrl)
    }
  }, [screenshotPreviewUrl])

  const closeDialog = () => {
    setAnalysisDialogVisible(false)
    setActiveIndex(0)
    setCompletedSteps(buildEmptySteps())
    setAnalysisComplete(false)
    setErrorMessage(null)
    setGeneralError(null)
    setEditableLetterPool([])
    setAddLettersInput('')
    setAddLettersNote(null)
    setSelectedFile(null)
    setSelectedScreenshot(null)
    setExtractedScrabbleBoard(null)
  }

  const handleCancel = () => {
    closeDialog()
  }

  const handleConfirm = () => {
    if (!analysisComplete || !extractedScrabbleBoard) return
    if (hasTileErrors) {
      setGeneralError('Fix invalid letters before confirming.')
      return
    }
    setConfirmedScrabbleBoard({
      ...extractedScrabbleBoard,
      rack: cloneRack(editableLetterPool),
    })
    closeDialog()
  }

  const handleTileLetterChange = (index: number, value: string) => {
    setEditableLetterPool((prev) => {
      const next = [...prev]
      const letter = normalizeLetter(value)
      const current = next[index]
      if (!current) return prev
      if (letter) {
        next[index] = createLetterTile(letter)
      } else {
        next[index] = { ...current, letter: '', isBlank: false, points: 0 }
      }
      return next
    })
    setGeneralError(null)
  }

  const toggleTileBlank = (index: number) => {
    setEditableLetterPool((prev) => {
      const next = [...prev]
      const current = next[index]
      if (!current) return prev
      next[index] = current.isBlank ? { letter: '', isBlank: false, points: 0 } : createBlankTile()
      return next
    })
    setGeneralError(null)
  }

  const removeTile = (index: number) => {
    setEditableLetterPool((prev) => prev.filter((_, tileIndex) => tileIndex !== index))
    setGeneralError(null)
  }

  const handleAddLetters = () => {
    const rawInput = addLettersInput.trim()
    if (!rawInput) return
    const nextTiles: ScrabbleRackTile[] = []
    let truncated = false

    for (const char of rawInput) {
      if (nextTiles.length >= maxAddLetters) {
        truncated = true
        break
      }
      if (/[A-Za-z]/u.test(char)) {
        const letter = char.toUpperCase()
        nextTiles.push(createLetterTile(letter))
        continue
      }
      if (char === '?' || char === '_') {
        nextTiles.push(createBlankTile())
      }
    }

    if (!nextTiles.length) {
      setGeneralError('Enter letters A-Z or use ?/_ for blanks.')
      return
    }

    setEditableLetterPool((prev) => [...prev, ...nextTiles])
    setAddLettersInput('')
    setAddLettersNote(truncated ? `Input trimmed to the first ${maxAddLetters} characters.` : null)
    setGeneralError(null)
  }

  const handleAddBlank = () => {
    setEditableLetterPool((prev) => [...prev, createBlankTile()])
    setGeneralError(null)
    setAddLettersNote(null)
  }

  const runImageAnalysis = async (file: File) => {
    setSelectedFile(file)
    setSelectedScreenshot(file)
    setAnalysisDialogVisible(true)
    setActiveIndex(0)
    setCompletedSteps(buildEmptySteps())
    setAnalysisComplete(false)
    setErrorMessage(null)
    setGeneralError(null)
    setEditableLetterPool([])
    setAddLettersInput('')
    setAddLettersNote(null)
    setExtractedScrabbleBoard(null)

    try {
      const uploadFile = await compressImageIfNeeded(file, {
        thresholdBytes: 2 * 1024 * 1024,
        maxSizeMB: 0.95,
        maxWidthOrHeight: 1920,
      })
      setSelectedFile(uploadFile)

      console.log('[WordVinder] Scrabble upload payload:', {
        endpoint: `${getApiBaseUrl()}/api/v1/board/parse-screenshot`,
        file: { name: uploadFile.name, size: uploadFile.size, type: uploadFile.type },
      })

      setCompletedSteps((prev) => {
        const next = [...prev]
        next[0] = true
        return next
      })
      setActiveIndex(1)

      const result = await analyzeBoard(uploadFile, { query: 'SCRABBLE' })
      console.log('[WordVinder] Scrabble analysis response:', result)

      if (result.ok) {
        setCompletedSteps((prev) => {
          const next = [...prev]
          next[1] = true
          return next
        })

        if (isScrabbleBoardState(result.board)) {
          setExtractedScrabbleBoard(result.board)
          setEditableLetterPool(cloneRack(result.board.rack))
          setAddLettersInput('')
          setAddLettersNote(null)
          setGeneralError(null)
          setAnalysisComplete(true)
          setActiveIndex(2)
        } else {
          console.warn('[WordVinder] Scrabble analysis returned non-scrabble board:', result.board)
          setErrorMessage(
            "This screenshot didn't look like Scrabble. Try a clearer Scrabble board screenshot."
          )
          setActiveIndex(2)
        }
        return
      }

      setErrorMessage(result.error?.message ?? 'Unable to analyze screenshot.')
    } catch (error) {
      console.error('[WordVinder] Scrabble analysis failed:', error)
      setErrorMessage('Unable to analyze screenshot.')
    }
  }

  const handleScreenshotUpload = async (event: { files: File[] }) => {
    const [file] = event.files
    if (!file) return
    await runImageAnalysis(file)
  }

  return (
    <section className="page scrabble-page">
      <div className="page-header">
        <div>
          <p className="eyebrow">Scrabble Vinder</p>
          <h1>Upload a Scrabble screenshot</h1>
          <p className="muted">
            Upload a screenshot to extract your rack and 15x15 board before confirming.
          </p>
        </div>
      </div>

      <div className="scrabble-upload">
        <div className="scrabble-upload-stack">
          <FileUpload
            mode="basic"
            customUpload
            uploadHandler={handleScreenshotUpload}
            chooseOptions={{ label: 'Upload Screenshot' }}
            disabled={!isUploadEnabled}
            auto
            multiple={false}
            onSelect={() => {
              setErrorMessage(null)
              setCompletedSteps(buildEmptySteps())
            }}
            className="p-button-lg"
          />
          {!isUploadEnabled && (
            <Message
              severity="warn"
              text="Screenshot analysis is unavailable until the service is ready."
            />
          )}
          {selectedScreenshot && screenshotPreviewUrl && (
            <div className="scrabble-upload-preview">
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
              <div className="scrabble-upload-meta">
                <div className="scrabble-upload-meta-title">Selected screenshot</div>
                <div>{selectedScreenshot.name}</div>
                <div className="scrabble-upload-meta-size">
                  {(selectedScreenshot.size / (1024 * 1024)).toFixed(2)} MB
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {confirmedScrabbleBoard && (
        <div className="scrabble-confirmed">
          <div>
            <h2>Confirmed extraction</h2>
            <p className="muted">Here are the available letters you confirmed.</p>
          </div>
          <div>
            <h3 style={{ marginBottom: '0.5rem' }}>Available letters</h3>
            <ScrabbleRack rack={confirmedScrabbleBoard.rack} />
          </div>
        </div>
      )}

      <Dialog
        visible={analysisDialogVisible}
        modal
        closable={false}
        closeOnEscape={false}
        dismissableMask={false}
        draggable={false}
        resizable={false}
        className="scrabble-analysis-dialog"
        showHeader={false}
        footer={null}
        onHide={closeDialog}
      >
        {isMobile ? (
          <div className="analysis-step-single">
            <span
              className="analysis-step-single-icon inline-flex align-items-center justify-content-center align-items-center border-circle border-primary border-1 h-3rem w-3rem z-1"
              style={{
                backgroundColor: completedSteps[activeIndex]
                  ? 'var(--green-500)'
                  : 'var(--primary-color)',
                color: completedSteps[activeIndex] ? 'var(--surface-0)' : 'var(--surface-b)',
                marginTop: 0,
              }}
            >
              {completedSteps[activeIndex] ? '✓' : `${activeIndex + 1}`}
            </span>
            <div className="analysis-steps">
              <div className="analysis-step-label">
                Step {activeIndex + 1} of {stepCount}
              </div>
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
        {errorMessage && <Message severity="error" text={errorMessage} />}

        {activeIndex === 0 && (
          <div className="scrabble-dialog-center">
            <p className="muted">Optimizing the screenshot for faster analysis.</p>
            {selectedFile && (
              <p className="muted">
                Uploading {selectedFile.name} ({(selectedFile.size / (1024 * 1024)).toFixed(2)} MB)
              </p>
            )}
          </div>
        )}

        {activeIndex === 1 && (
          <div className="scrabble-dialog-center">
            <p className="muted">Extracting your Scrabble rack and board.</p>
          </div>
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
            {extractedScrabbleBoard ? (
              <div className="analysis-confirm-form">
                <div className="analysis-confirm-section">
                  <div className="analysis-confirm-label">
                    Available letters (rack + optional board anchor letters)
                  </div>
                  <p className="muted">
                    Add one or more letters from the board to see words that connect.
                  </p>
                  <div className="scrabble-letter-pool">
                    {!editableLetterPool.length && (
                      <p className="muted">No letters detected yet. Add letters below.</p>
                    )}
                    {editableLetterPool.map((tile, index) => {
                      const error = tileErrors[index]
                      return (
                        <div key={`editable-tile-${index}`} className="scrabble-letter-tile">
                          <div className="scrabble-letter-input">
                            {tile.isBlank ? (
                              <span className="scrabble-letter-blank">Blank tile</span>
                            ) : (
                              <InputText
                                value={tile.letter ?? ''}
                                onChange={(event) =>
                                  handleTileLetterChange(index, event.target.value)
                                }
                                maxLength={1}
                                placeholder="A"
                              />
                            )}
                            <span className="scrabble-letter-points">{tile.points}</span>
                          </div>
                          <div className="scrabble-letter-actions">
                            <Button
                              type="button"
                              label={tile.isBlank ? 'Unset blank' : 'Set blank'}
                              severity="secondary"
                              outlined={!tile.isBlank}
                              onClick={() => toggleTileBlank(index)}
                            />
                            <Button
                              type="button"
                              icon="pi pi-times"
                              aria-label="Remove tile"
                              severity="secondary"
                              outlined
                              onClick={() => removeTile(index)}
                            />
                          </div>
                          {error && <span className="scrabble-letter-error">{error}</span>}
                        </div>
                      )
                    })}
                  </div>
                  <div className="scrabble-add-letters">
                    <div className="scrabble-add-letters-row">
                      <InputText
                        value={addLettersInput}
                        onChange={(event) => {
                          setAddLettersInput(event.target.value)
                          setAddLettersNote(null)
                          setGeneralError(null)
                        }}
                        placeholder="Type letters, e.g. aeTr or A?E"
                      />
                      <Button type="button" label="Add" onClick={handleAddLetters} />
                      <Button
                        type="button"
                        label="Add Blank"
                        severity="secondary"
                        outlined
                        onClick={handleAddBlank}
                      />
                    </div>
                    {addLettersNote && (
                      <span className="scrabble-add-letters-note">{addLettersNote}</span>
                    )}
                  </div>
                  {generalError && (
                    <Message
                      severity="error"
                      text={generalError}
                      className="scrabble-letter-error-message"
                    />
                  )}
                </div>
              </div>
            ) : (
              <Message severity="warn" text="Scrabble board data is not available to review." />
            )}
          </div>
        )}

        {activeIndex === 3 && (
          <div className="scrabble-dialog-center">
            <p className="muted">Scrabble analysis finished. You can close this dialog.</p>
          </div>
        )}

        {activeIndex === confirmStepIndex && (
          <div className="analysis-confirm-footer">
            <Button
              type="button"
              label="Cancel"
              severity="secondary"
              outlined
              onClick={handleCancel}
            />
            <Button
              type="button"
              label="Confirm"
              onClick={handleConfirm}
              disabled={!canConfirm}
              aria-disabled={!canConfirm}
            />
          </div>
        )}
      </Dialog>
    </section>
  )
}

export default ScrabblePage
