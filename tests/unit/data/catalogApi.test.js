import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mockFetch, response } from '../helpers'

vi.mock('@/data/useAuth', () => ({
  getToken: vi.fn(() => null),
  logout: vi.fn(),
}))

const auth = await import('@/data/useAuth')
const api = await import('@/data/catalogApi')

beforeEach(() => {
  auth.getToken.mockReturnValue(null)
  auth.logout.mockClear()
})

describe('requisicoes', () => {
  it('envia o token no cabecalho Authorization', async () => {
    auth.getToken.mockReturnValue('jwt-123')
    const fetch = mockFetch(response(200, []))

    await api.fetchCatalog()

    const [, options] = fetch.mock.calls[0]
    expect(options.headers).toEqual({ 'Content-Type': 'application/json', Authorization: 'Bearer jwt-123' })
  })

  it('sem token nao envia Authorization', async () => {
    const fetch = mockFetch(response(200, []))

    await api.fetchCatalog()

    expect(fetch.mock.calls[0][1].headers).toEqual({ 'Content-Type': 'application/json' })
  })

  it('devolve o JSON da resposta', async () => {
    mockFetch(response(200, [{ id: 1, label: 'Infra', services: [] }]))

    await expect(api.fetchCatalog()).resolves.toEqual([{ id: 1, label: 'Infra', services: [] }])
  })

  it('204 devolve null', async () => {
    mockFetch(response(204))

    await expect(api.deleteCard(1)).resolves.toBeNull()
  })

  it('usa VITE_API_URL como prefixo quando definido', async () => {
    vi.stubEnv('VITE_API_URL', 'http://192.168.3.183:8081')
    vi.resetModules()
    const fresh = await import('@/data/catalogApi')
    const fetch = mockFetch(response(200, []))

    await fresh.fetchCatalog()

    expect(fetch.mock.calls[0][0]).toBe('http://192.168.3.183:8081/api/catalog')
  })
})

describe('erros', () => {
  it('401 encerra a sessao e pede novo login', async () => {
    mockFetch(response(401, { message: 'Autenticacao necessaria' }))

    await expect(api.fetchCatalog()).rejects.toThrow('Sessão expirada. Entre novamente.')
    expect(auth.logout).toHaveBeenCalledOnce()
  })

  it('usa a mensagem enviada pelo backend', async () => {
    mockFetch(response(400, { message: 'A URL e obrigatoria' }))

    await expect(api.createCard(1, {})).rejects.toThrow('A URL e obrigatoria')
    expect(auth.logout).not.toHaveBeenCalled()
  })

  it('403 mostra a mensagem do backend sem deslogar', async () => {
    mockFetch(response(403, { message: 'Voce nao tem permissao para esta acao' }))

    await expect(api.deleteCard(1)).rejects.toThrow('Voce nao tem permissao para esta acao')
    expect(auth.logout).not.toHaveBeenCalled()
  })

  it('corpo vazio usa mensagem padrao', async () => {
    mockFetch(response(500))

    await expect(api.fetchCatalog()).rejects.toThrow('Erro ao comunicar com o servidor')
  })

  it('JSON sem message usa mensagem padrao', async () => {
    mockFetch(response(502, { error: 'Bad Gateway' }))

    await expect(api.fetchCatalog()).rejects.toThrow('Erro ao comunicar com o servidor')
  })

  it('falha de rede propaga o erro', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')))

    await expect(api.fetchCatalog()).rejects.toThrow('Failed to fetch')
  })
})

describe('rotas', () => {
  const card = { name: 'Proxmox', url: 'https://pve' }

  it.each([
    ['fetchCatalog', () => api.fetchCatalog(), '/api/catalog', 'GET', undefined],
    ['fetchStatus', () => api.fetchStatus(), '/api/status', 'GET', undefined],
    ['createCategory', () => api.createCategory('Rede'), '/api/categories', 'POST', { label: 'Rede' }],
    ['renameCategory', () => api.renameCategory(3, 'Lab'), '/api/categories/3', 'PUT', { label: 'Lab' }],
    ['deleteCategory', () => api.deleteCategory(3), '/api/categories/3', 'DELETE', undefined],
    ['createCard', () => api.createCard(2, card), '/api/categories/2/cards', 'POST', card],
    ['updateCard', () => api.updateCard(7, card), '/api/cards/7', 'PUT', card],
    ['deleteCard', () => api.deleteCard(7), '/api/cards/7', 'DELETE', undefined],
  ])('%s chama %s', async (_name, call, url, method, body) => {
    const fetch = mockFetch(response(200, {}))

    await call()

    const [calledUrl, options] = fetch.mock.calls[0]
    expect(calledUrl).toBe(url)
    expect(options.method ?? 'GET').toBe(method)
    expect(options.body === undefined ? undefined : JSON.parse(options.body)).toEqual(body)
  })
})
