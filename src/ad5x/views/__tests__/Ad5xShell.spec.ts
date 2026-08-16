import { createLocalVue, shallowMount } from '@vue/test-utils'
import Vuex from 'vuex'
import Ad5xShell from '../Ad5xShell.vue'

const localVue = createLocalVue()
localVue.use(Vuex)

function createStore (componentSupport: ReturnType<typeof vi.fn>) {
  return new Vuex.Store({
    state: {},
    modules: {
      server: {
        namespaced: true,
        getters: {
          componentSupport: () => componentSupport
        }
      }
    }
  })
}

function snapshot () {
  return {
    api_version: '1.0',
    backend_version: '0.1.2',
    revision: 4,
    backend: { health: 'ok' },
    modules: {
      z_calibration: {
        schema_version: '1.0',
        support: 'supported',
        enabled: true,
        presence: 'present',
        available: true,
        health: 'ok',
        capabilities: [],
        state: {
          calibration: {
            state: 'idle',
            motion_actions_enabled: false,
            offset_hook_enabled: true,
            offset_hook_status: 'loaded',
            offset_write_enabled: false
          },
          offset: {
            auto_alignment: 0,
            persistent_user: 0,
            slicer_job: 0,
            live_adjustment: 0,
            external_unknown: 0,
            known_total: 0,
            effective: 0,
            provenance_status: 'reconciled'
          },
          job: {
            phase: 'idle',
            mode: null,
            source_z_offset: null,
            baseline_effective: null,
            applied_target: null
          },
          runtime: {
            klippy: 'ready',
            print_state: 'standby',
            homed_axes: 'xyz'
          },
          safety: {
            fail_closed: true,
            h7_role: 'secondary',
            last_error: null
          }
        }
      }
    }
  }
}

function mountShell (backendAvailable: boolean, emit = vi.fn()) {
  const componentSupport = vi.fn().mockReturnValue(backendAvailable)
  const wrapper = shallowMount(Ad5xShell, {
    localVue,
    store: createStore(componentSupport),
    mocks: {
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
    expect(wrapper.find('[data-test="snapshot-status"]').text()).toBe('Unavailable')
    expect(emit).not.toHaveBeenCalled()
  })

  it('uses the canonical snapshot boundary and renders the read-only Z card', async () => {
    const emit = vi.fn().mockResolvedValue(snapshot())
    const { wrapper } = mountShell(true, emit)

    await Promise.resolve()
    await wrapper.vm.$nextTick()

    expect(emit).toHaveBeenCalledWith('server.plugins_ad5x.snapshot')
    expect(wrapper.find('[data-test="backend-status"]').text()).toBe('Available')
    expect(wrapper.find('[data-test="api-status"]').text()).toBe('compatible')
    expect(wrapper.find('[data-test="snapshot-status"]').text()).toBe('Received')
    expect(wrapper.find('[data-test="backend-version"]').text()).toBe('0.1.2')
    expect(wrapper.find('z-calibration-status-card-stub').exists()).toBe(true)
  })

  it('shows API errors without rendering the calibration card', async () => {
    const emit = vi.fn().mockRejectedValue(new Error('snapshot failed'))
    const { wrapper } = mountShell(true, emit)

    await Promise.resolve()
    await wrapper.vm.$nextTick()

    expect(wrapper.find('[data-test="api-status"]').text()).toBe('error')
    expect(wrapper.find('[data-test="snapshot-status"]').text()).toBe('Error')
    expect(wrapper.find('[data-test="api-error"]').text()).toContain('snapshot failed')
    expect(wrapper.find('z-calibration-status-card-stub').exists()).toBe(false)
  })
})
