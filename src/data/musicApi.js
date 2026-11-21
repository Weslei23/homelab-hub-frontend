import { json, request } from '@/data/catalogApi'

// Downloads de musica pelo Downtify (somente ADMIN). O backend guarda o token do Downtify.

/** Intervalo de atualizacao da fila: mais rapido com downloads em andamento. */
export const POLL_ACTIVE_MS = 3000
export const POLL_IDLE_MS = 15000

/** { configured, reachable, version, syncInterval, url } */
export const fetchMusicStatus = () => request('/music/status')

/** Coloca na fila uma faixa, album ou playlist. Devolve { queued, type }. */
export const downloadMusic = (url) => request('/music/downloads', json('POST', { url }))

/** [{ title, artists, status: 'queued' | 'downloading' | 'done' | 'error', progress, message }] */
export const fetchMusicQueue = () => request('/music/queue')

export const fetchPlaylists = () => request('/music/playlists')
export const addPlaylist = (url, name) => request('/music/playlists', json('POST', { url, name: name || null }))
export const setPlaylistEnabled = (id, enabled) => request(`/music/playlists/${id}`, json('PUT', { enabled }))
export const deletePlaylist = (id) => request(`/music/playlists/${id}`, { method: 'DELETE' })
export const syncPlaylist = (id) => request(`/music/playlists/${id}/sync`, { method: 'POST' })

/** Mesma regra do backend (SpotifyUrl): faixa, album ou playlist. */
const SPOTIFY = /^(https?:\/\/open\.spotify\.com\/(intl-[a-z]{2}(-[a-z]{2})?\/)?(track|album|playlist)\/[A-Za-z0-9]{22}([/?#].*)?|spotify:(track|album|playlist):[A-Za-z0-9]{22})$/i

/** 'track' | 'album' | 'playlist' ou null se nao for um link aceito. */
export function spotifyType(url) {
  const value = (url || '').trim()
  if (!SPOTIFY.test(value)) return null
  return value.match(/(track|album|playlist)/i)[1].toLowerCase()
}
