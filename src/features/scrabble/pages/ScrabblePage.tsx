import { useEffect, useMemo, useState } from 'react'
import { Dialog } from 'primereact/dialog'
import { FileUpload } from 'primereact/fileupload'
import { Steps } from 'primereact/steps'
import { Button } from 'primereact/button'
import { Message } from 'primereact/message'
import { Image } from 'primereact/image'
import { analyzeBoard, getApiBaseUrl, isScrabbleBoardState } from '../../../services/analyzeBoard'
import type { ScrabbleBoardState } from '../../../services/analyzeBoard'
import { compressImageIfNeeded } from '../../../shared/utils/imageCompression'
import { useAppContext } from '../../../app/AppContext'
import ScrabbleRack from '../components/ScrabbleRack'
import ScrabbleBoard from '../components/ScrabbleBoard'
import '../scrabble.css'

const stepCount = 4

const buildEmptySteps = () => Array(stepCount).fill(false)

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
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const isUploadEnabled = difyPingStatus === 'ok'

  const analysisSteps = useMemo(
    () => [
      { label: `Prepare image${completedSteps[0] ? ' (done)' : ''}` },
      { label: `Analyze screenshot${completedSteps[1] ? ' (done)' : ''}` },
      { label: `Review extraction${completedSteps[2] ? ' (done)' : ''}` },
      { label: `Complete${completedSteps[3] ? ' (done)' : ''}` },
    ],
    [completedSteps]
  )

  const screenshotPreviewUrl = useMemo(() => {
    if (!selectedScreenshot) return null
    return URL.createObjectURL(selectedScreenshot)
  }, [selectedScreenshot])

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
    setSelectedFile(null)
    setSelectedScreenshot(null)
    setExtractedScrabbleBoard(null)
  }

  const handleCancel = () => {
    closeDialog()
    setConfirmedScrabbleBoard(null)
  }

  const handleConfirm = () => {
    if (!analysisComplete || !extractedScrabbleBoard) return
    setConfirmedScrabbleBoard(extractedScrabbleBoard)
    closeDialog()
  }

  const runImageAnalysis = async (file: File) => {
    setSelectedFile(file)
    setSelectedScreenshot(file)
    setAnalysisDialogVisible(true)
    setActiveIndex(0)
    setCompletedSteps(buildEmptySteps())
    setAnalysisComplete(false)
    setErrorMessage(null)
    setExtractedScrabbleBoard(null)
    setConfirmedScrabbleBoard(null)

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
            <p className="muted">Here is the Scrabble rack and board that were confirmed.</p>
          </div>
          <div>
            <h3 style={{ marginBottom: '0.5rem' }}>Rack</h3>
            <ScrabbleRack rack={confirmedScrabbleBoard.rack} />
          </div>
          <div>
            <h3 style={{ marginBottom: '0.5rem' }}>Board</h3>
            <div className="scrabble-board-scroll">
              <ScrabbleBoard
                tiles={confirmedScrabbleBoard.board.tiles}
                size={confirmedScrabbleBoard.board.size}
              />
            </div>
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
        <Steps readOnly model={analysisSteps} activeIndex={activeIndex} />
        <div className="scrabble-dialog-body">
          {errorMessage && <Message severity="error" text={errorMessage} />}

          {activeIndex === 0 && (
            <div className="scrabble-dialog-center">
              <h2>Preparing your image</h2>
              <p className="muted">Optimizing the screenshot for faster analysis.</p>
              {selectedFile && (
                <p className="muted">
                  Uploading {selectedFile.name} ({(selectedFile.size / (1024 * 1024)).toFixed(2)}{' '}
                  MB)
                </p>
              )}
            </div>
          )}

          {activeIndex === 1 && (
            <div className="scrabble-dialog-center">
              <h2>Analyzing screenshot</h2>
              <p className="muted">Extracting your Scrabble rack and board.</p>
            </div>
          )}

          {activeIndex === 2 && (
            <div className="scrabble-review">
              <div className="scrabble-dialog-center">
                <h2>Review extraction</h2>
                <p className="muted">Confirm the detected rack and board tiles.</p>
              </div>
              {extractedScrabbleBoard ? (
                <>
                  <div>
                    <h3 style={{ marginBottom: '0.5rem' }}>Rack</h3>
                    <ScrabbleRack rack={extractedScrabbleBoard.rack} />
                  </div>
                  <div>
                    <h3 style={{ marginBottom: '0.5rem' }}>Board</h3>
                    <div className="scrabble-board-scroll">
                      <ScrabbleBoard
                        tiles={extractedScrabbleBoard.board.tiles}
                        size={extractedScrabbleBoard.board.size}
                      />
                    </div>
                  </div>
                </>
              ) : (
                <Message severity="warn" text="Scrabble board data is not available to review." />
              )}
            </div>
          )}

          {activeIndex === 3 && (
            <div className="scrabble-dialog-center">
              <h2>Complete</h2>
              <p className="muted">Scrabble analysis finished. You can close this dialog.</p>
            </div>
          )}
        </div>

        <div className="scrabble-dialog-footer">
          <Button type="button" label="Cancel" severity="secondary" outlined onClick={handleCancel} />
          {activeIndex === 2 && (
            <Button
              type="button"
              label="Confirm"
              onClick={handleConfirm}
              disabled={!analysisComplete}
              aria-disabled={!analysisComplete}
            />
          )}
        </div>
      </Dialog>
    </section>
  )
}

export default ScrabblePage
