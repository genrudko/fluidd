import { shallowMount } from '@vue/test-utils'
import ZCalibrationStatusCard from '../ZCalibrationStatusCard.vue'

function snapshot () {
  return {
    api_version: '1.0' as const,
    module_version: '0.1.2',
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
          external_unknown: 0.016,
          known_total: -0.016,
          effective: 0,
          provenance_status: 'external_unknown'
        },
        provenance: {
          status: 'external_unknown',
          model: 'zmod-saved-check-observer-v1',
          sources: {
            effective: 'gcode_move.homing_origin.z',
            persistent_user: 'save_variables.variables.gcode_offsets.z'
          },
          missing_components: [],
          actual_effective: 0,
          requested_slicer_z_offset: 99,
          slicer_z_offset_effect: 'ignored_by_zmod_global_offset_path',
          rc_path: {
            accepted_saved_check_flags: true
          }
        },
        job: {
          phase: 'standby',
          requested_slicer_z_offset: 99,
          slicer_z_offset_effect: 'ignored_by_zmod_global_offset_path'
        },
        runtime: {
          klippy: 'ready',
          print_state: 'standby',
          homed_axes: ''
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
  it('renders a human safe-state summary from the standalone backend contract', () => {
    const wrapper = shallowMount(ZCalibrationStatusCard, {
      propsData: { snapshot: snapshot() }
    })

    expect(wrapper.find('[data-test="z-ready-state"]').text()).toContain('Калибровка готова к работе')
    expect(wrapper.find('[data-test="z-effective-offset"]').text()).toBe('0.000 mm')
    expect(wrapper.find('[data-test="z-auto-alignment"]').text()).toBe('0.000 mm')
    expect(wrapper.find('[data-test="z-persistent-user"]').text()).toBe('-0.016 mm')
    expect(wrapper.find('[data-test="z-motion-owner"]').text()).toBe('zmod')
    expect(wrapper.find('[data-test="z-write-gate"]').text()).toBe('запрещена')
    expect(wrapper.find('[data-test="z-motion-actions"]').text()).toBe('запрещены')
    expect(wrapper.find('[data-test="z-policy-id"]').text()).toBe('zcal-saved-check-v1-20260817')
  })

  it('surfaces the unexplained residual without fabricating babystepping', () => {
    const wrapper = shallowMount(ZCalibrationStatusCard, {
      propsData: { snapshot: snapshot() }
    })

    expect(wrapper.find('[data-test="external-unknown-warning"]').text()).toContain('+0.016 mm')
    expect(wrapper.find('[data-test="external-unknown-warning"]').text()).toContain('не считается babystepping')
    expect(wrapper.find('[data-test="z-provenance"]').text()).toContain('external_unknown')
  })

  it('explains that the requested slicer Z offset is ignored on the proven Z-Mod path', () => {
    const wrapper = shallowMount(ZCalibrationStatusCard, {
      propsData: { snapshot: snapshot() }
    })

    expect(wrapper.find('[data-test="z-slicer-offset"]').text()).toContain('+99.000 mm')
    expect(wrapper.find('[data-test="z-slicer-offset"]').text()).toContain('игнорируется')
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
