import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { computed, ref } from 'vue'

// Estado controlado pelo teste no lugar dos composables reais
const categories = ref([])
const apiOnline = ref(true)
const session = ref(null)
const statuses = ref({})
const actions = {
  addCategory: vi.fn(),
  renameCategory: vi.fn(),
  removeCategory: vi.fn(),
  addCard: vi.fn(),
  updateCard: vi.fn(),
  removeCard: vi.fn(),
}
const loadCatalog = vi.fn()
const logout = vi.fn()
const refreshStatus = vi.fn()

vi.mock('@/data/useCategories', () => ({
  loadCatalog: (...args) => loadCatalog(...args),
  useCategories: () => ({ categories, apiOnline, ...actions }),
}))
vi.mock('@/data/useAuth', () => ({
  useAuth: () => ({ session, isAdmin: computed(() => session.value?.role === 'ADMIN'), logout }),
}))
vi.mock('@/data/useStatus', () => ({ useStatus: () => ({ statuses, refreshStatus }) }))
// O painel de musicas tem testes proprios (MusicPanel.test.js); aqui so importa quando ele aparece
vi.mock('@/components/MusicPanel.vue', () => ({ default: { name: 'MusicPanel', template: '<div class="music-stub" />' } }))
vi.mock('@/components/MediaPanel.vue', () => ({
  default: { name: 'MediaPanel', props: ['admin'], template: '<div class="media-stub" :data-admin="String(admin)" />' },
}))

const { default: Dashboard } = await import('@/components/Dashboard.vue')

const catalog = () => [
  {
    id: 1,
    label: 'Infraestrutura',
    services: [
      { id: 10, name: 'Proxmox', url: 'https://pve', description: 'Virtualização', icon: 'proxmox' },
      { id: 11, name: 'TrueNAS', url: '#', description: 'Armazenamento', icon: 'truenas' },
    ],
  },
  { id: 2, label: 'Mídia', services: [{ id: 20, name: 'Jellyfin', url: 'https://jf', description: 'Filmes e séries' }] },
]

function asAdmin() {
  session.value = { token: 'jwt', username: 'ana', role: 'ADMIN' }
}

function asUser() {
  session.value = { token: 'jwt', username: 'bia', role: 'USER' }
}

function mountDashboard() {
  return mount(Dashboard, { attachTo: document.body })
}

async function enterEditMode(wrapper) {
  await wrapper.find('.edit-toggle').trigger('click')
}

beforeEach(() => {
  vi.useFakeTimers()
  vi.setSystemTime(new Date(2026, 10, 20, 14, 30))
  categories.value = catalog()
  apiOnline.value = true
  statuses.value = {}
  asAdmin()
  Object.values(actions).forEach((fn) => fn.mockReset().mockResolvedValue())
  loadCatalog.mockReset()
  logout.mockReset()
  refreshStatus.mockReset()
})

afterEach(() => {
  vi.useRealTimers()
  document.body.innerHTML = ''
})

describe('cabecalho', () => {
  it.each([
    [3, 'Boa madrugada'],
    [6, 'Bom dia'],
    [11, 'Bom dia'],
    [12, 'Boa tarde'],
    [17, 'Boa tarde'],
    [18, 'Boa noite'],
    [23, 'Boa noite'],
  ])('%sh -> "%s"', (hour, greeting) => {
    vi.setSystemTime(new Date(2026, 10, 20, hour, 0))

    expect(mountDashboard().find('h1').text()).toBe(`${greeting} 👋`)
  })

  it('mostra data e hora em portugues', () => {
    const subtitle = mountDashboard().find('.subtitle').text()

    expect(subtitle).toContain('novembro')
    expect(subtitle).toContain('14:30')
  })

  it('atualiza o relogio a cada 30 segundos', async () => {
    const wrapper = mountDashboard()

    await vi.advanceTimersByTimeAsync(4 * 60 * 1000)

    expect(wrapper.find('.subtitle').text()).toContain('14:34')
  })

  it('para o relogio ao desmontar', () => {
    const clear = vi.spyOn(globalThis, 'clearInterval')

    mountDashboard().unmount()

    expect(clear).toHaveBeenCalled()
  })

  it('carrega o catalogo ao montar', () => {
    mountDashboard()

    expect(loadCatalog).toHaveBeenCalledOnce()
  })

  it('mostra o usuario e o perfil', () => {
    expect(mountDashboard().find('.user-name').text()).toBe('ana')
    expect(mountDashboard().find('.role-badge').text()).toBe('Administrador')

    asUser()
    expect(mountDashboard().find('.role-badge').text()).toBe('Somente leitura')
  })

  it('botao Sair faz logout', async () => {
    await mountDashboard().find('.logout-btn').trigger('click')

    expect(logout).toHaveBeenCalledOnce()
  })
})

