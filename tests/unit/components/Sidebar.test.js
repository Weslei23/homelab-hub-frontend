import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { computed, ref } from 'vue'

const categories = ref([])
const role = ref('USER')

vi.mock('@/data/useCategories', () => ({ useCategories: () => ({ categories }) }))
vi.mock('@/data/useAuth', () => ({ isAdmin: computed(() => role.value === 'ADMIN') }))

const { default: Sidebar } = await import('@/components/Sidebar.vue')

beforeEach(() => {
  role.value = 'USER'
  categories.value = [
    { id: 1, label: 'Infraestrutura', services: [
      { id: 10, name: 'Proxmox', url: 'https://pve', icon: 'proxmox' },
      { id: 11, name: 'Sem Icone', url: 'https://x', icon: null },
    ] },
    { id: 2, label: 'Mídia', services: [{ id: 20, name: 'Jellyfin', url: 'https://jf' }] },
  ]
})

describe('Sidebar', () => {
  it('mostra o titulo padrao ou o informado', () => {
    expect(mount(Sidebar).find('h3').text()).toBe('Homelab')
    expect(mount(Sidebar, { props: { title: 'Meu Lab' } }).find('h3').text()).toBe('Meu Lab')
  })

  it('acesso rapido mostra so a primeira categoria', () => {
    const wrapper = mount(Sidebar)

    expect(wrapper.findAll('.category-toggle')).toHaveLength(1)
    expect(wrapper.find('.category-toggle').text()).toContain('Infraestrutura')
    expect(wrapper.text()).toContain('Proxmox')
    expect(wrapper.text()).not.toContain('Jellyfin')
  })

  it('servico sem icone nao renderiza imagem', () => {
    const links = mount(Sidebar).findAll('.links')

    expect(links[0].find('img').exists()).toBe(true)
    expect(links[1].find('img').exists()).toBe(false)
  })

  it('sem categorias nao quebra', () => {
    categories.value = []

    expect(mount(Sidebar).findAll('.category')).toHaveLength(0)
  })

  it('admin ve links que abrem em nova aba', () => {
    role.value = 'ADMIN'
    const link = mount(Sidebar).find('a.links')

    expect(link.attributes('href')).toBe('https://pve')
    expect(link.attributes('target')).toBe('_blank')
    expect(link.attributes('rel')).toBe('noopener')
  })

  it('usuario comum nao ve links', () => {
    const wrapper = mount(Sidebar)

    expect(wrapper.find('a').exists()).toBe(false)
    expect(wrapper.findAll('div.links.locked')).toHaveLength(2)
  })

  it('recolhe e expande a categoria', async () => {
    const wrapper = mount(Sidebar)
    const menu = () => wrapper.find('nav.menu')
    expect(menu().isVisible()).toBe(true)
    expect(wrapper.find('.chevron').classes()).toContain('open')

    await wrapper.find('.category-toggle').trigger('click')
    expect(menu().element.style.display).toBe('none')
    expect(wrapper.find('.chevron').classes()).not.toContain('open')

    await wrapper.find('.category-toggle').trigger('click')
    expect(menu().element.style.display).toBe('')
  })

  it('botao de fechar emite close', async () => {
    const wrapper = mount(Sidebar)

    await wrapper.find('.close-btn').trigger('click')

    expect(wrapper.emitted('close')).toHaveLength(1)
  })
})
