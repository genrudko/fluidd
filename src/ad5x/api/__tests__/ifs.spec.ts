import type { Ad5xIfsSlot } from '../ifs'
import { getIfsModule, getIfsPrimaryColor, getIfsRemainingPercent } from '../ifs'

function spool () {
  return {
    source: 'spoolman',
    brand: 'Test',
    series: '',
    name: 'PETG Black',
    material: 'PETG',
    variant: '',
    spoolman_id: 42,
    spoolman_spool_id: 42,
    spoolman_filament_id: 7,
    remaining_g: 500,
    remaining_length_mm: null,
    initial_g: 1000,
    used_g: 500,
    used_length_mm: null,
    location: '',
    archived: false,
    nozzle_temp: 240,
    bed_temp: 70,
    orca_material: 'PETG',
    orca_filament_id: '',
    orca_setting_id: ''
  }
}

function slot (): Ad5xIfsSlot {
  return {
    slot: 1,
    present: true,
    active: true,
    stall: false,
    spool: spool(),
    appearance: { color_mode: 'solid', colors: ['#112233'], finish: 'standard' },
    metadata_status: 'assigned',
    current_identity_status: 'assigned',
    stale_metadata_available: false,
    permissions: { select_slot: false, load_slot: false, unload_slot: true, blocked_reason: '' }
  }
}

describe('AD5X IFS frontend contract', () => {
  it('extracts the normalized IFS module from the shared snapshot', () => {
    const snapshot = {
      api_version: '1.0' as const,
      backend_version: '0.2.0',
      revision: 12,
      backend: { health: 'ok' },
      modules: {
        ifs: {
          state: 'ready',
          state_code: 5,
          active_slot: 1,
          slots: [slot()],
          filament_at_toolhead: true,
          print_state: 'standby',
          operation: { state: 'idle', action: '', slot: 0, error: '' },
          capabilities: {},
          write_blocked_reason: '',
          preprint_plan: {
            available: true,
            source: 'zmod',
            filename: 'demo.gcode',
            status: 'ready',
            rows: [{
              tool: 0,
              requirement: { material: 'PETG', color: '#112233' },
              assignment: { slot: 1, present: true, metadata_status: 'assigned', spool: {}, appearance: {} },
              state: 'ready'
            }],
            warnings: [],
            summary: { required_tools: 1, assigned_tools: 1, ready_tools: 1 },
            auto_assign: {},
            messages: [],
            error: ''
          },
          diagnostics: {
            silk_mask: 5,
            raw_channel: 3,
            insert_slot: 2,
            need_insert: true,
            stall_mask: 10,
            runtime_active_slot: 1
          },
          recovery: {
            provider: 'zmod',
            read_only: true,
            execution_enabled: false,
            hardware_accepted: false,
            status: 'driver_error',
            evidence: { module_state: 'ready', state_code: 127, driver_error: true, need_insert: false, insert_slot: 0 },
            primitives: [{ id: 'reset_driver', provider_command: 'IFS_F15', scope: 'driver', source_verified: true, execution_enabled: false, hardware_accepted: false }],
            provider_sequences: { driver_error_retry: ['IFS_F15'], timeout_cleanup: ['IFS_F112', 'IFS_F18'] }
          },
          equivalent_spool: {
            provider: 'zmod',
            provider_command: 'ANALOG_PRUTOK',
            automatic_transition_enabled: false,
            transition_hardware_accepted: false,
            source_slot: 1,
            candidates: [{ slot: 2, present: true, material: 'PETG', color: '#112233', eligible: true, blockers: [] }],
            eligible_slots: [2],
            next_slot: 2,
            status: 'available',
            reason: ''
          },
          topology: {
            kind: 'selector_single_extruder',
            ifs_slot_count: 4,
            external_source: { id: 'external:bypass', kind: 'manual_bypass', modeled: true, runtime_supported: false, control_supported: false }
          },
          interoperability: {
            orca_lane_data: { namespace: 'lane_data', enabled: true, direction: 'printer_to_orca', publishable: true, record_count: 4, conflicts: [], fingerprint: 'abc', requires_moonraker_agent: true, target_version: '2.4.2', state: 'in_sync', error: '' }
          },
          spoolman: {
            configured: true,
            connected: true,
            library_available: true,
            binding_supported: true,
            consumption_tracking_supported: true,
            active_spool_id: 42,
            expected_active_spool_id: 42,
            expected_active_slot: 1,
            tracking_slot: 1,
            tracking_spool_id: 42,
            bindings: [],
            error: ''
          }
        }
      }
    }

    expect(getIfsModule(snapshot)?.active_slot).toBe(1)
    expect(getIfsModule(snapshot)?.slots[0].spool.spoolman_spool_id).toBe(42)
    expect(getIfsModule(snapshot)?.preprint_plan.rows[0].assignment?.slot).toBe(1)
    expect(getIfsModule(snapshot)?.topology?.external_source.id).toBe('external:bypass')
    expect(getIfsModule(snapshot)?.interoperability?.orca_lane_data.state).toBe('in_sync')
    expect(getIfsModule(snapshot)?.equivalent_spool?.next_slot).toBe(2)
    expect(getIfsModule(snapshot)?.diagnostics?.stall_mask).toBe(10)
    expect(getIfsModule(snapshot)?.recovery?.execution_enabled).toBe(false)
    expect(getIfsModule(snapshot)?.recovery?.primitives[0].provider_command).toBe('IFS_F15')
  })

  it('derives display color and remaining percentage from canonical metadata', () => {
    const item = slot()
    expect(getIfsPrimaryColor(item)).toBe('#112233')
    expect(getIfsRemainingPercent(item)).toBe(50)
  })

  it('returns null for an incompatible IFS module instead of guessing fields', () => {
    const snapshot = {
      api_version: '1.0' as const,
      backend_version: '0.1.0',
      revision: 1,
      backend: { health: 'ok' },
      modules: { ifs: { state: 'ready', slots: [] } }
    }

    expect(getIfsModule(snapshot)).toBeNull()
  })
})
