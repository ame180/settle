import { render } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import {
  createMemoryRouter,
  RouterProvider,
  type InitialEntry,
  type RouteObject,
} from 'react-router'
import { Toaster } from '@/components/ui/toast'

export function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

/** Pass several entries to start with in-app history, the last one being the current page. */
export function renderRoutes(routes: RouteObject[], initialEntry: InitialEntry | InitialEntry[]) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })
  const router = createMemoryRouter(routes, {
    initialEntries: Array.isArray(initialEntry) ? initialEntry : [initialEntry],
  })
  render(
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
      <Toaster />
    </QueryClientProvider>,
  )
  return router
}
