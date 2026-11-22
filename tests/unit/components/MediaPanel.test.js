import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'

vi.mock('@/data/mediaApi', async (importOriginal) => {
  const real = await importOriginal()
  return { POLL_ACTIVE_MS: real.POLL_ACTIVE_MS, POLL_IDLE_MS: real.POLL_IDLE_MS, fetchMediaOverview: vi.fn() }
})
// A busca tem testes proprios (MediaRequest.test.js); aqui so importa quando e como ela aparece
vi.mock('@/components/MediaRequest.vue', () => ({
  default: {
    name: 'MediaRequest',
    props: ['available'],
    emits: ['requested'],
    template: '<button class="request-stub" :data-available="JSON.stringify(available)" @click="$emit(\'requested\')" />',
  },
}))

const api = await import('@/data/mediaApi')
const { default: MediaPanel } = await import('@/components/MediaPanel.vue')
const { POLL_ACTIVE_MS, POLL_IDLE_MS } = api

const NOW = new Date('2026-11-22T15:00:00')
const up = (version, url) => ({ configured: true, reachable: true, version, url })
const off = (url) => ({ configured: true, reachable: false, version: null, url })
const none = { configured: false, reachable: false, version: null, url: null }

function overview(changes = {}) {
  return {
    services: {
      sonarr: up('4.0.20', 'http://nas:8989'),
      radarr: up('7.0.3', 'http://nas:7878'),
      jellyfin: up('10.11.10', 'http://nas:8097'),
    },
    queue: [],
    upcoming: [],
    recent: [],
    nowPlaying: [],
    errors: [],
    ...changes,
  }
}

async function mountPanel(admin = true, tab = null) {
  const wrapper = mount(MediaPanel, { props: { admin }, attachTo: document.body })
  await flushPromises()
  if (tab) await wrapper.find(`.tab[data-tab="${tab}"]`).trigger('click')
  return wrapper
}

const tabKeys = (wrapper) => wrapper.findAll('.tab').map((t) => t.attributes('data-tab'))

beforeEach(() => {
  vi.useFakeTimers()
  vi.setSystemTime(NOW)
  localStorage.clear()
  api.fetchMediaOverview.mockReset()
  api.fetchMediaOverview.mockResolvedValue(overview())
})

afterEach(() => {
  vi.useRealTimers()
  document.body.innerHTML = ''
})

describe('visibilidade', () => {
  it('sem nenhum servico configurado o painel nao aparece nem atualiza', async () => {
    api.fetchMediaOverview.mockResolvedValue(overview({ services: { sonarr: none, radarr: none, jellyfin: none } }))

    const wrapper = await mountPanel()
    vi.advanceTimersByTime(POLL_IDLE_MS * 2)

    expect(wrapper.find('.media-panel').exists()).toBe(false)
    expect(api.fetchMediaOverview).toHaveBeenCalledTimes(1)
  })

  it('erro na primeira consulta esconde o painel', async () => {
    api.fetchMediaOverview.mockRejectedValue(new Error('Erro ao comunicar com o servidor'))

    expect((await mountPanel()).find('.media-panel').exists()).toBe(false)
  })

  it('mostra um selo por servico configurado', async () => {
    api.fetchMediaOverview.mockResolvedValue(
      overview({ services: { sonarr: up('4.0.20', 'u'), radarr: off('http://nas:7878'), jellyfin: none } })
    )

    const chips = (await mountPanel()).findAll('.chip')

    expect(chips.map((c) => c.text())).toEqual(['Sonarr 4.0.20', 'Radarr offline'])
    expect(chips[0].classes()).toContain('online')
    expect(chips[1].classes()).toContain('offline')
  })

  it('lista os avisos do backend', async () => {
    api.fetchMediaOverview.mockResolvedValue(overview({ errors: ['O Radarr recusou o acesso: confira o RADARR_API_KEY'] }))

    expect((await mountPanel()).find('.notice.warning').text()).toBe('O Radarr recusou o acesso: confira o RADARR_API_KEY')
  })

  it('lembra se o painel estava recolhido', async () => {
    localStorage.setItem('homepage.media.open', 'false')

    const wrapper = await mountPanel()

    expect(wrapper.find('.panel-toggle').attributes('aria-expanded')).toBe('false')
    expect(wrapper.find('.panel-body').isVisible()).toBe(false)
  })
})

