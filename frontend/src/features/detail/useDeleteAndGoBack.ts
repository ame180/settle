import { useState } from 'react'
import { useNavigate } from 'react-router'
import { useQueryClient, type UseMutationResult } from '@tanstack/react-query'
import { toast } from 'sonner'
import { navigateBack } from '@/lib/navigation'
import { detailBackFallback } from './DetailParts'

type Options = {
  mutation: UseMutationResult<void, Error, void>
  detailQueryKey: readonly unknown[]
  successMessage: string
  errorMessage: string
}

/** Confirm sheet state plus the delete: on success, back to where the user came from. */
export function useDeleteAndGoBack({
  mutation,
  detailQueryKey,
  successMessage,
  errorMessage,
}: Options) {
  const [isConfirmOpen, setConfirmOpen] = useState(false)
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const confirm = () =>
    mutation.mutate(undefined, {
      onSuccess: () => {
        setConfirmOpen(false)
        navigateBack(navigate, detailBackFallback)
        queryClient.removeQueries({ queryKey: detailQueryKey, exact: true })
        toast.success(successMessage)
      },
      onError: () => toast.error(errorMessage),
    })

  return { isConfirmOpen, setConfirmOpen, confirm, isPending: mutation.isPending }
}
