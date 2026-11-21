import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { deferred } from '../helpers'

vi.mock('@/data/useAuth', () => ({
  login: vi.fn(),
  register: vi.fn(),
}))

const auth = await import('@/data/useAuth')
const { default: LoginView } = await import('@/components/LoginView.vue')

beforeEach(() => {
  auth.login.mockReset().mockResolvedValue()
  auth.register.mockReset().mockResolvedValue()
})

const inputs = (wrapper) => ({
  username: wrapper.find('input[type="text"]'),
  email: wrapper.find('input[type="email"]'),
  password: wrapper.find('input[type="password"]'),
})

async function switchToRegister(wrapper) {
  await wrapper.find('button.link').trigger('click')
}

describe('login', () => {
  it('abre no modo de login', () => {
    const wrapper = mount(LoginView)

    expect(wrapper.find('.lead').text()).toBe('Entre para acessar o dashboard')
    expect(wrapper.find('.primary').text()).toBe('Entrar')
    expect(inputs(wrapper).username.exists()).toBe(false)
    expect(inputs(wrapper).password.attributes('autocomplete')).toBe('current-password')
  })

  it.each([
    [{ email: '  ', password: 'x' }, 'Informe o e-mail'],
    [{ email: 'ana@lab.local', password: '' }, 'Informe a senha'],
  ])('%o -> "%s"', async (values, message) => {
    const wrapper = mount(LoginView)
    await inputs(wrapper).email.setValue(values.email)
    await inputs(wrapper).password.setValue(values.password)

    await wrapper.find('form').trigger('submit')

    expect(wrapper.find('[role="alert"]').text()).toBe(message)
    expect(auth.login).not.toHaveBeenCalled()
  })

  it('entra com o e-mail sem espacos e a senha como esta', async () => {
    const wrapper = mount(LoginView)
    await inputs(wrapper).email.setValue('  ana@lab.local ')
    await inputs(wrapper).password.setValue(' senha com espaco ')

    await wrapper.find('form').trigger('submit')

    expect(auth.login).toHaveBeenCalledWith('ana@lab.local', ' senha com espaco ')
  })

  it('mostra "Aguarde..." enquanto entra', async () => {
    const pending = deferred()
    auth.login.mockReturnValue(pending.promise)
    const wrapper = mount(LoginView)
    await inputs(wrapper).email.setValue('ana@lab.local')
    await inputs(wrapper).password.setValue('x')

    await wrapper.find('form').trigger('submit')

    expect(wrapper.find('.primary').text()).toBe('Aguarde...')
    expect(wrapper.find('.primary').element.disabled).toBe(true)
    pending.resolve()
    await flushPromises()
    expect(wrapper.find('.primary').element.disabled).toBe(false)
  })

  it('mostra o erro do servidor', async () => {
    auth.login.mockRejectedValue(new Error('E-mail ou senha invalidos'))
    const wrapper = mount(LoginView)
    await inputs(wrapper).email.setValue('ana@lab.local')
    await inputs(wrapper).password.setValue('errada')

    await wrapper.find('form').trigger('submit')
    await flushPromises()

    expect(wrapper.find('[role="alert"]').text()).toBe('E-mail ou senha invalidos')
  })
})

describe('cadastro', () => {
  it('alterna para o modo de cadastro', async () => {
    const wrapper = mount(LoginView)

    await switchToRegister(wrapper)

    expect(wrapper.find('.lead').text()).toBe('Criar conta')
    expect(inputs(wrapper).username.exists()).toBe(true)
    expect(inputs(wrapper).password.attributes('autocomplete')).toBe('new-password')
    expect(wrapper.find('.note').text()).toBe('Novas contas têm acesso somente de visualização.')
    expect(wrapper.find('button.link').text()).toBe('Já tenho conta')
  })

  it('trocar de modo limpa o erro', async () => {
    const wrapper = mount(LoginView)
    await wrapper.find('form').trigger('submit')
    expect(wrapper.find('[role="alert"]').exists()).toBe(true)

    await switchToRegister(wrapper)

    expect(wrapper.find('[role="alert"]').exists()).toBe(false)
  })

  it('nome de usuario obrigatorio', async () => {
    const wrapper = mount(LoginView)
    await switchToRegister(wrapper)
    await inputs(wrapper).email.setValue('bia@lab.local')
    await inputs(wrapper).password.setValue('x')

    await wrapper.find('form').trigger('submit')

    expect(wrapper.find('[role="alert"]').text()).toBe('Informe o nome de usuário')
    expect(auth.register).not.toHaveBeenCalled()
  })

  it('cadastra com os campos limpos', async () => {
    const wrapper = mount(LoginView)
    await switchToRegister(wrapper)
    await inputs(wrapper).username.setValue(' bia ')
    await inputs(wrapper).email.setValue(' bia@lab.local ')
    await inputs(wrapper).password.setValue('senha')

    await wrapper.find('form').trigger('submit')

    expect(auth.register).toHaveBeenCalledWith('bia', 'bia@lab.local', 'senha')
    expect(auth.login).not.toHaveBeenCalled()
  })

  it('volta para o login', async () => {
    const wrapper = mount(LoginView)
    await switchToRegister(wrapper)

    await wrapper.find('button.link').trigger('click')

    expect(wrapper.find('.primary').text()).toBe('Entrar')
  })
})
