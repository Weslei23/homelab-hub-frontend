import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { deferred } from '../helpers'

vi.mock('@/data/musicApi', async (importOriginal) => {
  const real = await importOriginal()
  return {
    // Mantem a validacao de link e os intervalos reais; as chamadas HTTP viram mocks
    spotifyType: real.spotifyType,
    POLL_ACTIVE_MS: real.POLL_ACTIVE_MS,
    POLL_IDLE_MS: real.POLL_IDLE_MS,
    fetchMusicStatus: vi.fn(),
    downloadMusic: vi.fn(),
    fetchMusicQueue: vi.fn(),
    clearCompletedQueue: vi.fn(),
    fetchPlaylists: vi.fn(),
    addPlaylist: vi.fn(),
    setPlaylistEnabled: vi.fn(),
    deletePlaylist: vi.fn(),
    syncPlaylist: vi.fn(),
  }
})

const api = await import('@/data/musicApi')
const { default: MusicPanel } = await import('@/components/MusicPanel.vue')

const ID = '37i9dQZF1DXcBWIGoYBM5M'
const PLAYLIST = `https://open.spotify.com/playlist/${ID}`
const online = { configured: true, reachable: true, version: '3.12.0', syncInterval: '6h' }
const mix = {
  id: 1,
  name: 'Academia',
  url: PLAYLIST,
  enabled: true,
  knownTracks: 42,
  lastSyncAt: '2026-11-20T12:00:00Z',
  lastSyncOk: true,
  lastSyncMessage: 'Nenhuma faixa nova',
}

async function mountPanel() {
  const wrapper = mount(MusicPanel, { attachTo: document.body })
  await flushPromises()
  return wrapper
}

beforeEach(() => {
  vi.useFakeTimers()
  localStorage.clear()
  Object.values(api).forEach((fn) => typeof fn === 'function' && fn.mockReset?.())
  api.fetchMusicStatus.mockResolvedValue(online)
  api.fetchMusicQueue.mockResolvedValue([])
  api.fetchPlaylists.mockResolvedValue([mix])
  api.clearCompletedQueue.mockResolvedValue(null)
})

afterEach(() => {
  vi.useRealTimers()
  document.body.innerHTML = ''
})

describe('visibilidade', () => {
  it('sem DOWNTIFY_URL no backend o painel nao aparece', async () => {
    api.fetchMusicStatus.mockResolvedValue({ configured: false, reachable: false, version: null, syncInterval: '6h' })

    const wrapper = await mountPanel()

    expect(wrapper.find('.music-panel').exists()).toBe(false)
    expect(api.fetchPlaylists).not.toHaveBeenCalled()
  })

  it('erro ao consultar o status esconde o painel', async () => {
    api.fetchMusicStatus.mockRejectedValue(new Error('Voce nao tem permissao para esta acao'))

    expect((await mountPanel()).find('.music-panel').exists()).toBe(false)
  })

  it('mostra a versao quando o Downtify esta online', async () => {
    const chip = (await mountPanel()).find('.chip')

    expect(chip.text()).toBe('Downtify 3.12.0 · online')
    expect(chip.classes()).toContain('online')
  })

  it('avisa quando o Downtify nao responde', async () => {
    api.fetchMusicStatus.mockResolvedValue({ ...online, reachable: false, version: null })

    const chip = (await mountPanel()).find('.chip')
    expect(chip.text()).toBe('Downtify indisponível')
    expect(chip.classes()).toContain('offline')
  })

  it('recolhe e lembra a preferencia', async () => {
    const wrapper = await mountPanel()
    expect(wrapper.find('.panel-body').isVisible()).toBe(true)

    await wrapper.find('.panel-toggle').trigger('click')

    expect(wrapper.find('.panel-body').element.style.display).toBe('none')
    expect(wrapper.find('.panel-toggle').attributes('aria-expanded')).toBe('false')
    expect(localStorage.getItem('homepage.music.open')).toBe('false')
  })

  it('abre recolhido se foi deixado assim', async () => {
    localStorage.setItem('homepage.music.open', 'false')

    const wrapper = await mountPanel()

    expect(wrapper.find('.panel-body').element.style.display).toBe('none')
    expect(api.fetchMusicQueue).not.toHaveBeenCalled()
  })
})

