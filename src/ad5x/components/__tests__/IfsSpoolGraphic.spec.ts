import { mount } from '@vue/test-utils'
import type { Ad5xIfsSlot } from '@/ad5x/api/ifs'
import IfsSpoolGraphic from '../IfsSpoolGraphic.vue'

function slot (overrides: Partial<Ad5xIfsSlot> = {}): Ad5xIfsSlot {
  return {
    slot: 2,
    present: true,
    active: false,
    stall: false,
    spool: {
      source: 'spoolman',
      brand: '',
      series: '',
      name: '',
      material: 'PLA',
      variant: '',
      spoolman_id: 5,
      spoolman_spool_id: 5,
      spoolman_filament_id: 9,
      remaining_g: 250,
      remaining_length_mm: null,
      initial_g: 1000,
      used_g: 750,
      used_length_mm: null,
      location: '',
      archived: false,
      nozzle_temp: 220,
      bed_temp: 60,
      orca_material: 'PLA',
      orca_filament_id: '',
      orca_setting_id: ''
    },
    appearance: { color_mode: 'dual', colors: ['#FF0000', '#0000FF'], finish: 'silk' },
    metadata_status: 'assigned',
    current_identity_status: 'assigned',
    stale_metadata_available: false,
    permissions: { select_slot: true, load_slot: true, unload_slot: false, blocked_reason: '' },
    ...overrides
  }
}

describe('IfsSpoolGraphic', () => {
  it('renders live filament colors and remaining percentage', () => {
    const wrapper = mount(IfsSpoolGraphic, { propsData: { slotData: slot() } })
    const stops = wrapper.findAll('stop')

    expect(stops.length).toBe(4)
    expect(stops.at(0).attributes('stop-color')).toBe('#FF0000')
    expect(stops.at(3).attributes('stop-color')).toBe('#0000FF')
    expect(wrapper.get('[data-test="ifs-spool-percent"]').text()).toBe('25%')
  })

  it('renders a genuinely empty spool when physical presence is false', () => {
    const wrapper = mount(IfsSpoolGraphic, { propsData: { slotData: slot({ present: false }) } })

    expect(wrapper.find('[data-test="ifs-spool-filament"]').exists()).toBe(false)
    expect(wrapper.get('[data-test="ifs-spool-empty"]').text()).toBe('EMPTY')
  })
})
