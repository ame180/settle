import { useRef, useState } from 'react'
import type { UseMutationResult } from '@tanstack/react-query'
import { toast } from 'sonner'
import { useGoBack } from '@/lib/useGoBack'
import { detailBackFallback } from './DetailParts'

type Options = {
  mutation: UseMutationResult<void, Error, void>
  successMessage: string
  errorMessage: string
}

/** Confirm sheet state plus the delete: on success, back to where the user came from. */
export function useDeleteAndGoBack({ mutation, successMessage, errorMessage }: Options) {
  const [isConfirmOpen, setConfirmOpen] = useState(false)
  const { goBack } = useGoBack(detailBackFallback)
  const isSending = useRef(false)

  const leave = () => {
    setConfirmOpen(false)
    goBack()
    toast.success(successMessage)
  }

  const confirm = () => {
    // The button disables a render later; a quick second tap must not send a second DELETE.
    if (isSending.current) {
      return
    }
    isSending.current = true
    mutation.mutate(undefined, {
      onSuccess: leave,
      onError: () => toast.error(errorMessage),
      onSettled: () => {
        isSending.current = false
      },
    })
  }

  return { isConfirmOpen, setConfirmOpen, confirm, isPending: mutation.isPending }
}
