import { shallowMount } from '@vue/test-utils'
import ZCalibrationStatusCard from '../ZCalibrationStatusCard.vue'

function snapshot (
  overrides: Record<string, unknown> = {}
) {
  const zCalibration = {
    schema_version: '1.0',
    support: 'supported',
    enabled: true,
    presence: 'present',
    available: true,
    health: 'ok',
    capabilities: [
      'effective_offset_reconciliation',
      'runtime_hook_detection'
    ],
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
        effective: -0.13,
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
    },
    ...overrides
  }

  return {
    api_version: '1.0' as const,
    backend_version: '0.1.2',
    revision: 8,
    backend: { health: 'ok' },
    modules: { z_calibration: zCalibration }
  }
}

describe('ZCalibrationStatusCard', () => {
  it('renders backend-owned safety and lifecycle state without actions', () => {
    const wrapper = shallowMount(ZCalibrationStatusCard, {
      propsData: { snapshot: snapshot() }
    })

    expect(wrapper.find('[data-test="z-module-health"]').text()).toContain('ok / available')
    expect(wrapper.find('[data-test="z-klippy-state"]').text()).toContain('ready / standby')
    expect(wrapper.find('[data-test="z-hook-state"]').text()).toBe('Loaded')
    expect(wrapper.find('[data-test="z-write-gate"]').text()).toBe('Disabled')
    expect(wrapper.find('[data-test="z-motion-actions"]').text()).toBe('Disabled')
    expect(wrapper.find('[data-test="z-effective-offset"]').text()).toBe('-0.130 mm')
    expect(wrapper.find('[data-test="z-provenance"]').text()).toBe('reconciled')
    expect(wrapper.find('[data-test="z-safety-state"]').text()).toContain('fail-closed')
    expect(wrapper.find('button').exists()).toBe(false)
  })

  it('surfaces an unexplained standard Klipper offset component', () => {
    const payload = snapshot()
    const module = payload.modules.z_calibration as any
    module.state.offset.external_unknown = 0.04
    module.state.offset.effective = 0.04
    module.state.offset.provenance_status = 'external_unknown'

    const wrapper = shallowMount(ZCalibrationStatusCard, {
      propsData: { snapshot: payload }
    })

    expect(wrapper.find('[data-test="external-unknown-warning"]').text()).toContain('0.040 mm')
    expect(wrapper.find('[data-test="z-provenance"]').text()).toBe('external_unknown')
  })

  it('fails safely when the Z Calibration module is absent', () => {
    const payload = {
      ...snapshot(),
      modules: {}
    }

    const wrapper = shallowMount(ZCalibrationStatusCard, {
      propsData: { snapshot: payload }
    })

    expect(wrapper.find('[data-test="z-calibration-unavailable"]').exists()).toBe(true)
    expect(wrapper.find('[data-test="z-write-gate"]').exists()).toBe(false)
  })

  it('fails safely when the Z Calibration module shape is incompatible', () => {
    const payload = snapshot({ state: { calibration: {} } })

    const wrapper = shallowMount(ZCalibrationStatusCard, {
      propsData: { snapshot: payload }
    })

    expect(wrapper.find('[data-test="z-calibration-unavailable"]').exists()).toBe(true)
  })
})
