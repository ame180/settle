import type { ApiProblem, ApiViolation } from './types'

export class ApiError extends Error {
  readonly status: number
  readonly detail: string | undefined
  readonly violations: ApiViolation[]

  constructor(status: number, problem: Partial<ApiProblem>) {
    super(problem.detail ?? problem.title ?? `Request failed with status ${status}`)
    this.name = 'ApiError'
    this.status = status
    this.detail = problem.detail
    this.violations = problem.violations ?? []
  }
}

type RequestOptions = {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'
  body?: unknown
  signal?: AbortSignal
}

export async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const headers: Record<string, string> = { Accept: 'application/json' }
  if (options.body !== undefined) {
    headers['Content-Type'] = 'application/json'
  }

  const response = await fetch(path, {
    method: options.method ?? 'GET',
    headers,
    credentials: 'same-origin',
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
    signal: options.signal,
  })

  if (response.status === 204) {
    return undefined as T
  }

  const text = await response.text()

  if (!response.ok) {
    throw new ApiError(response.status, parseProblem(text))
  }

  return (text === '' ? undefined : JSON.parse(text)) as T
}

// Errors from outside Symfony (e.g. an nginx 502 page) aren't JSON; keep the status anyway.
function parseProblem(text: string): Partial<ApiProblem> {
  try {
    return (JSON.parse(text) as Partial<ApiProblem> | null) ?? {}
  } catch {
    return {}
  }
}