describe('catalogo', () => {
  it('mostra as categorias e os cards', () => {
    const wrapper = mountDashboard()

    expect(wrapper.findAll('.category-section h2').map((h) => h.text())).toEqual(['Infraestrutura', 'Mídia'])
    expect(wrapper.findAll('.card h4').map((h) => h.text())).toEqual(['Proxmox', 'TrueNAS', 'Jellyfin'])
  })

  it('passa o status de cada card pelo id', () => {
    statuses.value = { 10: { state: 'UP', latencyMs: 5 }, 20: { state: 'DOWN' } }
    const wrapper = mountDashboard()

    const dots = wrapper.findAll('.status-dot')
    // TrueNAS (url "#") nao tem indicador
    expect(dots).toHaveLength(2)
    expect(dots[0].classes()).toContain('up')
    expect(dots[1].classes()).toContain('down')
  })

  it('cards do catalogo padrao (sem id) ficam como "verificando"', () => {
    categories.value = [{ id: 'padrao', label: 'Padrão', services: [{ name: 'Docker', url: 'https://docker' }] }]

    expect(mountDashboard().find('.status-dot').classes()).toContain('pending')
  })

  it('backend fora do ar mostra o aviso', () => {
    apiOnline.value = false

    expect(mountDashboard().find('.offline').text()).toContain('Backend indisponível')
  })

  it('catalogo vazio para admin sugere criar categoria', () => {
    categories.value = []

    expect(mountDashboard().find('.empty').text()).toContain('Clique em "Editar" e depois em "+ Categoria"')
  })

  it('catalogo vazio para usuario comum', () => {
    categories.value = []
    asUser()

    expect(mountDashboard().find('.empty').text()).toBe('Nenhuma categoria disponível.')
  })
})

describe('busca', () => {
  async function search(wrapper, term) {
    await wrapper.find('.search-box input').setValue(term)
  }

  it('filtra pelo nome sem diferenciar maiusculas', async () => {
    const wrapper = mountDashboard()

    await search(wrapper, 'PROX')

    expect(wrapper.findAll('.card h4').map((h) => h.text())).toEqual(['Proxmox'])
    expect(wrapper.findAll('.category-section')).toHaveLength(1)
  })

  it('filtra pela descricao', async () => {
    const wrapper = mountDashboard()

    await search(wrapper, 'séries')

    expect(wrapper.findAll('.card h4').map((h) => h.text())).toEqual(['Jellyfin'])
  })

  it('espacos em volta sao ignorados', async () => {
    const wrapper = mountDashboard()

    await search(wrapper, '  truenas  ')

    expect(wrapper.findAll('.card h4').map((h) => h.text())).toEqual(['TrueNAS'])
  })

  it('cards sem descricao nao quebram a busca', async () => {
    categories.value = [{ id: 1, label: 'X', services: [{ id: 1, name: 'Sem desc', url: 'https://x', description: null }] }]
    const wrapper = mountDashboard()

    await search(wrapper, 'algo')

    expect(wrapper.find('.empty').text()).toBe('Nenhum serviço encontrado para "algo".')
  })

  it('busca vazia mostra tudo', async () => {
    const wrapper = mountDashboard()
    await search(wrapper, 'prox')

    await search(wrapper, '')

    expect(wrapper.findAll('.card')).toHaveLength(3)
  })

  it('durante a busca esconde os botoes de adicionar e editar categoria', async () => {
    const wrapper = mountDashboard()
    await enterEditMode(wrapper)
    expect(wrapper.find('.add-card').exists()).toBe(true)

    await search(wrapper, 'prox')

    expect(wrapper.find('.add-card').exists()).toBe(false)
    expect(wrapper.find('.category-title .icon-btn').exists()).toBe(false)
  })
})

