import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import type { Ad5xIfsSlot } from '@/ad5x/api/ifs'
import { getIfsDashboardSlots } from '../ifsDashboard'

const cardSource = readFileSync(resolve(process.cwd(), 'src/ad5x/components/Ad5xIfsDashboardCard.vue'), 'utf8')
const dashboardSource = readFileSync(resolve(process.cwd(), 'src/views/Dashboard.vue'), 'utf8')
const layoutSource = readFileSync(resolve(process.cwd(), 'src/store/layout/state.ts'), 'utf8')

function slot (overrides: Partial<Ad5xIfsSlot> = {}): Ad5xIfsSlot {
  return {
    slot: 1,
    present: true,
    active: false,
    stall: false,
    material: 'PLA',
    color: '#AA0000',
    spool: {
      source: 'spoolman',
      brand: 'Test',
      series: '',
      name: 'Rich spool',
      material: 'PLA',
      variant: '',
      spoolman_id: 7,
      spoolman_spool_id: 7,
      spoolman_filament_id: 9,
      remaining_g: 250,
      remaining_length_mm: null,
      initial_g: 1000,
      used_g: 750,
      used_length_mm: null,
      location: '',
      archived: false,
      nozzle_temp: null,
      bed_temp: null,
      orca_material: '',
      orca_filament_id: '',
      orca_setting_id: ''
    },
    appearance: { color_mode: 'solid', colors: ['#AA0000'], finish: '' },
    metadata_status: 'assigned',
    current_identity_status: 'assigned',
    stale_metadata_available: false,
    permissions: { select_slot: true, load_slot: true, unload_slot: false, blocked_reason: '' },
    compatibility: {
      zmod: {
        slot: 1,
        current: { material: 'PETG', color: '#112233' },
        desired: { material: 'PLA', color: '#AA0000' },
        sync_state: 'diverged',
        write_ready: true,
        lossy: false,
        omitted_fields: [],
        write_blockers: []
      }
    },
    ...overrides
  }
}

describe('Ad5xIfsDashboardCard', () => {
  it('is wired into the native dashboard layout and opens the full IFS manager', () => {
    expect(cardSource).toContain('layout-path="dashboard.ad5x-ifs-dashboard-card"')
    expect(cardSource).toContain("name: 'ad5x-materials'")
    expect(dashboardSource).toContain("import Ad5xIfsDashboardCard from '@/ad5x/components/Ad5xIfsDashboardCard.vue'")
    expect(dashboardSource).toContain("item.id === 'ad5x-ifs-dashboard-card'")
    expect(layoutSource).toContain("{ id: 'ad5x-ifs-dashboard-card', enabled: true, collapsed: false }")
  })

  it('keeps the compact dashboard read-only', () => {
    expect(cardSource).not.toContain('performIfsAction')
    expect(cardSource).not.toContain('updateIfsProviderIdentity')
    expect(cardSource).not.toContain('updateIfsMetadata')
    expect(cardSource).not.toContain('CHANGE_ZCOLOR')
    expect(cardSource).not.toContain('ANALOG_PRUTOK')
  })

  it('uses provider current identity before rich spool metadata', () => {
    const view = getIfsDashboardSlots([slot()])[0]
    expect(view.material).toBe('PETG')
    expect(view.color).toBe('#112233')
    expect(view.remainingG).toBe(250)
    expect(view.remainingPercent).toBe(25)
  })

  it('makes physical absence authoritative and fills the four-slot topology', () => {
    const views = getIfsDashboardSlots([slot({ present: false, active: true, stale_metadata_available: true })])
    expect(views.map(view => view.slot)).toEqual([1, 2, 3, 4])
    expect(views[0]).toMatchObject({ present: false, active: false, material: '', name: '', remainingG: null, remainingPercent: null })
    expect(views[0].color).toBe('#78909C')
  })
})
