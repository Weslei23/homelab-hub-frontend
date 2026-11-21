import { describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { ref } from 'vue'

const isAuthenticated = ref(false)
vi.mock('@/data/useAuth', () => ({ isAuthenticated }))

const { default: App } = await import('@/App.vue')

const stubs = { LoginView: { template: '<p class="login-stub" />' }, Dashboard: { template: '<p class="dashboard-stub" />' }, Sidebar: { template: '<p class="sidebar-stub" />', emits: ['close'] } }

describe('App', () => {
  it('deslogado mostra a tela de login', () => {
    isAuthenticated.value = false
    const wrapper = mount(App, { global: { stubs } })

    expect(wrapper.find('.login-stub').exists()).toBe(true)
    expect(wrapper.find('.dashboard-stub').exists()).toBe(false)
  })

  it('logado mostra o dashboard e a barra lateral', () => {
    isAuthenticated.value = true
    const wrapper = mount(App, { global: { stubs } })

    expect(wrapper.find('.login-stub').exists()).toBe(false)
    expect(wrapper.find('.dashboard-stub').exists()).toBe(true)
    expect(wrapper.find('.sidebar-stub').exists()).toBe(true)
  })

  it('troca para o dashboard assim que o login acontece', async () => {
    isAuthenticated.value = false
    const wrapper = mount(App, { global: { stubs } })

    isAuthenticated.value = true
    await wrapper.vm.$nextTick()

    expect(wrapper.find('.dashboard-stub').exists()).toBe(true)
  })

  it('menu do celular abre e fecha a barra lateral', async () => {
    isAuthenticated.value = true
    const wrapper = mount(App, { global: { stubs } })
    const wrapperEl = () => wrapper.find('.sidebar-wrapper')
    expect(wrapperEl().classes()).not.toContain('open')

    await wrapper.find('.menu-btn').trigger('click')
    expect(wrapperEl().classes()).toContain('open')
    expect(wrapper.find('.overlay').exists()).toBe(true)

    await wrapper.find('.overlay').trigger('click')
    expect(wrapperEl().classes()).not.toContain('open')
    expect(wrapper.find('.overlay').exists()).toBe(false)
  })

  it('fechar pela barra lateral tambem fecha o menu', async () => {
    isAuthenticated.value = true
    const wrapper = mount(App, { global: { stubs } })
    await wrapper.find('.menu-btn').trigger('click')

    await wrapper.findComponent(stubs.Sidebar).vm.$emit('close')

    expect(wrapper.find('.sidebar-wrapper').classes()).not.toContain('open')
  })
})
