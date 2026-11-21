import { describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import CardModal from '@/components/CardModal.vue'
import { iconKeys } from '@/data/icons'
import { deferred } from '../helpers'

const existing = { id: 10, name: 'Proxmox', url: 'https://pve.local:8006', description: 'VMs', icon: 'proxmox' }

/** O formulario reage a troca de target (watch), entao monta fechado e abre em seguida. */
async function open(target, { onSubmit = vi.fn().mockResolvedValue(), onDelete = vi.fn().mockResolvedValue() } = {}) {
  const wrapper = mount(CardModal, { props: { target: null, onSubmit, onDelete }, attachTo: document.body })
  await wrapper.setProps({ target })
  await flushPromises()
  return { wrapper, onSubmit, onDelete }
}

const field = (wrapper, id) => wrapper.find(`#${id}`)

async function fill(wrapper, { name, url, description }) {
  if (name !== undefined) await field(wrapper, 'card-name').setValue(name)
  if (url !== undefined) await field(wrapper, 'card-url').setValue(url)
  if (description !== undefined) await field(wrapper, 'card-desc').setValue(description)
}

describe('abrir', () => {
  it('fechado nao renderiza nada', () => {
    const wrapper = mount(CardModal, { props: { target: null, onSubmit: vi.fn(), onDelete: vi.fn() } })

    expect(wrapper.find('form').exists()).toBe(false)
  })

  it('novo card comeca vazio e sem botao de excluir', async () => {
    const { wrapper } = await open({ mode: 'create', categoryId: 1 })

    expect(wrapper.find('h3').text()).toBe('Novo card')
    expect(field(wrapper, 'card-name').element.value).toBe('')
    expect(wrapper.find('.danger').exists()).toBe(false)
    expect(document.activeElement).toBe(field(wrapper, 'card-name').element)
    wrapper.unmount()
  })

  it('editar preenche os campos', async () => {
    const { wrapper } = await open({ mode: 'edit', card: existing })

    expect(wrapper.find('h3').text()).toBe('Editar Proxmox')
    expect(field(wrapper, 'card-name').element.value).toBe('Proxmox')
    expect(field(wrapper, 'card-url').element.value).toBe('https://pve.local:8006')
    expect(field(wrapper, 'card-desc').element.value).toBe('VMs')
    expect(field(wrapper, 'card-icon').element.value).toBe('proxmox')
    expect(wrapper.find('.danger').exists()).toBe(true)
    wrapper.unmount()
  })

  it('card sem link abre com a URL vazia e o foco nela', async () => {
    const { wrapper } = await open({ mode: 'edit', card: { ...existing, url: '#' } })

    expect(field(wrapper, 'card-url').element.value).toBe('')
    expect(document.activeElement).toBe(field(wrapper, 'card-url').element)
    wrapper.unmount()
  })

  it('icone que nao e chave conhecida vira URL personalizada', async () => {
    const { wrapper } = await open({ mode: 'edit', card: { ...existing, icon: 'https://cdn/x.png' } })

    expect(field(wrapper, 'card-icon').element.value).toBe('__custom')
    expect(wrapper.find('input[placeholder="https://exemplo.com/icone.png"]').element.value).toBe('https://cdn/x.png')
    wrapper.unmount()
  })

  it('lista todos os icones embutidos', async () => {
    const { wrapper } = await open({ mode: 'create', categoryId: 1 })

    const values = wrapper.findAll('#card-icon option').map((o) => o.element.value)
    expect(values).toEqual(['', ...iconKeys, '__custom'])
    wrapper.unmount()
  })
})

describe('validacao', () => {
  it.each([
    [{ name: '   ', url: 'https://x' }, 'Informe o nome do card'],
    [{ name: 'X', url: 'pve.local' }, 'Use uma URL começando com http:// ou https://'],
    [{ name: 'X', url: 'ftp://nas' }, 'Use uma URL começando com http:// ou https://'],
    [{ name: 'X', url: 'https://com espaco' }, 'Use uma URL começando com http:// ou https://'],
  ])('%o -> "%s"', async (values, message) => {
    const { wrapper, onSubmit } = await open({ mode: 'create', categoryId: 1 })
    await fill(wrapper, values)

    await wrapper.find('form').trigger('submit')

    expect(wrapper.find('.error').text()).toBe(message)
    expect(onSubmit).not.toHaveBeenCalled()
    wrapper.unmount()
  })

  it('icone personalizado precisa ser URL http(s)', async () => {
    const { wrapper, onSubmit } = await open({ mode: 'create', categoryId: 1 })
    await fill(wrapper, { name: 'X', url: 'https://x' })
    await field(wrapper, 'card-icon').setValue('__custom')
    await wrapper.find('input[placeholder="https://exemplo.com/icone.png"]').setValue('icone.png')

    await wrapper.find('form').trigger('submit')

    expect(wrapper.find('.error').text()).toBe('O ícone personalizado deve ser uma URL http:// ou https://')
    expect(onSubmit).not.toHaveBeenCalled()
    wrapper.unmount()
  })
})

describe('salvar', () => {
  it('envia os campos limpos e fecha', async () => {
    const { wrapper, onSubmit } = await open({ mode: 'create', categoryId: 1 })
    await fill(wrapper, { name: '  Jellyfin ', url: ' http://192.168.3.183:8096 ', description: '  ' })
    await field(wrapper, 'card-icon').setValue('jellyfin')

    await wrapper.find('form').trigger('submit')
    await flushPromises()

    expect(onSubmit).toHaveBeenCalledWith({
      name: 'Jellyfin',
      url: 'http://192.168.3.183:8096',
      description: null,
      icon: 'jellyfin',
    })
    expect(wrapper.emitted('close')).toHaveLength(1)
    wrapper.unmount()
  })

  it('icone automatico envia null', async () => {
    const { wrapper, onSubmit } = await open({ mode: 'create', categoryId: 1 })
    await fill(wrapper, { name: 'X', url: 'https://x' })

    await wrapper.find('form').trigger('submit')

    expect(onSubmit.mock.calls[0][0].icon).toBeNull()
    wrapper.unmount()
  })

  it('icone personalizado envia a URL', async () => {
    const { wrapper, onSubmit } = await open({ mode: 'create', categoryId: 1 })
    await fill(wrapper, { name: 'X', url: 'https://x' })
    await field(wrapper, 'card-icon').setValue('__custom')
    await wrapper.find('input[placeholder="https://exemplo.com/icone.png"]').setValue(' https://cdn/x.png ')

    await wrapper.find('form').trigger('submit')

    expect(onSubmit.mock.calls[0][0].icon).toBe('https://cdn/x.png')
    wrapper.unmount()
  })

  it('desabilita os botoes enquanto salva', async () => {
    const pending = deferred()
    const { wrapper } = await open({ mode: 'create', categoryId: 1 }, { onSubmit: vi.fn(() => pending.promise) })
    await fill(wrapper, { name: 'X', url: 'https://x' })

    await wrapper.find('form').trigger('submit')

    expect(wrapper.find('.primary').text()).toBe('Salvando...')
    expect(wrapper.findAll('button').every((b) => b.element.disabled)).toBe(true)

    pending.resolve()
    await flushPromises()
    expect(wrapper.emitted('close')).toHaveLength(1)
    wrapper.unmount()
  })

  it('erro do servidor aparece e o modal continua aberto', async () => {
    const onSubmit = vi.fn().mockRejectedValue(new Error('A URL e obrigatoria'))
    const { wrapper } = await open({ mode: 'create', categoryId: 1 }, { onSubmit })
    await fill(wrapper, { name: 'X', url: 'https://x' })

    await wrapper.find('form').trigger('submit')
    await flushPromises()

    expect(wrapper.find('.error').text()).toBe('A URL e obrigatoria')
    expect(wrapper.emitted('close')).toBeUndefined()
    expect(wrapper.find('.primary').element.disabled).toBe(false)
    wrapper.unmount()
  })

  it('reabrir limpa o erro anterior', async () => {
    const { wrapper } = await open({ mode: 'create', categoryId: 1 })
    await wrapper.find('form').trigger('submit')
    expect(wrapper.find('.error').exists()).toBe(true)

    await wrapper.setProps({ target: { mode: 'edit', card: existing } })
    await flushPromises()

    expect(wrapper.find('.error').exists()).toBe(false)
    wrapper.unmount()
  })
})

describe('excluir e fechar', () => {
  it('confirma antes de excluir', async () => {
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(true)
    const { wrapper, onDelete } = await open({ mode: 'edit', card: existing })

    await wrapper.find('.danger').trigger('click')
    await flushPromises()

    expect(confirm).toHaveBeenCalledWith('Excluir o card "Proxmox"?')
    expect(onDelete).toHaveBeenCalledOnce()
    expect(wrapper.emitted('close')).toHaveLength(1)
    wrapper.unmount()
  })

  it('cancelar a confirmacao nao exclui', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(false)
    const { wrapper, onDelete } = await open({ mode: 'edit', card: existing })

    await wrapper.find('.danger').trigger('click')

    expect(onDelete).not.toHaveBeenCalled()
    wrapper.unmount()
  })

  it('erro ao excluir aparece no modal', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true)
    const onDelete = vi.fn().mockRejectedValue(new Error('Card nao encontrado'))
    const { wrapper } = await open({ mode: 'edit', card: existing }, { onDelete })

    await wrapper.find('.danger').trigger('click')
    await flushPromises()

    expect(wrapper.find('.error').text()).toBe('Card nao encontrado')
    wrapper.unmount()
  })

  it.each([
    ['botao Cancelar', (w) => w.find('.ghost').trigger('click')],
    ['clique fora do modal', (w) => w.find('.backdrop').trigger('click')],
    ['tecla Esc', (w) => w.find('.backdrop').trigger('keydown.esc')],
  ])('%s fecha', async (_nome, action) => {
    const { wrapper } = await open({ mode: 'create', categoryId: 1 })

    await action(wrapper)

    expect(wrapper.emitted('close')).toHaveLength(1)
    wrapper.unmount()
  })

  it('clique dentro do formulario nao fecha', async () => {
    const { wrapper } = await open({ mode: 'create', categoryId: 1 })

    await wrapper.find('form').trigger('click')

    expect(wrapper.emitted('close')).toBeUndefined()
    wrapper.unmount()
  })
})