describe('abas', () => {
  it('admin ve todas as abas e comeca em Downloads', async () => {
    const wrapper = await mountPanel()

    expect(tabKeys(wrapper)).toEqual(['queue', 'upcoming', 'playing', 'recent', 'request'])
    expect(wrapper.find('.tab.active').attributes('data-tab')).toBe('queue')
    expect(wrapper.findAll('.tab-body > *').length).toBeGreaterThan(0)
  })

  it('mostra uma secao por vez', async () => {
    const wrapper = await mountPanel(true, 'playing')

    expect(wrapper.text()).toContain('Ninguém assistindo.')
    expect(wrapper.text()).not.toContain('Nenhum download em andamento.')
    expect(wrapper.find('.tab[data-tab="playing"]').attributes('aria-selected')).toBe('true')
  })

  it('lembra a ultima aba aberta', async () => {
    await mountPanel(true, 'upcoming')
    document.body.innerHTML = ''

    const wrapper = await mountPanel()

    expect(localStorage.getItem('homepage.media.tab')).toBe('upcoming')
    expect(wrapper.find('.tab.active').attributes('data-tab')).toBe('upcoming')
  })

  it('aba lembrada que sumiu volta para a primeira disponivel', async () => {
    localStorage.setItem('homepage.media.tab', 'request')

    const wrapper = await mountPanel(false)

    expect(wrapper.find('.tab.active').attributes('data-tab')).toBe('queue')
  })

  it('contadores nas abas e resumo no cabecalho', async () => {
    const item = { kind: 'movie', title: 'X', detail: null, state: 'downloading', progress: 1, timeLeft: null, message: null }
    api.fetchMediaOverview.mockResolvedValue(
      overview({
        queue: [item, item],
        nowPlaying: [{ user: 'ana', title: 'Y', detail: null, device: null, progress: 1, paused: false, imageUrl: null }],
      })
    )

    const wrapper = await mountPanel()

    expect(wrapper.find('.tab[data-tab="queue"] .count').text()).toBe('2')
    expect(wrapper.find('.tab[data-tab="playing"] .count').text()).toBe('1')
    expect(wrapper.find('.tab[data-tab="upcoming"] .count').exists()).toBe(false)
    expect(wrapper.find('.summary').text()).toBe('2 baixando · 1 assistindo')
  })

  it('sem nada acontecendo nao ha resumo', async () => {
    expect((await mountPanel()).find('.summary').exists()).toBe(false)
  })

  it('link do Jellyfin aparece nas abas dele', async () => {
    const wrapper = await mountPanel(true, 'recent')

    expect(wrapper.findAll('.tab-links a').map((a) => a.text())).toEqual(['Jellyfin ↗'])
  })
})

describe('pedidos', () => {
  it('admin ve a busca com os tipos disponiveis', async () => {
    api.fetchMediaOverview.mockResolvedValue(
      overview({ services: { sonarr: off('u'), radarr: up('7', 'u'), jellyfin: none } })
    )

    const stub = (await mountPanel(true, 'request')).find('.request-stub')

    expect(JSON.parse(stub.attributes('data-available'))).toEqual({ movie: true, series: false })
  })

  it('usuario comum nao tem a aba de pedidos', async () => {
    expect(tabKeys(await mountPanel(false))).not.toContain('request')
  })

  it('sem Sonarr e Radarr online nao ha busca', async () => {
    api.fetchMediaOverview.mockResolvedValue(
      overview({ services: { sonarr: off('u'), radarr: none, jellyfin: up('10', 'u') } })
    )

    expect(tabKeys(await mountPanel())).not.toContain('request')
  })

  it('depois de um pedido o painel atualiza', async () => {
    const wrapper = await mountPanel(true, 'request')

    await wrapper.find('.request-stub').trigger('click')
    await flushPromises()

    expect(api.fetchMediaOverview).toHaveBeenCalledTimes(2)
  })
})

