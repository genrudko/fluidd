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

function sharedSnapshot () {
  return {
    api_version: '1.0',
    backend_version: '0.1.6',
    revision: 4,
    backend: { health: 'ok' },
    modules: { ifs: {} }
  }
}

function zSnapshot () {
  return {
    api_version: '1.0',
    module_version: '0.1.3',
    revision: 8,
    module: {
      schema_version: '1.1',
      support: 'supported',
      enabled: true,
      presence: 'present',
      available: true,
      health: 'ok',
      capabilities: ['frontend_neutral_snapshot'],
      state: {
        calibration: {
          state: 'observer',
          motion_actions_enabled: false,
          motion_owner: 'zmod',
          offset_hook_enabled: true,
          offset_hook_status: 'loaded',
          offset_write_enabled: false,
          integration: {
            policy_status: 'loaded',
            policy_id: 'zcal-saved-check-v1-20260817',
            hook_commands: ['CC_APPLY_PROFILE', '_AD5X_Z_SAVED_CHECK_POLICY']
          }
        },
        offset: {
          auto_alignment: 0,
          persistent_user: -0.016,
          slicer_job: 0,
          live_adjustment: 0,
          external_unknown: 0,
          known_total: -0.016,
          effective: null,
          provenance_status: 'not_homed'
        },
        provenance: {
          status: 'not_homed',
          model: 'zmod-saved-check-observer-v1',
          sources: { effective: 'invalid_until_z_homed' },
          missing_components: [],
          actual_effective: null,
          reported_homing_origin_z: 0,
          requested_slicer_z_offset: null,
          slicer_z_offset_effect: 'ignored_by_zmod_global_offset_path',
          rc_path: { accepted_saved_check_flags: true }
        },
        job: {
          phase: 'standby',
          requested_slicer_z_offset: null,
          slicer_z_offset_effect: 'ignored_by_zmod_global_offset_path'
        },
        runtime: {
          klippy: 'ready',
          print_state: 'standby',
          homed_axes: '',
          effective_valid: false
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

function mountShell (
  supported: readonly string[],
  emit = vi.fn()
) {
  const componentSupport = vi.fn((component: string) => supported.includes(component))
  const wrapper = shallowMount(Ad5xShell, {
    localVue,
    store: createStore(componentSupport),
    mocks: {
      $socket: { emit }
    }
  })

  return { componentSupport, emit, wrapper }
}

async function flushCreated (wrapper: ReturnType<typeof shallowMount>) {
  await Promise.resolve()
  await Promise.resolve()
  await wrapper.vm.$nextTick()
}

describe('Ad5xShell', () => {
  it('is fail-safe and performs no AD5X RPC when every backend is absent', async () => {
    const { componentSupport, emit, wrapper } = mountShell([])

    await flushCreated(wrapper)

    expect(componentSupport).toHaveBeenCalledWith('plugins_ad5x')
    expect(componentSupport).toHaveBeenCalledWith('plugins_ad5x_zcal')
    expect(wrapper.find('[data-test="backend-unavailable"]').exists()).toBe(true)
    expect(emit).not.toHaveBeenCalled()
  })

  it('renders Calibration Center when only the standalone Z backend is present', async () => {
    const emit = vi.fn(async (method: string) => {
      if (method === 'server.plugins_ad5x.z_calibration.snapshot') return zSnapshot()
      throw new Error(`unexpected RPC ${method}`)
    })
    const { wrapper } = mountShell(['plugins_ad5x_zcal'], emit)

    await flushCreated(wrapper)

    expect(emit).toHaveBeenCalledWith('server.plugins_ad5x.z_calibration.snapshot')
    expect(emit).not.toHaveBeenCalledWith('server.plugins_ad5x.snapshot')
    expect(wrapper.find('z-calibration-status-card-stub').exists()).toBe(true)
    expect(wrapper.find('[data-test="backend-status"]').text()).toBe('Unavailable')
    expect(wrapper.find('[data-test="z-component-status"]').text()).toBe('Available')
    expect(wrapper.find('[data-test="z-api-status"]').text()).toBe('compatible')
  })

  it('keeps shared IFS API and standalone Z API independent when both are present', async () => {
    const emit = vi.fn(async (method: string) => {
      if (method === 'server.plugins_ad5x.snapshot') return sharedSnapshot()
      if (method === 'server.plugins_ad5x.z_calibration.snapshot') return zSnapshot()
      throw new Error(`unexpected RPC ${method}`)
    })
    const { wrapper } = mountShell(['plugins_ad5x', 'plugins_ad5x_zcal'], emit)

    await flushCreated(wrapper)

    expect(emit).toHaveBeenCalledWith('server.plugins_ad5x.snapshot')
    expect(emit).toHaveBeenCalledWith('server.plugins_ad5x.z_calibration.snapshot')
    expect(wrapper.find('[data-test="backend-version"]').text()).toBe('0.1.6')
    expect(wrapper.find('[data-test="z-api-status"]').text()).toBe('compatible')
    expect(wrapper.find('z-calibration-status-card-stub').exists()).toBe(true)
  })

  it('surfaces standalone Z API failure without breaking the shared backend', async () => {
    const emit = vi.fn(async (method: string) => {
      if (method === 'server.plugins_ad5x.snapshot') return sharedSnapshot()
      if (method === 'server.plugins_ad5x.z_calibration.snapshot') throw new Error('z snapshot failed')
      throw new Error(`unexpected RPC ${method}`)
    })
    const { wrapper } = mountShell(['plugins_ad5x', 'plugins_ad5x_zcal'], emit)

    await flushCreated(wrapper)

    expect(wrapper.find('[data-test="z-calibration-error"]').text()).toContain('z snapshot failed')
    expect(wrapper.find('[data-test="api-status"]').text()).toBe('compatible')
    expect(wrapper.find('z-calibration-status-card-stub').exists()).toBe(false)
  })
})
