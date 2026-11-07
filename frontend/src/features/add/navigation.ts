import { useEffect, useRef, useState } from 'react'
import { useIsMutating } from '@tanstack/react-query'
import { useBlocker } from 'react-router'
import { saveMutationKey } from '@/api/expenses'
import { closeTopLayer, hasOpenLayer } from '@/lib/backLayers'

export function useIsSaving(): boolean {
  return useIsMutating({ mutationKey: saveMutationKey }) > 0
}

/**
 * Holds any navigation away from a form with unsaved input (close button, back gesture, links)
 * until the user confirms. While a save is in flight, leaving is refused outright, so a save
 * can't land after the user chose to discard. Call `allowLeave()` before leaving after a save.
 * Back with a sheet or the people list open closes that instead, like back does in native apps.
 */
export function useLeaveGuard(dirty: boolean) {
  const leavingRef = useRef(false)
  const [closingLayer, setClosingLayer] = useState(false)
  const saving = useIsSaving()
  const blocker = useBlocker(({ currentLocation, nextLocation, historyAction }) => {
    if (leavingRef.current) {
      return false
    }
    const layerOpen = historyAction === 'POP' && hasOpenLayer()
    setClosingLayer(layerOpen)
    return layerOpen || ((saving || dirty) && currentLocation.pathname !== nextLocation.pathname)
  })

  useEffect(() => {
    if (blocker.state !== 'blocked') {
      return
    }
    if (closingLayer) {
      closeTopLayer()
      blocker.reset()
    } else if (saving) {
      blocker.reset()
    }
  }, [saving, closingLayer, blocker])

  return {
    blocked: blocker.state === 'blocked' && !saving && !closingLayer,
    discard: () => blocker.proceed?.(),
    keepEditing: () => blocker.reset?.(),
    allowLeave: () => {
      leavingRef.current = true
    },
  }
}