describe('baixar pelo link', () => {
  async function submit(wrapper, url) {
    await wrapper.find('input[aria-label="Link do Spotify"]').setValue(url)
    await wrapper.find('.download-form').trigger('submit')
    await flushPromises()
  }

  it('envia o link e mostra quantas faixas foram para a fila', async () => {
    api.downloadMusic.mockResolvedValue({ queued: 12, type: 'album' })
    const wrapper = await mountPanel()
    api.fetchMusicQueue.mockClear()

    await submit(wrapper, `  https://open.spotify.com/album/${ID}  `)

    expect(api.downloadMusic).toHaveBeenCalledWith(`https://open.spotify.com/album/${ID}`)
    expect(wrapper.find('.feedback').text()).toBe('12 faixa(s) do álbum enviada(s) para a fila')
    expect(wrapper.find('input[aria-label="Link do Spotify"]').element.value).toBe('')
    expect(api.fetchMusicQueue).toHaveBeenCalled()
  })

  it.each([
    [{ queued: 1, type: 'faixa' }, 'Faixa enviada para a fila'],
    [{ queued: 30, type: 'playlist' }, '30 faixa(s) da playlist enviada(s) para a fila'],
  ])('mensagem para %o', async (result, message) => {
    api.downloadMusic.mockResolvedValue(result)
    const wrapper = await mountPanel()

    await submit(wrapper, PLAYLIST)

    expect(wrapper.find('.feedback').text()).toBe(message)
  })

  it('link que nao e do Spotify nem chega ao backend', async () => {
    const wrapper = await mountPanel()

    await submit(wrapper, 'https://www.youtube.com/watch?v=x')

    expect(api.downloadMusic).not.toHaveBeenCalled()
    expect(wrapper.find('.feedback').classes()).toContain('error')
    expect(wrapper.find('.feedback').text()).toContain('Cole um link do Spotify')
  })

  it('mostra o erro do backend e mantem o link', async () => {
    api.downloadMusic.mockRejectedValue(new Error('Downtify indisponivel em http://192.168.3.146:8582'))
    const wrapper = await mountPanel()

    await submit(wrapper, PLAYLIST)

    expect(wrapper.find('.feedback').text()).toBe('Downtify indisponivel em http://192.168.3.146:8582')
    expect(wrapper.find('input[aria-label="Link do Spotify"]').element.value).toBe(PLAYLIST)
  })

  it('desabilita o botao enquanto envia', async () => {
    const pending = deferred()
    api.downloadMusic.mockReturnValue(pending.promise)
    const wrapper = await mountPanel()
    await wrapper.find('input[aria-label="Link do Spotify"]').setValue(PLAYLIST)

    await wrapper.find('.download-form').trigger('submit')

    expect(wrapper.find('.download-form button').text()).toBe('Enviando...')
    expect(wrapper.find('.download-form button').element.disabled).toBe(true)
    pending.resolve({ queued: 1, type: 'faixa' })
    await flushPromises()
    expect(wrapper.find('.download-form button').text()).toBe('Baixar')
  })
})