describe('permissoes', () => {
  it('usuario comum: cards bloqueados e sem botao de editar', () => {
    asUser()
    const wrapper = mountDashboard()

    expect(wrapper.find('.edit-toggle').exists()).toBe(false)
    expect(wrapper.find('a.card').exists()).toBe(false)
    expect(wrapper.findAll('div.card.locked')).toHaveLength(3)
  })

  it('admin: cards sao links', () => {
    expect(mountDashboard().findAll('a.card')).toHaveLength(3)
  })

  it('admin com backend fora do ar nao pode editar', () => {
    apiOnline.value = false

    expect(mountDashboard().find('.edit-toggle').exists()).toBe(false)
  })

  it('modo de edicao liga e desliga os controles', async () => {
    const wrapper = mountDashboard()
    expect(wrapper.find('.add-category').exists()).toBe(false)
    expect(wrapper.find('.edit-btn').exists()).toBe(false)

    await enterEditMode(wrapper)
    expect(wrapper.find('.edit-toggle').text()).toBe('✓ Concluir')
    expect(wrapper.find('.edit-toggle').attributes('aria-pressed')).toBe('true')
    expect(wrapper.find('.add-category').exists()).toBe(true)
    expect(wrapper.findAll('.add-card')).toHaveLength(2)
    expect(wrapper.findAll('.edit-btn')).toHaveLength(3)

    await enterEditMode(wrapper)
    expect(wrapper.find('.edit-toggle').text()).toBe('✎ Editar')
    expect(wrapper.find('.add-category').exists()).toBe(false)
  })
})

describe('painel de musicas', () => {
  it('aparece para admin com o backend online', () => {
    expect(mountDashboard().find('.music-stub').exists()).toBe(true)
  })

  it('nao aparece para usuario comum', () => {
    asUser()

    expect(mountDashboard().find('.music-stub').exists()).toBe(false)
  })

  it('nao aparece com o backend fora do ar', () => {
    apiOnline.value = false

    expect(mountDashboard().find('.music-stub').exists()).toBe(false)
  })
})

describe('painel de filmes e series', () => {
  it('admin ve o painel com a busca de pedidos', () => {
    const panel = mountDashboard().find('.media-stub')

    expect(panel.exists()).toBe(true)
    expect(panel.attributes('data-admin')).toBe('true')
  })

  it('usuario comum ve o painel sem a busca', () => {
    asUser()

    expect(mountDashboard().find('.media-stub').attributes('data-admin')).toBe('false')
  })

  it('nao aparece com o backend fora do ar', () => {
    apiOnline.value = false

    expect(mountDashboard().find('.media-stub').exists()).toBe(false)
  })
})

