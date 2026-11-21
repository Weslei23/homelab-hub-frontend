import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import ServiceCard from '@/components/ServiceCard.vue'
import { iconMap } from '@/data/icons'

const service = { id: 1, name: 'jellyfin', url: 'http://192.168.3.183:8096', description: 'Filmes e séries', icon: 'jellyfin' }
const checkedAt = '2026-11-20T13:02:00Z'
const hora = new Date(checkedAt).toLocaleTimeString('pt-BR')

function mountCard(props = {}) {
  return mount(ServiceCard, { props: { service, ...props } })
}

describe('conteudo', () => {
  it('mostra nome, descricao e icone', () => {
    const wrapper = mountCard()

    expect(wrapper.find('h4').text()).toBe('jellyfin')
    expect(wrapper.text()).toContain('Filmes e séries')
    expect(wrapper.find('img').attributes('src')).toBe(iconMap.jellyfin)
  })

  it('sem icone mostra a inicial maiuscula do nome', () => {
    const wrapper = mountCard({ service: { ...service, icon: null } })

    expect(wrapper.find('img').exists()).toBe(false)
    expect(wrapper.find('.initial').text()).toBe('J')
  })

  it('sem descricao nao mostra o paragrafo', () => {
    const wrapper = mountCard({ service: { ...service, description: null } })

    expect(wrapper.find('.card-text p').exists()).toBe(false)
  })
})

describe('link', () => {
  it('admin ve um link que abre em nova aba', () => {
    const link = mountCard().find('a.card')

    expect(link.attributes('href')).toBe(service.url)
    expect(link.attributes('target')).toBe('_blank')
    expect(link.attributes('rel')).toBe('noopener')
  })

  it('somente leitura nao e link', () => {
    const wrapper = mountCard({ locked: true })

    expect(wrapper.find('a').exists()).toBe(false)
    expect(wrapper.find('div.card.locked').exists()).toBe(true)
  })

  it('card sem link no modo de edicao abre o editor ao clicar', async () => {
    const wrapper = mountCard({ service: { ...service, url: '#' }, editable: true })

    expect(wrapper.find('.hint').text()).toBe('Clique para definir o link')
    await wrapper.find('.card').trigger('click')

    expect(wrapper.emitted('edit')).toEqual([[{ ...service, url: '#' }]])
  })

  it('card sem link fora do modo de edicao nao faz nada', async () => {
    const wrapper = mountCard({ service: { ...service, url: '#' } })

    await wrapper.find('.card').trigger('click')

    expect(wrapper.find('.hint').exists()).toBe(false)
    expect(wrapper.emitted('edit')).toBeUndefined()
  })

  it('card bloqueado ignora o clique', async () => {
    const wrapper = mountCard({ service: { ...service, url: '#' }, editable: true, locked: true })

    await wrapper.find('.card').trigger('click')

    expect(wrapper.emitted('edit')).toBeUndefined()
  })

  it('botao de editar so aparece no modo de edicao e emite o card', async () => {
    expect(mountCard().find('.edit-btn').exists()).toBe(false)

    const wrapper = mountCard({ editable: true })
    await wrapper.find('.edit-btn').trigger('click')

    expect(wrapper.emitted('edit')).toEqual([[service]])
  })
})

describe('indicador de status', () => {
  const dot = (wrapper) => wrapper.find('.status-dot')

  it('online: ponto verde com latencia e horario', () => {
    const wrapper = mountCard({ status: { state: 'UP', latencyMs: 42, httpStatus: 200, checkedAt } })

    expect(dot(wrapper).classes()).toContain('up')
    expect(dot(wrapper).attributes('title')).toBe(`Online · 42 ms · verificado às ${hora}`)
  })

  it('offline com codigo HTTP', () => {
    const wrapper = mountCard({ status: { state: 'DOWN', latencyMs: null, httpStatus: 502, checkedAt } })

    expect(dot(wrapper).classes()).toContain('down')
    expect(dot(wrapper).attributes('title')).toBe(`Offline (HTTP 502) · verificado às ${hora}`)
  })

  it('offline sem resposta', () => {
    const wrapper = mountCard({ status: { state: 'DOWN', latencyMs: null, httpStatus: null, checkedAt } })

    expect(dot(wrapper).attributes('title')).toBe(`Offline · verificado às ${hora}`)
  })

  it('sem horario de verificacao omite o "verificado às"', () => {
    const wrapper = mountCard({ status: { state: 'UP', latencyMs: 5 } })

    expect(dot(wrapper).attributes('title')).toBe('Online · 5 ms')
  })

  it('desconhecido', () => {
    const wrapper = mountCard({ status: { state: 'UNKNOWN', checkedAt } })

    expect(dot(wrapper).classes()).toContain('unknown')
    expect(dot(wrapper).attributes('title')).toBe('Status desconhecido')
  })

  it('ainda nao verificado: ponto cinza', () => {
    const wrapper = mountCard({ status: null })

    expect(dot(wrapper).classes()).toContain('pending')
    expect(dot(wrapper).attributes('title')).toBe('Verificando…')
  })

  it('card sem link nao tem indicador', () => {
    const wrapper = mountCard({ service: { ...service, url: '#' }, status: { state: 'UNKNOWN' } })

    expect(dot(wrapper).exists()).toBe(false)
  })

  it('leitor de tela recebe o mesmo texto do tooltip', () => {
    const wrapper = mountCard({ status: { state: 'UP', latencyMs: 42, checkedAt } })

    expect(dot(wrapper).attributes('role')).toBe('img')
    expect(dot(wrapper).attributes('aria-label')).toBe(dot(wrapper).attributes('title'))
  })

  it('no modo de edicao o ponto sai de baixo do botao', () => {
    expect(dot(mountCard()).classes()).not.toContain('shifted')
    expect(dot(mountCard({ editable: true })).classes()).toContain('shifted')
  })
})
