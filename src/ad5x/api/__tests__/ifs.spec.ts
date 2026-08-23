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
          active_slot: 1,
          slots: [slot()],
          filament_at_toolhead: true,
          print_state: 'standby',
          operation: { state: 'idle', action: '', slot: 0, error: '' },
          capabilities: {},
          write_blocked_reason: '',
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
