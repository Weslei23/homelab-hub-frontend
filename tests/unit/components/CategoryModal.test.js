import { describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import CategoryModal from '@/components/CategoryModal.vue'
import { deferred } from '../helpers'

async function open(target, onSubmit = vi.fn().mockResolvedValue()) {
  const wrapper = mount(CategoryModal, { props: { target: null, onSubmit }, attachTo: document.body })
  await wrapper.setProps({ target })
  await flushPromises()
  return { wrapper, onSubmit }
}

const input = (wrapper) => wrapper.find('#cat-label')

describe('CategoryModal', () => {
  it('fechado nao renderiza nada', () => {
    expect(mount(CategoryModal, { props: { target: null, onSubmit: vi.fn() } }).find('form').exists()).toBe(false)
  })

  it('nova categoria comeca vazia e com foco no campo', async () => {
    const { wrapper } = await open({ mode: 'create' })

    expect(wrapper.find('h3').text()).toBe('Nova categoria')
    expect(input(wrapper).element.value).toBe('')
    expect(document.activeElement).toBe(input(wrapper).element)
    wrapper.unmount()
  })

  it('renomear preenche o nome atual', async () => {
    const { wrapper } = await open({ mode: 'edit', category: { id: 1, label: 'Infra' } })

    expect(wrapper.find('h3').text()).toBe('Renomear categoria')
    expect(input(wrapper).element.value).toBe('Infra')
    wrapper.unmount()
  })

  it('nome obrigatorio', async () => {
    const { wrapper, onSubmit } = await open({ mode: 'create' })
    await input(wrapper).setValue('   ')

    await wrapper.find('form').trigger('submit')

    expect(wrapper.find('.error').text()).toBe('Informe o nome da categoria')
    expect(onSubmit).not.toHaveBeenCalled()
    wrapper.unmount()
  })

  it('salva o nome sem espacos e fecha', async () => {
    const { wrapper, onSubmit } = await open({ mode: 'create' })
    await input(wrapper).setValue('  Jogos ')

    await wrapper.find('form').trigger('submit')
    await flushPromises()

    expect(onSubmit).toHaveBeenCalledWith('Jogos')
    expect(wrapper.emitted('close')).toHaveLength(1)
    wrapper.unmount()
  })

  it('mostra "Salvando..." e desabilita os botoes enquanto salva', async () => {
    const pending = deferred()
    const { wrapper } = await open({ mode: 'create' }, vi.fn(() => pending.promise))
    await input(wrapper).setValue('Jogos')

    await wrapper.find('form').trigger('submit')

    expect(wrapper.find('.primary').text()).toBe('Salvando...')
    expect(wrapper.find('.ghost').element.disabled).toBe(true)
    pending.resolve()
    await flushPromises()
    expect(wrapper.find('.primary').text()).toBe('Salvar')
    wrapper.unmount()
  })

  it('erro do servidor aparece e nao fecha', async () => {
    const { wrapper } = await open({ mode: 'create' }, vi.fn().mockRejectedValue(new Error('Erro ao salvar')))
    await input(wrapper).setValue('Jogos')

    await wrapper.find('form').trigger('submit')
    await flushPromises()

    expect(wrapper.find('.error').text()).toBe('Erro ao salvar')
    expect(wrapper.emitted('close')).toBeUndefined()
    wrapper.unmount()
  })

  it.each([
    ['Cancelar', (w) => w.find('.ghost').trigger('click')],
    ['clique fora', (w) => w.find('.backdrop').trigger('click')],
    ['Esc', (w) => w.find('.backdrop').trigger('keydown.esc')],
  ])('%s fecha', async (_nome, action) => {
    const { wrapper } = await open({ mode: 'create' })

    await action(wrapper)

    expect(wrapper.emitted('close')).toHaveLength(1)
    wrapper.unmount()
  })
})