describe('edicao', () => {
  it('cria categoria pelo modal', async () => {
    const wrapper = mountDashboard()
    await enterEditMode(wrapper)

    await wrapper.find('.add-category').trigger('click')
    await flushPromises()
    await wrapper.find('#cat-label').setValue('Jogos')
    await wrapper.find('.modal').trigger('submit')
    await flushPromises()

    expect(actions.addCategory).toHaveBeenCalledWith('Jogos')
    expect(wrapper.find('#cat-label').exists()).toBe(false)
  })

  it('renomeia categoria pelo modal', async () => {
    const wrapper = mountDashboard()
    await enterEditMode(wrapper)

    await wrapper.find('[aria-label="Renomear categoria"]').trigger('click')
    await flushPromises()
    expect(wrapper.find('#cat-label').element.value).toBe('Infraestrutura')
    await wrapper.find('#cat-label').setValue('Servidores')
    await wrapper.find('.modal').trigger('submit')
    await flushPromises()

    expect(actions.renameCategory).toHaveBeenCalledWith(1, 'Servidores')
  })

  it('excluir categoria pede confirmacao com a quantidade de cards', async () => {
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(true)
    const wrapper = mountDashboard()
    await enterEditMode(wrapper)

    await wrapper.find('[aria-label="Excluir categoria"]').trigger('click')
    await flushPromises()

    expect(confirm).toHaveBeenCalledWith('Excluir a categoria "Infraestrutura" e seus 2 card(s)?')
    expect(actions.removeCategory).toHaveBeenCalledWith(1)
  })

  it('excluir categoria vazia nao menciona cards', async () => {
    categories.value = [{ id: 5, label: 'Vazia', services: [] }]
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(true)
    const wrapper = mountDashboard()
    await enterEditMode(wrapper)

    await wrapper.find('[aria-label="Excluir categoria"]').trigger('click')

    expect(confirm).toHaveBeenCalledWith('Excluir a categoria "Vazia"?')
  })

  it('cancelar a confirmacao nao exclui a categoria', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(false)
    const wrapper = mountDashboard()
    await enterEditMode(wrapper)

    await wrapper.find('[aria-label="Excluir categoria"]').trigger('click')

    expect(actions.removeCategory).not.toHaveBeenCalled()
  })

  it('erro ao excluir categoria aparece num alerta', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true)
    const alert = vi.spyOn(window, 'alert').mockImplementation(() => {})
    actions.removeCategory.mockRejectedValue(new Error('Categoria nao encontrada'))
    const wrapper = mountDashboard()
    await enterEditMode(wrapper)

    await wrapper.find('[aria-label="Excluir categoria"]').trigger('click')
    await flushPromises()

    expect(alert).toHaveBeenCalledWith('Categoria nao encontrada')
  })

  it('novo card e criado na categoria certa e o status e buscado logo depois', async () => {
    const wrapper = mountDashboard()
    await enterEditMode(wrapper)

    await wrapper.findAll('.add-card')[1].trigger('click')
    await flushPromises()
    await wrapper.find('#card-name').setValue('Navidrome')
    await wrapper.find('#card-url').setValue('http://192.168.3.183:4533')
    await wrapper.find('.modal').trigger('submit')
    await flushPromises()

    expect(actions.addCard).toHaveBeenCalledWith(2, {
      name: 'Navidrome',
      url: 'http://192.168.3.183:4533',
      description: null,
      icon: null,
    })
    expect(refreshStatus).not.toHaveBeenCalled()
    await vi.advanceTimersByTimeAsync(3500)
    expect(refreshStatus).toHaveBeenCalledOnce()
  })

  it('editar card pelo botao abre o modal preenchido e salva', async () => {
    const wrapper = mountDashboard()
    await enterEditMode(wrapper)

    await wrapper.findAll('.edit-btn')[0].trigger('click')
    await flushPromises()
    expect(wrapper.find('#card-name').element.value).toBe('Proxmox')
    await wrapper.find('#card-name').setValue('PVE')
    await wrapper.find('.modal').trigger('submit')
    await flushPromises()

    expect(actions.updateCard).toHaveBeenCalledWith(10, expect.objectContaining({ name: 'PVE', url: 'https://pve' }))
    await vi.advanceTimersByTimeAsync(3500)
    expect(refreshStatus).toHaveBeenCalledOnce()
  })

  it('falha ao salvar card nao agenda a busca de status', async () => {
    actions.updateCard.mockRejectedValue(new Error('A URL e obrigatoria'))
    const wrapper = mountDashboard()
    await enterEditMode(wrapper)

    await wrapper.findAll('.edit-btn')[0].trigger('click')
    await flushPromises()
    await wrapper.find('.modal').trigger('submit')
    await flushPromises()
    await vi.advanceTimersByTimeAsync(5000)

    expect(refreshStatus).not.toHaveBeenCalled()
    expect(wrapper.find('.modal .error').text()).toBe('A URL e obrigatoria')
  })

  it('excluir card pelo modal', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true)
    const wrapper = mountDashboard()
    await enterEditMode(wrapper)

    await wrapper.findAll('.edit-btn')[2].trigger('click')
    await flushPromises()
    await wrapper.find('.modal .danger').trigger('click')
    await flushPromises()

    expect(actions.removeCard).toHaveBeenCalledWith(20)
  })
})
