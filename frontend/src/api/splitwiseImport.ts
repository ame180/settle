import { useMutation, useQueryClient } from '@tanstack/react-query'
import { apiRequest } from './client'
import { invalidateAfterChange } from './ledger'
import type { SplitwiseImportPreview, SplitwiseImportSummary } from './types'

function importPath(userId: number) {
  return `/api/contacts/${userId}/import/splitwise`
}

export function useSplitwiseImportPreview(userId: number) {
  return useMutation({
    mutationFn: (csv: string) =>
      apiRequest<SplitwiseImportPreview>(`${importPath(userId)}?dryRun=1`, {
        method: 'POST',
        body: { csv },
      }),
  })
}

export function useSplitwiseImport(userId: number) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: { csv: string; ownColumn: 0 | 1 }) =>
      apiRequest<SplitwiseImportSummary>(importPath(userId), { method: 'POST', body: input }),
    onSuccess: () => invalidateAfterChange(queryClient),
  })
}
