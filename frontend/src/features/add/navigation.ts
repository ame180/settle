import { useCallback, useEffect, useRef } from 'react'
import { useIsMutating } from '@tanstack/react-query'
import { useBlocker, useNavigate } from 'react-router'
import { saveMutationKey } from '@/api/expenses'

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

export function useIsSaving(): boolean {
  return useIsMutating({ mutationKey: saveMutationKey }) > 0
}

/**
 * Holds any navigation away from a form with unsaved input (close button, back gesture, links)
 * until the user confirms. While a save is in flight, leaving is refused outright, so a save
 * can't land after the user chose to discard. Call `allowLeave()` before leaving after a save.
 */
export function useLeaveGuard(dirty: boolean) {
  const leavingRef = useRef(false)
  const saving = useIsSaving()
  const blocker = useBlocker(
    ({ currentLocation, nextLocation }) =>
      !leavingRef.current &&
      (saving || dirty) &&
      currentLocation.pathname !== nextLocation.pathname,
  )

  useEffect(() => {
    if (saving && blocker.state === 'blocked') {
      blocker.reset()
    }
  }, [saving, blocker])

  return {
    blocked: blocker.state === 'blocked' && !saving,
    discard: () => blocker.proceed?.(),
    keepEditing: () => blocker.reset?.(),
    allowLeave: () => {
      leavingRef.current = true
    },
  }
}
