import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mockFetch, response } from '../helpers'

const STORAGE_KEY = 'homepage.session'
const adminLogin = { token: 'jwt', username: 'ana', email: 'ana@lab.local', role: 'ADMIN', extra: 'ignorado' }

// A sessao e lida do localStorage quando o modulo carrega: cada teste importa uma copia nova
async function loadAuth() {
  vi.resetModules()
  return import('@/data/useAuth')
}

beforeEach(() => {
  localStorage.clear()
})

describe('sessao salva', () => {
  it('comeca deslogado sem nada salvo', async () => {
    const auth = await loadAuth()

    expect(auth.isAuthenticated.value).toBe(false)
    expect(auth.isAdmin.value).toBe(false)
    expect(auth.getToken()).toBeNull()
  })

  it('restaura a sessao do localStorage', async () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ token: 'jwt', username: 'ana', role: 'ADMIN' }))

    const auth = await loadAuth()

    expect(auth.isAuthenticated.value).toBe(true)
    expect(auth.isAdmin.value).toBe(true)
    expect(auth.getToken()).toBe('jwt')
  })

  it('ignora JSON corrompido', async () => {
    localStorage.setItem(STORAGE_KEY, '{nao e json')

    expect((await loadAuth()).isAuthenticated.value).toBe(false)
  })

  it('ignora sessao sem token', async () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ username: 'ana' }))

    expect((await loadAuth()).isAuthenticated.value).toBe(false)
  })
})

describe('login', () => {
  it('envia as credenciais e guarda a sessao', async () => {
    const fetch = mockFetch(response(200, adminLogin))
    const auth = await loadAuth()

    await auth.login('ana@lab.local', 'segredo')

    const [url, options] = fetch.mock.calls[0]
    expect(url).toBe('/api/v1/auth/login')
    expect(options.method).toBe('POST')
    expect(JSON.parse(options.body)).toEqual({ email: 'ana@lab.local', password: 'segredo' })
    expect(auth.useAuth().session.value).toEqual({ token: 'jwt', username: 'ana', email: 'ana@lab.local', role: 'ADMIN' })
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY)).token).toBe('jwt')
    expect(auth.getToken()).toBe('jwt')
  })

  it('usuario comum nao e admin', async () => {
    mockFetch(response(200, { ...adminLogin, role: 'USER' }))
    const auth = await loadAuth()

    await auth.login('bia@lab.local', 'x')

    expect(auth.isAuthenticated.value).toBe(true)
    expect(auth.isAdmin.value).toBe(false)
  })

  it('mostra a mensagem do backend quando falha', async () => {
    mockFetch(response(401, { message: 'E-mail ou senha invalidos' }))
    const auth = await loadAuth()

    await expect(auth.login('ana@lab.local', 'errada')).rejects.toThrow('E-mail ou senha invalidos')
    expect(auth.isAuthenticated.value).toBe(false)
  })

  it('mensagem padrao quando o backend nao responde JSON', async () => {
    mockFetch(response(502))
    const auth = await loadAuth()

    await expect(auth.login('a@b.c', 'x')).rejects.toThrow('Erro ao comunicar com o servidor')
  })

  it('continua logado na memoria se o localStorage estiver indisponivel', async () => {
    mockFetch(response(200, adminLogin))
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('QuotaExceeded')
    })
    const auth = await loadAuth()

    await auth.login('ana@lab.local', 'x')

    expect(auth.isAuthenticated.value).toBe(true)
  })
})

describe('cadastro', () => {
  it('cadastra e ja entra na conta', async () => {
    const fetch = mockFetch(response(201, { username: 'bia', email: 'bia@lab.local' }), response(200, { ...adminLogin, role: 'USER' }))
    const auth = await loadAuth()

    await auth.register('bia', 'bia@lab.local', 'senha')

    expect(fetch.mock.calls[0][0]).toBe('/api/v1/auth/register')
    expect(JSON.parse(fetch.mock.calls[0][1].body)).toEqual({ username: 'bia', email: 'bia@lab.local', password: 'senha' })
    expect(fetch.mock.calls[1][0]).toBe('/api/v1/auth/login')
    expect(JSON.parse(fetch.mock.calls[1][1].body)).toEqual({ email: 'bia@lab.local', password: 'senha' })
    expect(auth.isAuthenticated.value).toBe(true)
  })

  it('falha no cadastro nao tenta entrar', async () => {
    const fetch = mockFetch(response(409, { message: 'E-mail ja cadastrado' }))
    const auth = await loadAuth()

    await expect(auth.register('bia', 'bia@lab.local', 'x')).rejects.toThrow('E-mail ja cadastrado')
    expect(fetch).toHaveBeenCalledOnce()
    expect(auth.isAuthenticated.value).toBe(false)
  })
})

describe('configuracao do login', () => {
  it('le se o cadastro esta ligado', async () => {
    const fetch = mockFetch(response(200, { registrationEnabled: true }))
    const auth = await loadAuth()

    expect(await auth.fetchAuthConfig()).toEqual({ registrationEnabled: true })
    expect(fetch.mock.calls[0][0]).toBe('/api/v1/auth/config')
  })

  it.each([
    ['desligado', () => mockFetch(response(200, { registrationEnabled: false }))],
    ['valor que nao e booleano', () => mockFetch(response(200, { registrationEnabled: 'sim' }))],
    ['erro HTTP', () => mockFetch(response(500, {}))],
    ['corpo vazio', () => mockFetch(response(200))],
    ['backend fora do ar', () => vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')))],
  ])('%s esconde o cadastro', async (_name, setup) => {
    setup()
    const auth = await loadAuth()

    expect(await auth.fetchAuthConfig()).toEqual({ registrationEnabled: false })
  })
})

describe('logout', () => {
  it('limpa a sessao e o localStorage', async () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ token: 'jwt', role: 'ADMIN' }))
    const auth = await loadAuth()

    auth.logout()

    expect(auth.isAuthenticated.value).toBe(false)
    expect(auth.isAdmin.value).toBe(false)
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull()
  })
})
