import { createLocalVue, shallowMount } from '@vue/test-utils'
import Vuex from 'vuex'
import Ad5xShell from '../Ad5xShell.vue'

const localVue = createLocalVue()
localVue.use(Vuex)

function createStore () {
  return new Vuex.Store({
    state: {}
  })
}

function mountShell (backendAvailable: boolean, emit = vi.fn()) {
  const componentSupport = vi.fn().mockReturnValue(backendAvailable)
  const wrapper = shallowMount(Ad5xShell, {
    localVue,
    store: createStore(),
    mocks: {
      $typedGetters: {
        'server/componentSupport': componentSupport
      },
      $socket: { emit }
    }
  })

  return { componentSupport, emit, wrapper }
}

describe('Ad5xShell', () => {
  it('is fail-safe and performs no AD5X RPC when the backend is absent', async () => {
    const { componentSupport, emit, wrapper } = mountShell(false)

    await wrapper.vm.$nextTick()

    expect(componentSupport).toHaveBeenCalledWith('plugins_ad5x')
    expect(wrapper.find('[data-test="backend-unavailable"]').exists()).toBe(true)
    expect(wrapper.find('[data-test="backend-status"]').text()).toBe('Unavailable')
    expect(wrapper.find('[data-test="api-status"]').text()).toBe('unavailable')
    expect(emit).not.toHaveBeenCalled()
  })

  it('uses the API boundary and renders received capabilities when mocked present', async () => {
    const emit = vi.fn().mockResolvedValue({ modules: ['diagnostic'] })
    const { wrapper } = mountShell(true, emit)

    await Promise.resolve()
    await wrapper.vm.$nextTick()

    expect(emit).toHaveBeenCalledWith('plugins_ad5x.get_capabilities')
    expect(wrapper.find('[data-test="backend-status"]').text()).toBe('Available')
    expect(wrapper.find('[data-test="api-status"]').text()).toBe('compatible')
    expect(wrapper.find('[data-test="capabilities-status"]').text()).toBe('Received')
  })
})