describe('downloads', () => {
  it('mostra titulo, estado, progresso e tempo restante', async () => {
    api.fetchMediaOverview.mockResolvedValue(
      overview({
        queue: [
          { kind: 'episode', title: 'Reacher', detail: 'S03E05 · Piloto', state: 'downloading', progress: 42.5, timeLeft: '01:05:00', message: null },
          { kind: 'movie', title: 'Duna', detail: '2021', state: 'warning', progress: 100, timeLeft: null, message: 'Sem arquivo de video' },
        ],
      })
    )

    const items = (await mountPanel()).findAll('.queue li')

    expect(items[0].text()).toContain('📺 Reacher — S03E05 · Piloto')
    expect(items[0].find('.state').text()).toBe('Baixando')
    expect(items[0].find('.bar span').attributes('style')).toContain('width: 42.5%')
    expect(items[0].find('.meta').text()).toBe('43% · faltam 1 h 5 min')
    expect(items[1].classes()).toContain('warning')
    expect(items[1].find('.state').text()).toBe('Atenção')
    expect(items[1].find('.warning-text').text()).toBe('Sem arquivo de video')
  })

  it.each([
    ['00:12:34', '12 min'],
    ['00:00:40', 'menos de 1 min'],
    ['03:00:00', '3 h'],
    ['1.02:30:00', '26 h 30 min'],
    ['estranho', 'estranho'],
  ])('tempo restante %s -> %s', async (timeLeft, text) => {
    api.fetchMediaOverview.mockResolvedValue(
      overview({ queue: [{ kind: 'movie', title: 'X', detail: null, state: 'downloading', progress: 1, timeLeft, message: null }] })
    )

    expect((await mountPanel()).find('.queue .meta').text()).toBe(`1% · faltam ${text}`)
  })

  it('sem downloads', async () => {
    expect((await mountPanel()).text()).toContain('Nenhum download em andamento.')
  })

  it('links para a fila do Sonarr e do Radarr', async () => {
    const links = (await mountPanel()).findAll('.link-btn').map((a) => a.attributes('href'))

    expect(links).toContain('http://nas:8989/activity/queue')
    expect(links).toContain('http://nas:7878/activity/queue')
  })

  it('sem Sonarr e Radarr as abas deles somem', async () => {
    api.fetchMediaOverview.mockResolvedValue(overview({ services: { sonarr: none, radarr: none, jellyfin: up('10', 'u') } }))

    expect(tabKeys(await mountPanel())).toEqual(['playing', 'recent'])
  })
})

describe('jellyfin', () => {
  it('quem esta assistindo', async () => {
    api.fetchMediaOverview.mockResolvedValue(
      overview({
        nowPlaying: [{ user: 'ana', title: 'Lupin', detail: 'S01E01', device: 'Jellyfin Web · Chrome', progress: 30, paused: true, imageUrl: 'i.jpg' }],
      })
    )

    const item = (await mountPanel(true, 'playing')).find('.playing')

    expect(item.text()).toContain('⏸ Lupin — S01E01')
    expect(item.text()).toContain('ana · Jellyfin Web · Chrome')
    expect(item.find('img').attributes('src')).toBe('i.jpg')
  })

  it('ninguem assistindo', async () => {
    expect((await mountPanel(true, 'playing')).text()).toContain('Ninguém assistindo.')
  })

  it('adicionados recentemente com link para o Jellyfin', async () => {
    api.fetchMediaOverview.mockResolvedValue(
      overview({
        recent: [{ id: '1', kind: 'movie', title: 'Duna', detail: '2021', imageUrl: 'd.jpg', link: 'http://nas:8097/web/#/details?id=1', addedAt: null }],
      })
    )

    const poster = (await mountPanel(true, 'recent')).find('.posters a')

    expect(poster.attributes('href')).toBe('http://nas:8097/web/#/details?id=1')
    expect(poster.attributes('title')).toBe('Duna — 2021')
    expect(poster.find('img').attributes('alt')).toBe('Duna')
  })

  it('sem itens recentes', async () => {
    expect((await mountPanel(true, 'recent')).text()).toContain('Nada adicionado ainda.')
  })
})

