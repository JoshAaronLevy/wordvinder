const DEFAULT_REMOTE_API_BASE_URL = 'https://word-vinder-server.onrender.com'

const trimTrailingSlashes = (value: string) => value.replace(/\/+$/u, '')

const isLocalhost = () => {
  if (typeof window === 'undefined') {
    return false
  }

  const { hostname } = window.location
  return hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1'
}

export const getApiBaseUrl = () => {
  const envUrl = import.meta.env.VITE_WORD_VINDER_API_BASE_URL?.trim()

  if (envUrl) {
    return trimTrailingSlashes(envUrl)
  }

  if (isLocalhost()) {
    return 'http://localhost:3000'
  }

  return DEFAULT_REMOTE_API_BASE_URL
}

export const pingDifyMarco = async (): Promise<void> => {
  const baseUrl = getApiBaseUrl()
  const endpoint = `${baseUrl}/api/v1/dify/ping`
  const controller = new AbortController()
  const timeoutId = window.setTimeout(() => controller.abort(), 8000)

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ message: 'Marco' }),
      signal: controller.signal,
    })

    let payload: { ok?: boolean; response?: string; error?: { code?: string; message?: string } } | null =
      null

    try {
      payload = await response.json()
    } catch {
      payload = null
    }

    if (response.ok && payload?.ok) {
      const responseText = payload.response ?? 'OK'
      console.log(`[WordVinder] Dify ping OK: ${responseText} (${endpoint})`)
      return
    }

    const statusLabel = `status ${response.status}`
    const errorCode = payload?.error?.code ? ` code ${payload.error.code}` : ''
    const errorMessage = payload?.error?.message ? `: ${payload.error.message}` : ''
    console.warn(`[WordVinder] Dify ping failed (${statusLabel}${errorCode}${errorMessage})`)
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      console.warn(`[WordVinder] Dify ping timed out (8s)`)
      return
    }

    console.warn('[WordVinder] Dify ping failed (network error)')
  } finally {
    window.clearTimeout(timeoutId)
  }
}
