import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { deferred } from '../helpers'

vi.mock('@/data/useAuth', () => ({
  login: vi.fn(),
  register: vi.fn(),
  fetchAuthConfig: vi.fn(),
}))

const auth = await import('@/data/useAuth')
const { default: LoginView } = await import('@/components/LoginView.vue')

beforeEach(() => {
  auth.login.mockReset().mockResolvedValue()
  auth.register.mockReset().mockResolvedValue()
  // Cadastro ligado na maioria dos testes; os testes de "cadastro desligado" trocam isto
  auth.fetchAuthConfig.mockReset().mockResolvedValue({ registrationEnabled: true })
})

/** Monta e espera a configuracao do backend chegar. */
async function mountLogin() {
  const wrapper = mount(LoginView)
  await flushPromises()
  return wrapper
}

const inputs = (wrapper) => ({
  username: wrapper.find('input[type="text"]'),
  email: wrapper.find('input[type="email"]'),
  password: wrapper.find('input[type="password"]'),
})

async function switchToRegister(wrapper) {
  await wrapper.find('button.link').trigger('click')
}

describe('login', () => {
  it('abre no modo de login', async () => {
    const wrapper = await mountLogin()

    expect(wrapper.find('.lead').text()).toBe('Entre para acessar o dashboard')
    expect(wrapper.find('.primary').text()).toBe('Entrar')
    expect(inputs(wrapper).username.exists()).toBe(false)
    expect(inputs(wrapper).password.attributes('autocomplete')).toBe('current-password')
  })

  it.each([
    [{ email: '  ', password: 'x' }, 'Informe o e-mail'],
    [{ email: 'ana@lab.local', password: '' }, 'Informe a senha'],
  ])('%o -> "%s"', async (values, message) => {
    const wrapper = await mountLogin()
    await inputs(wrapper).email.setValue(values.email)
    await inputs(wrapper).password.setValue(values.password)

    await wrapper.find('form').trigger('submit')

    expect(wrapper.find('[role="alert"]').text()).toBe(message)
    expect(auth.login).not.toHaveBeenCalled()
  })

  it('entra com o e-mail sem espacos e a senha como esta', async () => {
    const wrapper = await mountLogin()
    await inputs(wrapper).email.setValue('  ana@lab.local ')
    await inputs(wrapper).password.setValue(' senha com espaco ')

    await wrapper.find('form').trigger('submit')

    expect(auth.login).toHaveBeenCalledWith('ana@lab.local', ' senha com espaco ')
  })

  it('mostra "Aguarde..." enquanto entra', async () => {
    const pending = deferred()
    auth.login.mockReturnValue(pending.promise)
    const wrapper = await mountLogin()
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
    const wrapper = await mountLogin()
    await inputs(wrapper).email.setValue('ana@lab.local')
    await inputs(wrapper).password.setValue('errada')

    await wrapper.find('form').trigger('submit')
    await flushPromises()

    expect(wrapper.find('[role="alert"]').text()).toBe('E-mail ou senha invalidos')
  })
})

describe('cadastro', () => {
  it('alterna para o modo de cadastro', async () => {
    const wrapper = await mountLogin()

    await switchToRegister(wrapper)

    expect(wrapper.find('.lead').text()).toBe('Criar conta')
    expect(inputs(wrapper).username.exists()).toBe(true)
    expect(inputs(wrapper).password.attributes('autocomplete')).toBe('new-password')
    expect(wrapper.find('.note').text()).toBe('Novas contas têm acesso somente de visualização.')
    expect(wrapper.find('button.link').text()).toBe('Já tenho conta')
  })

  it('trocar de modo limpa o erro', async () => {
    const wrapper = await mountLogin()
    await wrapper.find('form').trigger('submit')
    expect(wrapper.find('[role="alert"]').exists()).toBe(true)

    await switchToRegister(wrapper)

    expect(wrapper.find('[role="alert"]').exists()).toBe(false)
  })

  it('nome de usuario obrigatorio', async () => {
    const wrapper = await mountLogin()
    await switchToRegister(wrapper)
    await inputs(wrapper).email.setValue('bia@lab.local')
    await inputs(wrapper).password.setValue('senha-forte')

    await wrapper.find('form').trigger('submit')

    expect(wrapper.find('[role="alert"]').text()).toBe('Informe o nome de usuário')
    expect(auth.register).not.toHaveBeenCalled()
  })

  it('cadastra com os campos limpos', async () => {
    const wrapper = await mountLogin()
    await switchToRegister(wrapper)
    await inputs(wrapper).username.setValue(' bia ')
    await inputs(wrapper).email.setValue(' bia@lab.local ')
    await inputs(wrapper).password.setValue('senha-forte')

    await wrapper.find('form').trigger('submit')

    expect(auth.register).toHaveBeenCalledWith('bia', 'bia@lab.local', 'senha-forte')
    expect(auth.login).not.toHaveBeenCalled()
  })

  it('senha curta no cadastro nao chama o backend', async () => {
    const wrapper = await mountLogin()
    await switchToRegister(wrapper)
    await inputs(wrapper).username.setValue('bia')
    await inputs(wrapper).email.setValue('bia@lab.local')
    await inputs(wrapper).password.setValue('1234567')

    await wrapper.find('form').trigger('submit')

    expect(wrapper.find('[role="alert"]').text()).toBe('A senha deve ter pelo menos 8 caracteres')
    expect(inputs(wrapper).password.attributes('minlength')).toBe('8')
    expect(auth.register).not.toHaveBeenCalled()
  })

  it('senha curta no login e aceita (a regra vale so para contas novas)', async () => {
    const wrapper = await mountLogin()
    await inputs(wrapper).email.setValue('ana@lab.local')
    await inputs(wrapper).password.setValue('123')

    await wrapper.find('form').trigger('submit')

    expect(auth.login).toHaveBeenCalledWith('ana@lab.local', '123')
    expect(inputs(wrapper).password.attributes('minlength')).toBeUndefined()
  })

  it('volta para o login', async () => {
    const wrapper = await mountLogin()
    await switchToRegister(wrapper)

    await wrapper.find('button.link').trigger('click')

    expect(wrapper.find('.primary').text()).toBe('Entrar')
  })
})

describe('cadastro desligado no backend', () => {
  it('esconde o botao "Criar conta"', async () => {
    auth.fetchAuthConfig.mockResolvedValue({ registrationEnabled: false })

    const wrapper = await mountLogin()

    expect(wrapper.find('button.link').exists()).toBe(false)
    expect(wrapper.find('.primary').text()).toBe('Entrar')
  })

  it('o botao so aparece depois que o backend confirma', async () => {
    const pending = deferred()
    auth.fetchAuthConfig.mockReturnValue(pending.promise)

    const wrapper = mount(LoginView)
    expect(wrapper.find('button.link').exists()).toBe(false)

    pending.resolve({ registrationEnabled: true })
    await flushPromises()
    expect(wrapper.find('button.link').exists()).toBe(true)
  })

  it('mostra o aviso de muitas tentativas vindo do backend', async () => {
    auth.login.mockRejectedValue(new Error('Muitas tentativas de login. Tente novamente em 15 min'))
    const wrapper = await mountLogin()
    await inputs(wrapper).email.setValue('ana@lab.local')
    await inputs(wrapper).password.setValue('errada')

    await wrapper.find('form').trigger('submit')
    await flushPromises()

    expect(wrapper.find('[role="alert"]').text()).toBe('Muitas tentativas de login. Tente novamente em 15 min')
  })
})
