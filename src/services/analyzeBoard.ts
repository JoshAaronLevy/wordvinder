const DEFAULT_REMOTE_API_BASE_URL = 'https://word-vinder-server.onrender.com'
const API_TIMEOUT_MS = 30000

const trimTrailingSlashes = (value: string) => value.replace(/\/+$/u, '')

const isLocalhost = () => {
  if (typeof window === 'undefined') return false
  const { hostname } = window.location
  return hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1'
}

export const getApiBaseUrl = () => {
  const envUrl = import.meta.env.VITE_WORD_VINDER_API_BASE_URL?.trim()
  if (envUrl) return trimTrailingSlashes(envUrl)

  if (isLocalhost()) return 'http://localhost:3000'

  return DEFAULT_REMOTE_API_BASE_URL
}

export type MissingByLengthEntry = {
  length: number
  count: number | null
}

export type SolvedWordsByLengthEntry = {
  length: number
  words: string[]
}

export type WordListEntry = {
  length: number
  slots: Array<string | null>
}

export type WordscapesBoardState = {
  schema: 'WORDVINDER_BOARD_EXTRACT_V4'
  game: 'WORDSCAPES'
  letters: string[]
  missingByLength: MissingByLengthEntry[]
  solvedWordsByLength?: SolvedWordsByLengthEntry[]
  wordLists?: WordListEntry[]
  notes?: string[]
}

export type ScrabbleRackTile = {
  letter: string | null
  points: number
  isBlank: boolean
}

export type ScrabbleBoard = {
  size: 15
  tiles: Array<Array<string | null>>
}

export type ScrabbleBoardState = {
  schema: 'WORDVINDER_SCRABBLE_EXTRACT_V1'
  game: 'SCRABBLE'
  rack: ScrabbleRackTile[]
  board: ScrabbleBoard
  notes?: string[]
}

export type AnyBoardState = WordscapesBoardState | ScrabbleBoardState

export const isScrabbleBoardState = (
  value: AnyBoardState
): value is ScrabbleBoardState =>
  value?.schema === 'WORDVINDER_SCRABBLE_EXTRACT_V1' && value?.game === 'SCRABBLE'

export const isWordscapesBoardState = (
  value: AnyBoardState
): value is WordscapesBoardState =>
  value?.schema === 'WORDVINDER_BOARD_EXTRACT_V4' && value?.game === 'WORDSCAPES'

export type BoardSummary = {
  letters: string
  remainingByLength: MissingByLengthEntry[]
  totalRemaining: number | null
}

export type AnalyzeBoardOk = {
  ok: true
  board: AnyBoardState
  summary: BoardSummary
  debug?: { modelText?: string }
}

export type AnalyzeBoardErr = {
  ok: false
  error: {
    code?: string
    message?: string
    details?: unknown
  }
  debug?: { modelText?: string }
}

export type AnalyzeBoardResponse = AnalyzeBoardOk | AnalyzeBoardErr

/**
 * Sends a screenshot to the Word Vinder Node API which will:
 * - upload file to Dify
 * - run chatflow extraction
 * - parse/validate model JSON
 * - return { ok, board, summary }
 */
export type AnalyzeBoardOptions = {
  query?: string
}

export const analyzeBoard = async (
  file: File,
  options: AnalyzeBoardOptions = {}
): Promise<AnalyzeBoardResponse> => {
  const baseUrl = getApiBaseUrl()
  const endpoint = `${baseUrl}/api/v1/board/parse-screenshot`

  console.log('[WordVinder] analyzeBoard request:', {
    endpoint,
    file: { name: file.name, size: file.size, type: file.type },
    query: options.query,
  })

  const formData = new FormData()
  formData.append('image', file)
  if (options.query) {
    formData.append('query', options.query)
  }

  const controller = new AbortController()
  const timeoutId = window.setTimeout(() => controller.abort(), API_TIMEOUT_MS)

  try {
    const res = await fetch(endpoint, {
      method: 'POST',
      body: formData,
      signal: controller.signal,
      // IMPORTANT: do NOT set Content-Type for multipart/form-data; the browser will set boundary.
    })

    const text = await res.text()

    // Try JSON parse; if not JSON, return a shaped error response
    let payload: AnalyzeBoardResponse | null = null
    try {
      payload = JSON.parse(text) as AnalyzeBoardResponse
    } catch {
      payload = null
    }

    console.log('[WordVinder] analyzeBoard raw response:', payload)

    if (!payload) {
      return {
        ok: false,
        error: {
          code: 'NON_JSON_RESPONSE',
          message: `API returned non-JSON response (status ${res.status}).`,
          details: text || null,
        },
      }
    }

    // If API returned ok:true, great.
    if (res.ok && payload.ok) {
      console.log(`[WordVinder] analyzeBoard OK (${endpoint})`)
      return payload
    }

    // API returned ok:false or non-2xx with JSON
    const code = payload.ok ? undefined : payload.error?.code
    const message = payload.ok ? undefined : payload.error?.message

    console.warn(
      `[WordVinder] analyzeBoard failed (status ${res.status}${code ? ` code ${code}` : ''}${message ? `: ${message}` : ''})`
    )

    return payload
  } catch (error) {
    // Timeout
    if (error instanceof DOMException && error.name === 'AbortError') {
      return {
        ok: false,
        error: {
          code: 'TIMEOUT',
          message: `Request timed out after ${API_TIMEOUT_MS}ms.`,
          details: { endpoint },
        },
      }
    }

    // Network / other
    return {
      ok: false,
      error: {
        code: 'NETWORK_ERROR',
        message: 'Network error while calling analyzeBoard.',
        details: { endpoint },
      },
    }
  } finally {
    window.clearTimeout(timeoutId)
  }
}
