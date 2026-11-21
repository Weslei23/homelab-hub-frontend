import { describe, expect, it, vi } from 'vitest'
import { mockFetch, response } from '../helpers'

vi.mock('@/data/useAuth', () => ({ getToken: vi.fn(() => 'jwt'), logout: vi.fn() }))

const api = await import('@/data/musicApi')
const ID = '37i9dQZF1DXcBWIGoYBM5M'

describe('rotas', () => {
  it.each([
    ['fetchMusicStatus', () => api.fetchMusicStatus(), '/api/music/status', 'GET', undefined],
    ['downloadMusic', () => api.downloadMusic('https://x'), '/api/music/downloads', 'POST', { url: 'https://x' }],
    ['fetchMusicQueue', () => api.fetchMusicQueue(), '/api/music/queue', 'GET', undefined],
    ['clearCompletedQueue', () => api.clearCompletedQueue(), '/api/music/queue/completed', 'DELETE', undefined],
    ['fetchPlaylists', () => api.fetchPlaylists(), '/api/music/playlists', 'GET', undefined],
    ['addPlaylist', () => api.addPlaylist('https://p', 'Mix'), '/api/music/playlists', 'POST', { url: 'https://p', name: 'Mix' }],
    ['addPlaylist sem nome', () => api.addPlaylist('https://p', ''), '/api/music/playlists', 'POST', { url: 'https://p', name: null }],
    ['setPlaylistEnabled', () => api.setPlaylistEnabled(3, false), '/api/music/playlists/3', 'PUT', { enabled: false }],
    ['deletePlaylist', () => api.deletePlaylist(3), '/api/music/playlists/3', 'DELETE', undefined],
    ['syncPlaylist', () => api.syncPlaylist(3), '/api/music/playlists/3/sync', 'POST', undefined],
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

describe('spotifyType', () => {
  it.each([
    [`https://open.spotify.com/track/${ID}`, 'track'],
    [`https://open.spotify.com/album/${ID}`, 'album'],
    [`https://open.spotify.com/playlist/${ID}`, 'playlist'],
    [`https://open.spotify.com/intl-pt/playlist/${ID}?si=abc`, 'playlist'],
    [`  https://open.spotify.com/track/${ID}  `, 'track'],
    [`spotify:album:${ID}`, 'album'],
    [`HTTPS://OPEN.SPOTIFY.COM/TRACK/${ID}`, 'track'],
  ])('%s -> %s', (url, type) => {
    expect(api.spotifyType(url)).toBe(type)
  })

  it.each([
    '',
    null,
    undefined,
    'https://www.youtube.com/watch?v=x',
    `https://open.spotify.com/artist/${ID}`,
    'https://open.spotify.com/playlist/curto',
    `https://open.spotify.com.evil.com/playlist/${ID}`,
    `open.spotify.com/playlist/${ID}`,
  ])('%s nao e aceito', (url) => {
    expect(api.spotifyType(url)).toBeNull()
  })
})
