import { afterEach, describe, expect, it, vi } from 'vitest'
import { ApiError, apiRequest } from './client'

function mockFetch(status: number, body: unknown) {
  const response = new Response(body === undefined ? null : JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
  const fetchMock = vi.fn().mockResolvedValue(response)
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('apiRequest', () => {
  it('sends JSON bodies with credentials and parses the response', async () => {
    const fetchMock = mockFetch(200, { id: 1, email: 'a@b.c' })

    const result = await apiRequest<{ id: number }>('/api/login', {
      method: 'POST',
      body: { email: 'a@b.c', password: 'x' },
    })

    expect(result).toEqual({ id: 1, email: 'a@b.c' })
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit]
    expect(url).toBe('/api/login')
    expect(init.method).toBe('POST')
    expect(init.credentials).toBe('same-origin')
    expect(init.body).toBe(JSON.stringify({ email: 'a@b.c', password: 'x' }))
    expect((init.headers as Record<string, string>)['Content-Type']).toBe('application/json')
  })

  it('returns undefined for 204 responses', async () => {
    mockFetch(204, undefined)

    await expect(apiRequest<void>('/api/logout', { method: 'POST' })).resolves.toBeUndefined()
  })

  it('throws ApiError with status and violations on failure', async () => {
    mockFetch(422, {
      status: 422,
      title: 'Validation Failed',
      violations: [{ propertyPath: 'email', title: 'Invalid' }],
    })

    const error = await apiRequest('/api/x').catch((e: unknown) => e)

    expect(error).toBeInstanceOf(ApiError)
    expect((error as ApiError).status).toBe(422)
    expect((error as ApiError).violations).toHaveLength(1)
    expect((error as ApiError).message).toBe('Validation Failed')
  })

  it('prefers the json_login error message', async () => {
    mockFetch(401, { error: 'Invalid credentials.' })

    const error = await apiRequest('/api/login', { method: 'POST', body: {} }).catch(
      (e: unknown) => e,
    )

    expect((error as ApiError).message).toBe('Invalid credentials.')
  })
})
