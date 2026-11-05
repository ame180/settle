import { vi } from 'vitest'
import { viewer } from './activity'
import { jsonResponse } from './utils'

type Route = { status: number; body?: unknown }

/** Answers /api/me as the viewer and every other `METHOD /path` from `routes` (404 otherwise). */
export function stubDetailApi(routes: Record<string, Route>) {
  const fetchMock = vi.fn((input: string, init?: RequestInit) => {
    const key = `${init?.method ?? 'GET'} ${input}`
    if (input === '/api/me') {
      return Promise.resolve(jsonResponse(200, { id: viewer.id, email: viewer.email, name: 'Ame' }))
    }
    const route = routes[key] ?? { status: 404, body: { status: 404, title: 'Not Found' } }
    return Promise.resolve(
      route.status === 204
        ? new Response(null, { status: 204 })
        : jsonResponse(route.status, route.body),
    )
  })
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}
