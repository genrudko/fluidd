import { shallowMount } from '@vue/test-utils'
import type { Ad5xZCalibrationSnapshot } from '@/ad5x/api/types'
import ZCalibrationStatusCard from '../ZCalibrationStatusCard.vue'

function snapshot (): Ad5xZCalibrationSnapshot {
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
      capabilities: ['frontend_neutral_snapshot', 'read_only_reconciliation'],
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
          sources: {
            effective: 'invalid_until_z_homed',
            persistent_user: 'save_variables.variables.gcode_offsets.z'
          },
          missing_components: [],
          actual_effective: null,
          reported_homing_origin_z: 0,
          requested_slicer_z_offset: null,
          slicer_z_offset_effect: 'ignored_by_zmod_global_offset_path',
          rc_path: {
            mesh_test: 3,
            active_mesh_profile: 'auto',
            accepted_saved_check_flags: true
          }
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

describe('ZCalibrationStatusCard', () => {
  it('renders an unhomed standby state without claiming a false effective Z', () => {
    const wrapper = shallowMount(ZCalibrationStatusCard, {
      propsData: { snapshot: snapshot() }
    })

    expect(wrapper.find('z-calibration-actions-stub').exists()).toBe(true)
    expect(wrapper.find('z-calibration-actions-stub').attributes('preprintmode')).toBe('3')
    expect(wrapper.find('z-calibration-mesh-preview-stub').exists()).toBe(true)
    expect(wrapper.find('[data-test="z-ready-state"]').text()).toContain('Система Z-калибровки готова')
    expect(wrapper.find('[data-test="z-ready-state"]').text()).toContain('после homing Z')
    expect(wrapper.find('[data-test="z-effective-offset"]').text()).toBe('—')
    expect(wrapper.find('[data-test="z-auto-alignment"]').text()).toBe('0.000 mm')
    expect(wrapper.find('[data-test="z-persistent-user"]').text()).toBe('-0.016 mm')
    expect(wrapper.find('[data-test="z-klippy-state"]').text()).toContain('homing Z не выполнен')
    expect(wrapper.find('[data-test="z-preprint-state"]').text()).toBe('включена · saved mesh + Z-check')
    expect(wrapper.find('[data-test="z-provenance"]').text()).toBe('станет доступен после homing Z')
    expect(wrapper.find('[data-test="external-unknown-warning"]').exists()).toBe(false)
  })

  it('surfaces a real unexplained residual only when the effective Z is valid', () => {
    const payload = snapshot()
    payload.module.state.offset.effective = -0.006
    payload.module.state.offset.external_unknown = 0.01
    payload.module.state.offset.provenance_status = 'external_unknown'
    payload.module.state.provenance.status = 'external_unknown'
    payload.module.state.provenance.actual_effective = -0.006
    payload.module.state.runtime.homed_axes = 'xyz'
    payload.module.state.runtime.effective_valid = true

    const wrapper = shallowMount(ZCalibrationStatusCard, {
      propsData: { snapshot: payload }
    })

    expect(wrapper.find('[data-test="external-unknown-warning"]').text()).toContain('+0.010 mm')
    expect(wrapper.find('[data-test="external-unknown-warning"]').text()).toContain('не считается babystepping')
    expect(wrapper.find('[data-test="z-provenance"]').text()).toBe('есть необъяснённая составляющая')
  })

  it('shows a Z-Mod sentinel-normalized slicer state as not set', () => {
    const wrapper = shallowMount(ZCalibrationStatusCard, {
      propsData: { snapshot: snapshot() }
    })

    expect(wrapper.find('[data-test="z-slicer-offset"]').text()).toBe('не задан')
  })

  it('keeps technical policy identity in Advanced rather than the human summary', () => {
    const wrapper = shallowMount(ZCalibrationStatusCard, {
      propsData: { snapshot: snapshot() }
    })

    expect(wrapper.find('[data-test="z-hook-state"]').text()).toBe('активен')
    expect(wrapper.find('[data-test="z-motion-owner"]').text()).toBe('Z-Mod')
    expect(wrapper.find('[data-test="z-policy-id"]').text()).toBe('zcal-saved-check-v1-20260817')
  })

  it('renders the pre-print setting as disabled without treating the safety hook as broken', () => {
    const payload = snapshot()
    payload.module.state.provenance.rc_path = {
      ...payload.module.state.provenance.rc_path,
      mesh_test: 0,
      accepted_saved_check_flags: false
    }

    const wrapper = shallowMount(ZCalibrationStatusCard, {
      propsData: { snapshot: payload }
    })

    expect(wrapper.find('[data-test="z-ready-state"]').text()).toContain('выключена пользователем')
    expect(wrapper.find('[data-test="z-preprint-state"]').text()).toBe('выключена')
    expect(wrapper.find('[data-test="z-hook-state"]').text()).toBe('активен')
  })

  it('marks the state as requiring attention when frontend safety invariants are not met', () => {
    const payload = snapshot()
    payload.module.state.calibration.offset_write_enabled = true

    const wrapper = shallowMount(ZCalibrationStatusCard, {
      propsData: { snapshot: payload }
    })

    expect(wrapper.find('[data-test="z-ready-state"]').text()).toContain('требует внимания')
    expect(wrapper.find('[data-test="z-ready-state"]').text()).toContain('разрешена запись Z')
  })
})
