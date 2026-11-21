import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { defineComponent, h } from 'vue'
import { flushPromises, mount } from '@vue/test-utils'

vi.mock('@/data/catalogApi')

let api
let useStatus

/** Componente minimo que usa o composable, para exercitar onMounted/onUnmounted. */
function mountWithStatus() {
  let exposed
  const wrapper = mount(
    defineComponent({
      setup() {
        exposed = useStatus()
        return () => h('div')
      },
    })
  )
  return { wrapper, ...exposed }
}

beforeEach(async () => {
  vi.useFakeTimers()
  vi.resetModules()
  api = await import('@/data/catalogApi')
  ;({ useStatus } = await import('@/data/useStatus'))
  api.fetchStatus.mockResolvedValue({ 1: { state: 'UP', latencyMs: 12 } })
})

afterEach(() => {
  vi.useRealTimers()
})

describe('useStatus', () => {
  it('busca o status ao montar', async () => {
    const { statuses } = mountWithStatus()
    await flushPromises()

    expect(api.fetchStatus).toHaveBeenCalledOnce()
    expect(statuses.value).toEqual({ 1: { state: 'UP', latencyMs: 12 } })
  })

  it('atualiza a cada 30 segundos', async () => {
    mountWithStatus()
    await flushPromises()

    await vi.advanceTimersByTimeAsync(29_999)
    expect(api.fetchStatus).toHaveBeenCalledTimes(1)

    await vi.advanceTimersByTimeAsync(1)
    expect(api.fetchStatus).toHaveBeenCalledTimes(2)

    await vi.advanceTimersByTimeAsync(60_000)
    expect(api.fetchStatus).toHaveBeenCalledTimes(4)
  })

  it('para de atualizar ao desmontar', async () => {
    const { wrapper } = mountWithStatus()
    await flushPromises()

    wrapper.unmount()
    await vi.advanceTimersByTimeAsync(120_000)

    expect(api.fetchStatus).toHaveBeenCalledOnce()
  })

  it('erro limpa os indicadores em vez de mostrar tudo offline', async () => {
    const { statuses } = mountWithStatus()
    await flushPromises()
    expect(statuses.value).not.toEqual({})

    api.fetchStatus.mockRejectedValueOnce(new Error('Failed to fetch'))
    await vi.advanceTimersByTimeAsync(30_000)

    expect(statuses.value).toEqual({})
  })

  it('refreshStatus busca na hora', async () => {
    const { refreshStatus } = mountWithStatus()
    await flushPromises()

    await refreshStatus()

    expect(api.fetchStatus).toHaveBeenCalledTimes(2)
  })

  it('status e compartilhado entre componentes', async () => {
    const a = mountWithStatus()
    const b = mountWithStatus()
    await flushPromises()

    expect(a.statuses).toBe(b.statuses)
  })
})
