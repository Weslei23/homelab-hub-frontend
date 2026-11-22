import { describe, expect, it, vi } from 'vitest'
import { mockFetch, response } from '../helpers'

vi.mock('@/data/useAuth', () => ({ getToken: vi.fn(() => 'jwt'), logout: vi.fn() }))

const api = await import('@/data/mediaApi')

describe('rotas', () => {
  it.each([
    ['fetchMediaOverview', () => api.fetchMediaOverview(), '/api/media/overview', 'GET', undefined],
    ['searchMedia', () => api.searchMedia('movie', 'Duna & cia'), '/api/media/search?type=movie&term=Duna%20%26%20cia', 'GET', undefined],
    ['requestMedia filme', () => api.requestMedia('movie', 438631, 'all'), '/api/media/requests', 'POST', { type: 'movie', id: 438631 }],
    [
      'requestMedia serie',
      () => api.requestMedia('series', 366924, 'future'),
      '/api/media/requests',
      'POST',
      { type: 'series', id: 366924, monitor: 'future' },
    ],
  ])('%s', async (_name, call, url, method, body) => {
    const fetch = mockFetch(response(200, {}))

    await call()

    const [calledUrl, options] = fetch.mock.calls[0]
    expect(calledUrl).toBe(url)
    expect(options.method ?? 'GET').toBe(method)
    expect(options.headers.Authorization).toBe('Bearer jwt')
    expect(options.body === undefined ? undefined : JSON.parse(options.body)).toEqual(body)
  })
})

describe('constantes', () => {
  it('atualiza mais rapido com downloads em andamento', () => {
    expect(api.POLL_ACTIVE_MS).toBeLessThan(api.POLL_IDLE_MS)
  })

  it('opcoes de episodios usam os valores do Sonarr', () => {
    expect(api.MONITOR_OPTIONS.map((o) => o.value)).toEqual(['all', 'future', 'firstSeason', 'lastSeason'])
  })
})
