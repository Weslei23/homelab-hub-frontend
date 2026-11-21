import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/data/catalogApi')
vi.mock('@/data/services', () => ({
  categories: [{ id: 'padrao', label: 'Padrão', services: [{ name: 'TrueNAS', url: '#' }] }],
}))

const fromServer = [{ id: 1, label: 'Infra', services: [{ id: 10, name: 'Proxmox', url: 'https://pve' }] }]

let api
let mod

beforeEach(async () => {
  vi.resetModules()
  api = await import('@/data/catalogApi')
  mod = await import('@/data/useCategories')
  api.fetchCatalog.mockResolvedValue(fromServer)
})

describe('loadCatalog', () => {
  it('comeca com o catalogo padrao', () => {
    const { categories, apiOnline } = mod.useCategories()

    expect(categories.value[0].id).toBe('padrao')
    expect(apiOnline.value).toBe(true)
  })

  it('carrega o catalogo do servidor', async () => {
    await mod.loadCatalog()

    const { categories, apiOnline } = mod.useCategories()
    expect(categories.value).toEqual(fromServer)
    expect(apiOnline.value).toBe(true)
  })

  it('backend fora do ar volta para o catalogo padrao', async () => {
    await mod.loadCatalog()
    api.fetchCatalog.mockRejectedValueOnce(new Error('Failed to fetch'))

    await mod.loadCatalog()

    const { categories, apiOnline } = mod.useCategories()
    expect(categories.value[0].id).toBe('padrao')
    expect(apiOnline.value).toBe(false)
  })

  it('volta a ficar online quando o backend responde', async () => {
    api.fetchCatalog.mockRejectedValueOnce(new Error('x'))
    await mod.loadCatalog()

    await mod.loadCatalog()

    expect(mod.useCategories().apiOnline.value).toBe(true)
  })

  it('estado e compartilhado entre componentes', async () => {
    await mod.loadCatalog()

    expect(mod.useCategories().categories).toBe(mod.useCategories().categories)
  })
})

describe('acoes', () => {
  const card = { name: 'X', url: 'https://x' }

  it.each([
    ['addCategory', ['Rede'], 'createCategory', ['Rede']],
    ['renameCategory', [1, 'Lab'], 'renameCategory', [1, 'Lab']],
    ['removeCategory', [1], 'deleteCategory', [1]],
    ['addCard', [1, card], 'createCard', [1, card]],
    ['updateCard', [10, card], 'updateCard', [10, card]],
    ['removeCard', [10], 'deleteCard', [10]],
  ])('%s chama a API e recarrega o catalogo', async (action, args, apiFn, apiArgs) => {
    api[apiFn].mockResolvedValue({ id: 99 })

    const result = await mod.useCategories()[action](...args)

    expect(api[apiFn]).toHaveBeenCalledWith(...apiArgs)
    expect(api.fetchCatalog).toHaveBeenCalledOnce()
    expect(result).toEqual({ id: 99 })
  })

  it('recarrega so depois que a acao termina', async () => {
    const order = []
    api.createCategory.mockImplementation(async () => order.push('create'))
    api.fetchCatalog.mockImplementation(async () => {
      order.push('reload')
      return fromServer
    })

    await mod.useCategories().addCategory('Rede')

    expect(order).toEqual(['create', 'reload'])
  })

  it('erro na acao e propagado e nao recarrega', async () => {
    api.deleteCard.mockRejectedValue(new Error('Card nao encontrado'))

    await expect(mod.useCategories().removeCard(99)).rejects.toThrow('Card nao encontrado')
    expect(api.fetchCatalog).not.toHaveBeenCalled()
  })
})
