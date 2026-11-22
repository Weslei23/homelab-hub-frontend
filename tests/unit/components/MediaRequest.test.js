import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { deferred } from '../helpers'

vi.mock('@/data/mediaApi', async (importOriginal) => {
  const real = await importOriginal()
  return { MONITOR_OPTIONS: real.MONITOR_OPTIONS, searchMedia: vi.fn(), requestMedia: vi.fn() }
})

const api = await import('@/data/mediaApi')
const { default: MediaRequest } = await import('@/components/MediaRequest.vue')

const duna = { type: 'movie', id: 438631, title: 'Duna', year: 2021, overview: 'Paul Atreides...', posterUrl: 'p.jpg', inLibrary: false }
const matrix = { type: 'movie', id: 603, title: 'Matrix', year: 1999, overview: null, posterUrl: null, inLibrary: true }
const reacher = { type: 'series', id: 366924, title: 'Reacher', year: 2022, overview: null, posterUrl: null, inLibrary: false }

function mountRequest(available = { movie: true, series: true }) {
  return mount(MediaRequest, { props: { available }, attachTo: document.body })
}

async function search(wrapper, term) {
  await wrapper.find('input[type="search"]').setValue(term)
  await wrapper.find('form').trigger('submit')
  await flushPromises()
}

beforeEach(() => {
  api.searchMedia.mockReset()
  api.requestMedia.mockReset()
  api.searchMedia.mockResolvedValue([duna, matrix])
})

afterEach(() => {
  document.body.innerHTML = ''
})

describe('tipo', () => {
  it('comeca em filme', () => {
    const wrapper = mountRequest()

    expect(wrapper.find('input[value="movie"]').element.checked).toBe(true)
    expect(wrapper.find('input[type="search"]').attributes('placeholder')).toBe('Nome do filme')
    expect(wrapper.find('select').exists()).toBe(false)
  })

  it('sem Radarr comeca em serie e desativa filme', () => {
    const wrapper = mountRequest({ movie: false, series: true })

    expect(wrapper.find('input[value="series"]').element.checked).toBe(true)
    expect(wrapper.find('input[value="movie"]').attributes('disabled')).toBeDefined()
  })

  it('serie mostra a escolha de episodios', async () => {
    const wrapper = mountRequest()

    await wrapper.find('input[value="series"]').setValue()

    expect(wrapper.find('input[type="search"]').attributes('placeholder')).toBe('Nome da série')
    expect(wrapper.findAll('select option').map((o) => o.text())).toContain('Só os próximos episódios')
  })

  it('trocar o tipo limpa os resultados', async () => {
    const wrapper = mountRequest()
    await search(wrapper, 'Duna')

    await wrapper.find('input[value="series"]').setValue()

    expect(wrapper.findAll('.results li')).toHaveLength(0)
  })
})

describe('busca', () => {
  it('termo curto nao chama o backend', async () => {
    const wrapper = mountRequest()

    await search(wrapper, ' a ')

    expect(api.searchMedia).not.toHaveBeenCalled()
    expect(wrapper.find('.feedback').text()).toBe('Digite pelo menos 2 letras para buscar')
  })

  it('lista os resultados com capa e situacao', async () => {
    const wrapper = mountRequest()

    await search(wrapper, '  Duna ')

    expect(api.searchMedia).toHaveBeenCalledWith('movie', 'Duna')
    const items = wrapper.findAll('.results li')
    expect(items).toHaveLength(2)
    expect(items[0].text()).toContain('Duna (2021)')
    expect(items[0].find('img').attributes('src')).toBe('p.jpg')
    expect(items[0].find('button').text()).toBe('Baixar')
    expect(items[1].find('.poster.empty').exists()).toBe(true)
    expect(items[1].find('button').text()).toBe('✓ Na biblioteca')
    expect(items[1].find('button').attributes('disabled')).toBeDefined()
  })

  it('mostra "Buscando..." enquanto espera', async () => {
    const pending = deferred()
    api.searchMedia.mockReturnValue(pending.promise)
    const wrapper = mountRequest()

    await wrapper.find('input[type="search"]').setValue('Duna')
    await wrapper.find('form').trigger('submit')

    expect(wrapper.find('button[type="submit"]').text()).toBe('Buscando...')
    pending.resolve([])
    await flushPromises()
    expect(wrapper.find('button[type="submit"]').text()).toBe('Buscar')
  })

  it('sem resultados', async () => {
    api.searchMedia.mockResolvedValue([])
    const wrapper = mountRequest()

    await search(wrapper, 'xyzxyz')

    expect(wrapper.find('.muted').text()).toBe('Nada encontrado para "xyzxyz".')
  })

  it('erro do backend', async () => {
    api.searchMedia.mockRejectedValue(new Error('Radarr indisponivel em http://nas:7878'))
    const wrapper = mountRequest()

    await search(wrapper, 'Duna')

    expect(wrapper.find('.feedback.error').text()).toBe('Radarr indisponivel em http://nas:7878')
  })
})

describe('pedido', () => {
  it('filme: pede, marca como na biblioteca e avisa o painel', async () => {
    api.requestMedia.mockResolvedValue({ type: 'movie', title: 'Duna', message: 'Radarr adicionou "Duna" e ja esta procurando' })
    const wrapper = mountRequest()
    await search(wrapper, 'Duna')

    await wrapper.find('button[aria-label="Baixar Duna"]').trigger('click')
    await flushPromises()

    expect(api.requestMedia).toHaveBeenCalledWith('movie', 438631, 'all')
    expect(wrapper.find('.feedback').text()).toBe('Radarr adicionou "Duna" e ja esta procurando')
    expect(wrapper.findAll('.results li')[0].find('button').text()).toBe('✓ Na biblioteca')
    expect(wrapper.emitted('requested')).toHaveLength(1)
  })

  it('serie envia a opcao de episodios escolhida', async () => {
    api.searchMedia.mockResolvedValue([reacher])
    api.requestMedia.mockResolvedValue({ message: 'ok' })
    const wrapper = mountRequest()
    await wrapper.find('input[value="series"]').setValue()
    await wrapper.find('select').setValue('future')
    await search(wrapper, 'Reacher')

    await wrapper.find('button[aria-label="Baixar Reacher"]').trigger('click')
    await flushPromises()

    expect(api.searchMedia).toHaveBeenCalledWith('series', 'Reacher')
    expect(api.requestMedia).toHaveBeenCalledWith('series', 366924, 'future')
  })

  it('mostra "Pedindo..." enquanto espera', async () => {
    const pending = deferred()
    api.requestMedia.mockReturnValue(pending.promise)
    const wrapper = mountRequest()
    await search(wrapper, 'Duna')

    await wrapper.find('button[aria-label="Baixar Duna"]').trigger('click')

    const button = wrapper.find('button[aria-label="Baixar Duna"]')
    expect(button.text()).toBe('Pedindo...')
    expect(button.attributes('disabled')).toBeDefined()
    pending.resolve({ message: 'ok' })
    await flushPromises()
  })

  it('erro mantem o botao para tentar de novo', async () => {
    api.requestMedia.mockRejectedValue(new Error('"Duna" ja esta na biblioteca do Radarr'))
    const wrapper = mountRequest()
    await search(wrapper, 'Duna')

    await wrapper.find('button[aria-label="Baixar Duna"]').trigger('click')
    await flushPromises()

    expect(wrapper.find('.feedback.error').text()).toBe('"Duna" ja esta na biblioteca do Radarr')
    expect(wrapper.find('button[aria-label="Baixar Duna"]').text()).toBe('Baixar')
    expect(wrapper.emitted('requested')).toBeUndefined()
  })
})
