import { mount } from '@vue/test-utils'
import type { Ad5xIfsSlot } from '@/ad5x/api/ifs'
import vuetify from '@/plugins/vuetify'
import IfsSlotCard from '../IfsSlotCard.vue'

function emptySlotWithStaleMetadata (): Ad5xIfsSlot {
  return {
    slot: 4,
    present: false,
    active: false,
    stall: false,
    spool: {
      source: 'spoolman',
      brand: 'Old Brand',
      series: '',
      name: 'Old spool',
      material: 'TPU',
      variant: '',
      spoolman_id: 88,
      spoolman_spool_id: 88,
      spoolman_filament_id: 2,
      remaining_g: 321,
      remaining_length_mm: null,
      initial_g: 1000,
      used_g: null,
      used_length_mm: null,
      location: '',
      archived: false,
      nozzle_temp: null,
      bed_temp: null,
      orca_material: '',
      orca_filament_id: '',
      orca_setting_id: ''
    },
    appearance: { color_mode: 'solid', colors: ['#00FF00'], finish: 'standard' },
    metadata_status: 'stale',
    current_identity_status: 'empty',
    stale_metadata_available: true,
    permissions: { select_slot: false, load_slot: false, unload_slot: false, blocked_reason: 'slot_empty' }
  }
}

describe('IfsSlotCard', () => {
  it('never presents stale spool identity as installed when the physical slot is empty', () => {
    const wrapper = mount(IfsSlotCard, { vuetify, propsData: { slotData: emptySlotWithStaleMetadata() } })

    expect(wrapper.get('[data-test="slot-empty"]').text()).toBe('Пусто')
    expect(wrapper.find('[data-test="slot-material"]').exists()).toBe(false)
    expect(wrapper.find('[data-test="slot-spoolman"]').exists()).toBe(false)
    expect(wrapper.text()).not.toContain('Old spool')
  })
})
