import { MutationCache, QueryCache, QueryClient } from '@tanstack/react-query'
import { clearSession } from '@/api/auth'
import { ApiError } from '@/api/client'

function isClientError(error: unknown): boolean {
  return error instanceof ApiError && error.status < 500
}

export function createQueryClient(): QueryClient {
  // An expired session surfaces as a 401 from any request; clearing `me` lets RequireAuth
  // send the user to /login instead of leaving them in the shell with failing queries.
  const handleError = (error: unknown) => {
    if (error instanceof ApiError && error.status === 401) {
      clearSession(queryClient)
    }
  }

  const queryClient: QueryClient = new QueryClient({
    queryCache: new QueryCache({ onError: handleError }),
    mutationCache: new MutationCache({ onError: handleError }),
    defaultOptions: {
      queries: {
        retry: (failureCount, error) => !isClientError(error) && failureCount < 1,
        refetchOnWindowFocus: false,
      },
    },
  })

  return queryClient
}