describe('proximos lancamentos', () => {
  it('datas relativas e marca do que ja foi baixado', async () => {
    api.fetchMediaOverview.mockResolvedValue(
      overview({
        upcoming: [
          { kind: 'episode', title: 'Reacher', detail: 'S03E06', date: new Date('2026-11-22T21:00:00').toISOString(), hasFile: true },
          { kind: 'movie', title: 'Duna 3 (2026)', detail: 'Lançamento digital', date: new Date('2026-11-23T00:00:00').toISOString(), hasFile: false },
          { kind: 'episode', title: 'Lupin', detail: 'S04E01', date: new Date('2026-11-28T02:00:00').toISOString(), hasFile: false },
        ],
      })
    )

    const items = (await mountPanel(true, 'upcoming')).findAll('.upcoming li')

    expect(items[0].find('.when').text()).toBe('Hoje 21:00')
    expect(items[0].find('.badge').exists()).toBe(true)
    expect(items[1].find('.when').text()).toBe('Amanhã')
    expect(items[1].text()).toContain('🎬 Duna 3 (2026) — Lançamento digital')
    expect(items[2].find('.when').text()).toMatch(/^sáb\.?, 28\/11 02:00$/)
    expect(items[2].find('.badge').exists()).toBe(false)
  })

  it('nada previsto', async () => {
    expect((await mountPanel(true, 'upcoming')).text()).toContain('Nada previsto para os próximos 14 dias.')
  })
})

describe('atualizacao automatica', () => {
  const downloading = { kind: 'movie', title: 'X', detail: null, state: 'downloading', progress: 10, timeLeft: null, message: null }

  it('sem downloads atualiza no intervalo longo', async () => {
    await mountPanel()

    vi.advanceTimersByTime(POLL_ACTIVE_MS)
    expect(api.fetchMediaOverview).toHaveBeenCalledTimes(1)
    vi.advanceTimersByTime(POLL_IDLE_MS - POLL_ACTIVE_MS)
    expect(api.fetchMediaOverview).toHaveBeenCalledTimes(2)
  })

  it('com downloads atualiza mais rapido', async () => {
    api.fetchMediaOverview.mockResolvedValue(overview({ queue: [downloading] }))
    await mountPanel()

    vi.advanceTimersByTime(POLL_ACTIVE_MS)

    expect(api.fetchMediaOverview).toHaveBeenCalledTimes(2)
  })

  it('download pausado nao conta como ativo', async () => {
    api.fetchMediaOverview.mockResolvedValue(overview({ queue: [{ ...downloading, state: 'paused' }] }))
    await mountPanel()

    vi.advanceTimersByTime(POLL_ACTIVE_MS)

    expect(api.fetchMediaOverview).toHaveBeenCalledTimes(1)
  })

  it('recolhido para de atualizar; ao abrir atualiza na hora', async () => {
    const wrapper = await mountPanel()

    await wrapper.find('.panel-toggle').trigger('click')
    vi.advanceTimersByTime(POLL_IDLE_MS * 3)
    expect(api.fetchMediaOverview).toHaveBeenCalledTimes(1)
    expect(localStorage.getItem('homepage.media.open')).toBe('false')

    await wrapper.find('.panel-toggle').trigger('click')
    await flushPromises()
    expect(api.fetchMediaOverview).toHaveBeenCalledTimes(2)
  })

  it('erro numa atualizacao mantem os dados e mostra o motivo', async () => {
    api.fetchMediaOverview.mockResolvedValueOnce(overview({ queue: [downloading] }))
    api.fetchMediaOverview.mockRejectedValueOnce(new Error('Erro ao comunicar com o servidor'))
    const wrapper = await mountPanel()

    vi.advanceTimersByTime(POLL_ACTIVE_MS)
    await flushPromises()

    expect(wrapper.find('.notice.error').text()).toBe('Erro ao comunicar com o servidor')
    expect(wrapper.findAll('.queue li')).toHaveLength(1)
  })

  it('para de atualizar ao sair da tela', async () => {
    const wrapper = await mountPanel()

    wrapper.unmount()
    vi.advanceTimersByTime(POLL_IDLE_MS * 2)

    expect(api.fetchMediaOverview).toHaveBeenCalledTimes(1)
  })
})
