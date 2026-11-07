import { useEffect, useRef, useState } from 'react'
import { useIsMutating } from '@tanstack/react-query'
import { useBlocker } from 'react-router'
import { saveMutationKey } from '@/api/ledger'
import { toast } from 'sonner'
import { closeTopLayer, hasOpenLayer } from '@/lib/backLayers'
import { useGoBack } from '@/lib/useGoBack'

export function useIsSaving(): boolean {
  return useIsMutating({ mutationKey: saveMutationKey }) > 0
}

/**
 * Holds any navigation away from a form with unsaved input (close button, back gesture, links)
 * until the user confirms. While a save is in flight, leaving is refused outright, so a save
 * can't land after the user chose to discard. `leaveAfterSave` confirms a save and goes back to
 * where the user came from, or `fallback`.
 * Back with a sheet or the people list open closes that instead, like back does in native apps.
 */
export function useLeaveGuard(dirty: boolean, fallback: string) {
  const { goBack } = useGoBack(fallback)
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
    goBack,
    leaveAfterSave: (message: string) => {
      toast.success(message)
      leavingRef.current = true
      goBack()
    },
  }
}

export type LeaveGuard = ReturnType<typeof useLeaveGuard>
