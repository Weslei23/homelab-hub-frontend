import { json, request } from '@/data/catalogApi'

// Filmes e series (Sonarr, Radarr e Jellyfin). As API keys ficam no backend.

/** Intervalo de atualizacao do painel: mais rapido com downloads em andamento. */
export const POLL_ACTIVE_MS = 10000
export const POLL_IDLE_MS = 60000

/**
 * { services: { sonarr, radarr, jellyfin }, queue, upcoming, recent, nowPlaying, errors }
 * Cada servico: { configured, reachable, version, url }.
 */
export const fetchMediaOverview = () => request('/media/overview')

/** type: 'movie' | 'series'. Devolve [{ type, id, title, year, overview, posterUrl, inLibrary }] (somente ADMIN). */
export const searchMedia = (type, term) =>
  request(`/media/search?type=${encodeURIComponent(type)}&term=${encodeURIComponent(term)}`)

/** Adiciona no Radarr/Sonarr e ja comeca a busca. monitor so vale para series. (somente ADMIN) */
export const requestMedia = (type, id, monitor) =>
  request('/media/requests', json('POST', type === 'series' ? { type, id, monitor } : { type, id }))

/** Opcoes de episodios ao pedir uma serie (valores do Sonarr). */
export const MONITOR_OPTIONS = [
  { value: 'all', label: 'Todos os episódios' },
  { value: 'future', label: 'Só os próximos episódios' },
  { value: 'firstSeason', label: 'Primeira temporada' },
  { value: 'lastSeason', label: 'Última temporada' },
]