describe('fila', () => {
  const queue = [
    { title: 'Get Lucky', artists: 'Daft Punk', status: 'downloading', progress: 42.6, message: null },
    { title: 'One More Time', artists: null, status: 'queued', progress: null, message: null },
    { title: 'Aerodynamic', artists: 'Daft Punk', status: 'done', progress: 100, message: null },
    { title: null, artists: null, status: 'error', progress: 10, message: 'Nenhuma fonte encontrada' },
  ]

  it('fila vazia', async () => {
    expect((await mountPanel()).find('.queue').text()).toContain('Nada na fila.')
  })

  it('mostra cada faixa com estado e progresso', async () => {
    api.fetchMusicQueue.mockResolvedValue(queue)
    const items = (await mountPanel()).findAll('.queue-list li')

    expect(items.map((li) => li.find('.state').text())).toEqual(['Baixando', 'Na fila', 'Concluído', 'Erro'])
    expect(items[0].find('.track').text()).toBe('Get Lucky — Daft Punk')
    expect(items[1].find('.track').text()).toBe('One More Time')
    expect(items[3].find('.track').text()).toBe('Faixa sem nome')
    expect(items.map((li) => li.find('[role="progressbar"]').attributes('aria-valuenow'))).toEqual(['43', '0', '100', '10'])
    expect(items[3].find('.error-text').text()).toBe('Nenhuma fonte encontrada')
  })

  it('com downloads em andamento atualiza a cada 3 s', async () => {
    api.fetchMusicQueue.mockResolvedValue(queue)
    await mountPanel()
    expect(api.fetchMusicQueue).toHaveBeenCalledTimes(1)

    await vi.advanceTimersByTimeAsync(api.POLL_ACTIVE_MS)

    expect(api.fetchMusicQueue).toHaveBeenCalledTimes(2)
  })

  it('sem downloads em andamento atualiza a cada 15 s', async () => {
    api.fetchMusicQueue.mockResolvedValue([queue[2]])
    await mountPanel()

    await vi.advanceTimersByTimeAsync(api.POLL_ACTIVE_MS)
    expect(api.fetchMusicQueue).toHaveBeenCalledTimes(1)

    await vi.advanceTimersByTimeAsync(api.POLL_IDLE_MS - api.POLL_ACTIVE_MS)
    expect(api.fetchMusicQueue).toHaveBeenCalledTimes(2)
  })

  it('recolhido para de atualizar; ao abrir atualiza na hora', async () => {
    const wrapper = await mountPanel()
    await wrapper.find('.panel-toggle').trigger('click')

    await vi.advanceTimersByTimeAsync(60_000)
    expect(api.fetchMusicQueue).toHaveBeenCalledTimes(1)

    await wrapper.find('.panel-toggle').trigger('click')
    await flushPromises()
    expect(api.fetchMusicQueue).toHaveBeenCalledTimes(2)
  })

  it('para de atualizar ao sair da tela', async () => {
    const wrapper = await mountPanel()

    wrapper.unmount()
    await vi.advanceTimersByTimeAsync(60_000)

    expect(api.fetchMusicQueue).toHaveBeenCalledTimes(1)
  })

  it('erro ao ler a fila aparece no bloco', async () => {
    api.fetchMusicQueue.mockRejectedValue(new Error('O Downtify recusou o acesso: confira o DOWNTIFY_TOKEN'))

    expect((await mountPanel()).find('.queue .feedback').text()).toBe('O Downtify recusou o acesso: confira o DOWNTIFY_TOKEN')
  })

  it('limpar concluidos so aparece quando ha concluidos ou erros', async () => {
    api.fetchMusicQueue.mockResolvedValue([queue[0]])
    expect((await mountPanel()).find('.queue .link-btn').exists()).toBe(false)

    api.fetchMusicQueue.mockResolvedValue(queue)
    const wrapper = await mountPanel()
    api.fetchMusicQueue.mockResolvedValue([queue[0]])
    await wrapper.find('.queue .link-btn').trigger('click')
    await flushPromises()

    expect(api.clearCompletedQueue).toHaveBeenCalledOnce()
    expect(wrapper.findAll('.queue-list li')).toHaveLength(1)
  })
})

