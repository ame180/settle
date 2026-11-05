import { useCallback, useRef } from 'react'
import { useBlocker, useNavigate } from 'react-router'

/** Back to wherever the user came from, or `fallback` when the app was opened on this page. */
export function useGoBack(fallback: string) {
  const navigate = useNavigate()
  return useCallback(() => {
    const hasInAppHistory = (window.history.state?.idx ?? 0) > 0
    if (hasInAppHistory) {
      navigate(-1)
    } else {
      navigate(fallback, { replace: true })
    }
  }, [navigate, fallback])
}

/**
 * Holds any navigation away from a form with unsaved input (close button, back gesture, links)
 * until the user confirms. Call `allowLeave()` before navigating away after a save.
 */
export function useLeaveGuard(dirty: boolean) {
  const leavingRef = useRef(false)
  const blocker = useBlocker(
    ({ currentLocation, nextLocation }) =>
      dirty && !leavingRef.current && currentLocation.pathname !== nextLocation.pathname,
  )

  return {
    blocked: blocker.state === 'blocked',
    discard: () => blocker.proceed?.(),
    keepEditing: () => blocker.reset?.(),
    allowLeave: () => {
      leavingRef.current = true
    },
  }
}
