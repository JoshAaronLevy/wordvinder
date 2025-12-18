import { useEffect, useRef, useState } from 'react'

/**
 * Ensures a loading indicator is visible for at least the provided delay whenever `isActive` flips
 * to true. Useful for short synchronous operations that still benefit from micro-feedback.
 */
function useMinimumDelay(isActive: boolean, delay = 200) {
  const [isVisible, setIsVisible] = useState(false)
  const startTimeRef = useRef<number | null>(null)

  useEffect(() => {
    let timeoutId: number | undefined

    if (isActive) {
      if (!isVisible) {
        startTimeRef.current = Date.now()
        setIsVisible(true)
      }
    } else if (isVisible) {
      const elapsed = startTimeRef.current ? Date.now() - startTimeRef.current : delay
      const remaining = Math.max(delay - elapsed, 0)
      timeoutId = window.setTimeout(() => {
        startTimeRef.current = null
        setIsVisible(false)
      }, remaining)
    } else {
      startTimeRef.current = null
    }

    return () => {
      if (timeoutId) {
        window.clearTimeout(timeoutId)
      }
    }
  }, [isActive, delay, isVisible])

  return isVisible
}

export default useMinimumDelay