describe('playlists', () => {
  it('lista as playlists com o resultado da ultima sincronizacao', async () => {
    const wrapper = await mountPanel()

    const item = wrapper.find('.playlist-list li')
    expect(item.find('a').text()).toBe('Academia')
    expect(item.find('a').attributes('href')).toBe(PLAYLIST)
    expect(item.find('small').text()).toContain('42 faixa(s)')
    expect(item.find('small').text()).toContain('Nenhuma faixa nova')
    expect(item.find('input[type="checkbox"]').element.checked).toBe(true)
    expect(wrapper.find('.playlists .block-title').text()).toContain('conferidas a cada 6h')
  })

  it('playlist nunca sincronizada', async () => {
    api.fetchPlaylists.mockResolvedValue([{ ...mix, lastSyncAt: null, lastSyncOk: null, lastSyncMessage: null }])

    expect((await mountPanel()).find('.playlist-list small').text()).toContain('ainda não sincronizada')
  })

  it('ultima sincronizacao com erro fica destacada', async () => {
    api.fetchPlaylists.mockResolvedValue([{ ...mix, lastSyncOk: false, lastSyncMessage: 'Downtify indisponivel' }])

    expect((await mountPanel()).find('.playlist-list li').classes()).toContain('failed')
  })

  it('sem playlists explica o recurso', async () => {
    api.fetchPlaylists.mockResolvedValue([])

    expect((await mountPanel()).find('.playlists').text()).toContain('Nenhuma playlist acompanhada')
  })

  it('acompanhar nova playlist', async () => {
    api.addPlaylist.mockResolvedValue({ ...mix, id: 2, name: 'Rock', lastSyncMessage: '30 faixa(s) nova(s) enviada(s) ao Downtify' })
    const wrapper = await mountPanel()
    api.fetchPlaylists.mockResolvedValue([mix, { ...mix, id: 2, name: 'Rock' }])

    await wrapper.find('input[aria-label="Link da playlist"]').setValue(PLAYLIST)
    await wrapper.find('input[aria-label="Nome da playlist"]').setValue('  Rock ')
    await wrapper.find('.playlist-form').trigger('submit')
    await flushPromises()

    expect(api.addPlaylist).toHaveBeenCalledWith(PLAYLIST, 'Rock')
    expect(wrapper.find('.playlists .feedback').text()).toBe('"Rock": 30 faixa(s) nova(s) enviada(s) ao Downtify')
    expect(wrapper.findAll('.playlist-list li')).toHaveLength(2)
    expect(wrapper.find('input[aria-label="Link da playlist"]').element.value).toBe('')
  })

  it('primeira sincronizacao com erro aparece como erro', async () => {
    api.addPlaylist.mockResolvedValue({ ...mix, lastSyncOk: false, lastSyncMessage: 'Downtify indisponivel' })
    const wrapper = await mountPanel()

    await wrapper.find('input[aria-label="Link da playlist"]').setValue(PLAYLIST)
    await wrapper.find('.playlist-form').trigger('submit')
    await flushPromises()

    expect(wrapper.find('.playlists .feedback').classes()).toContain('error')
  })

  it('so aceita link de playlist', async () => {
    const wrapper = await mountPanel()

    await wrapper.find('input[aria-label="Link da playlist"]').setValue(`https://open.spotify.com/album/${ID}`)
    await wrapper.find('.playlist-form').trigger('submit')

    expect(api.addPlaylist).not.toHaveBeenCalled()
    expect(wrapper.find('.playlists .feedback').text()).toContain('link de uma playlist')
  })

  it('playlist repetida mostra o erro do backend', async () => {
    api.addPlaylist.mockRejectedValue(new Error('Essa playlist ja esta cadastrada'))
    const wrapper = await mountPanel()

    await wrapper.find('input[aria-label="Link da playlist"]').setValue(PLAYLIST)
    await wrapper.find('.playlist-form').trigger('submit')
    await flushPromises()

    expect(wrapper.find('.playlists .feedback').text()).toBe('Essa playlist ja esta cadastrada')
  })

  it('liga e desliga a sincronizacao automatica', async () => {
    api.setPlaylistEnabled.mockResolvedValue({ ...mix, enabled: false })
    const wrapper = await mountPanel()

    await wrapper.find('.playlist-list input[type="checkbox"]').trigger('change')
    await flushPromises()

    expect(api.setPlaylistEnabled).toHaveBeenCalledWith(1, false)
    expect(wrapper.find('.playlist-list input[type="checkbox"]').element.checked).toBe(false)
  })

  it('sincronizar agora', async () => {
    const pending = deferred()
    api.syncPlaylist.mockReturnValue(pending.promise)
    const wrapper = await mountPanel()
    const button = () => wrapper.findAll('.playlist-list button')[0]

    await button().trigger('click')
    expect(button().text()).toBe('Sincronizando...')
    expect(button().element.disabled).toBe(true)

    pending.resolve({ ...mix, knownTracks: 45, lastSyncMessage: '3 faixa(s) nova(s) enviada(s) ao Downtify' })
    await flushPromises()

    expect(api.syncPlaylist).toHaveBeenCalledWith(1)
    expect(button().text()).toBe('Sincronizar')
    expect(wrapper.find('.playlist-list small').text()).toContain('45 faixa(s)')
    expect(wrapper.find('.playlists .feedback').text()).toBe('"Academia": 3 faixa(s) nova(s) enviada(s) ao Downtify')
  })

  it('sincronizacao em andamento no backend vira mensagem', async () => {
    api.syncPlaylist.mockRejectedValue(new Error('Ja existe uma sincronizacao em andamento; tente de novo em instantes'))
    const wrapper = await mountPanel()

    await wrapper.findAll('.playlist-list button')[0].trigger('click')
    await flushPromises()

    expect(wrapper.find('.playlists .feedback').text()).toContain('sincronizacao em andamento')
    expect(wrapper.findAll('.playlist-list button')[0].element.disabled).toBe(false)
  })

  it('remover pede confirmacao', async () => {
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(true)
    api.deletePlaylist.mockResolvedValue(null)
    const wrapper = await mountPanel()

    await wrapper.find('[aria-label="Remover Academia"]').trigger('click')
    await flushPromises()

    expect(confirm).toHaveBeenCalledWith('Parar de acompanhar "Academia"? As músicas já baixadas continuam no Downtify.')
    expect(api.deletePlaylist).toHaveBeenCalledWith(1)
    expect(wrapper.findAll('.playlist-list li')).toHaveLength(0)
  })

  it('cancelar a confirmacao nao remove', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(false)
    const wrapper = await mountPanel()

    await wrapper.find('[aria-label="Remover Academia"]').trigger('click')

    expect(api.deletePlaylist).not.toHaveBeenCalled()
  })
})
