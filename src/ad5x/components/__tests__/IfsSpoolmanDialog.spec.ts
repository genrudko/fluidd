import { mount } from '@vue/test-utils'
import vuetify from '@/plugins/vuetify'
import type { Ad5xIfsSlot, Ad5xSpoolmanLibraryItem } from '@/ad5x/api/ifs'
import IfsSpoolmanDialog from '../IfsSpoolmanDialog.vue'

function slot (): Ad5xIfsSlot { return { slot: 2, present: true, active: false, stall: false, spool: { source: 'spoolman', brand: 'Test', series: '', name: 'PETG Black', material: 'PETG', variant: '', spoolman_id: 42, spoolman_spool_id: 42, spoolman_filament_id: 7, remaining_g: 500, remaining_length_mm: null, initial_g: 1000, used_g: 500, used_length_mm: null, location: '', archived: false, nozzle_temp: 240, bed_temp: 70, orca_material: '', orca_filament_id: '', orca_setting_id: '' }, appearance: { color_mode: 'solid', colors: ['#112233'], finish: 'standard' }, metadata_status: 'assigned', current_identity_status: 'assigned', stale_metadata_available: false, permissions: { select_slot: true, load_slot: true, unload_slot: false, blocked_reason: '' } } }
function item (): Ad5xSpoolmanLibraryItem { return { spoolman_spool_id: 99, spoolman_filament_id: 8, spool: { ...slot().spool, spoolman_id: 99, spoolman_spool_id: 99, spoolman_filament_id: 8, name: 'PLA Red', material: 'PLA' }, appearance: { color_mode: 'solid', colors: ['#FF0000'], finish: 'standard' }, inventory: { remaining_g: 700, remaining_length_mm: null, initial_g: 1000, used_g: 300, used_length_mm: null, location: 'Rack', archived: false } } }

describe('IfsSpoolmanDialog', () => {
  it('shows current binding and emits the selected concrete spool item', async () => {
    const wrapper = mount(IfsSpoolmanDialog, { vuetify, propsData: { value: true, slotData: slot(), connected: true, items: [item()] } })
    expect(wrapper.get('[data-test="spoolman-current-id"]').text()).toContain('42')
    await wrapper.get('[data-test="spoolman-bind"]').trigger('click')
    expect(wrapper.emitted('bind')?.[0]?.[0]).toEqual(item())
  })

  it('locks Spoolman writes while IFS is busy', async () => {
    const wrapper = mount(IfsSpoolmanDialog, { vuetify, propsData: { value: true, slotData: slot(), connected: true, items: [item()], locked: true } })
    await wrapper.get('[data-test="spoolman-bind"]').trigger('click')
    await wrapper.get('[data-test="spoolman-unbind"]').trigger('click')
    expect(wrapper.emitted('bind')).toBeUndefined()
    expect(wrapper.emitted('unbind')).toBeUndefined()
  })

  it('blocks network operations offline but still allows local unbind', async () => {
    const wrapper = mount(IfsSpoolmanDialog, { vuetify, propsData: { value: true, slotData: slot(), connected: false, items: [] } })
    expect(wrapper.get('[data-test="spoolman-search"]').attributes('disabled')).toBeDefined()
    expect(wrapper.get('[data-test="spoolman-refresh"]').attributes('disabled')).toBeDefined()
    await wrapper.get('[data-test="spoolman-unbind"]').trigger('click')
    expect(wrapper.emitted('unbind')).toHaveLength(1)
  })
})
