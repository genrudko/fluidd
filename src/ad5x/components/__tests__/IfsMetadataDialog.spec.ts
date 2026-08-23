import { shallowMount } from '@vue/test-utils'
import IfsMetadataDialog from '../IfsMetadataDialog.vue'
import type { Ad5xIfsSlot } from '@/ad5x/api/ifs'

function slot (source = 'flashforge', spoolmanId: number | null = null): Ad5xIfsSlot {
  return {
    slot: 2,
    present: true,
    active: false,
    stall: false,
    material: 'PETG',
    color: '#112233',
    spool: {
      source,
      brand: 'Test',
      series: 'S1',
      name: 'PETG Black',
      material: 'PETG',
      variant: '',
      spoolman_id: spoolmanId,
      spoolman_spool_id: spoolmanId,
      spoolman_filament_id: null,
      remaining_g: 600,
      remaining_length_mm: null,
      initial_g: 1000,
      used_g: 400,
      used_length_mm: null,
      location: '',
      archived: false,
      nozzle_temp: 240,
      bed_temp: 70,
      orca_material: '',
      orca_filament_id: 'preserve-me',
      orca_setting_id: ''
    },
    appearance: { color_mode: 'solid', colors: ['#112233'], finish: 'matte' },
    metadata_status: 'assigned',
    current_identity_status: 'assigned',
    stale_metadata_available: false,
    permissions: { select_slot: true, load_slot: true, unload_slot: false, blocked_reason: '' }
  }
}

describe('IfsMetadataDialog', () => {
  it('emits normalized manual metadata while preserving hidden identity fields', async () => {
    const wrapper = shallowMount(IfsMetadataDialog, { propsData: { value: true, slotData: slot() } })
    ;(wrapper.vm as any).resetFromSlot()
    ;(wrapper.vm as any).material = 'ASA'
    ;(wrapper.vm as any).colors = ['#AABBCC']
    await wrapper.vm.$nextTick()
    ;(wrapper.vm as any).requestSave()

    const draft = wrapper.emitted('save')?.[0]?.[0] as any
    expect(draft.spool.material).toBe('ASA')
    expect(draft.spool.source).toBe('manual')
    expect(draft.spool.orca_filament_id).toBe('preserve-me')
    expect(draft.appearance.colors).toEqual(['#AABBCC'])
  })

  it('allows clear only for current manual metadata', () => {
    const wrapper = shallowMount(IfsMetadataDialog, { propsData: { value: true, slotData: slot('manual') } })
    ;(wrapper.vm as any).requestClear()
    expect(wrapper.emitted('clear')).toHaveLength(1)
  })

  it('refuses manual writes for a Spoolman-bound slot', () => {
    const wrapper = shallowMount(IfsMetadataDialog, { propsData: { value: true, slotData: slot('spoolman', 42) } })
    ;(wrapper.vm as any).resetFromSlot()
    ;(wrapper.vm as any).requestSave()
    ;(wrapper.vm as any).requestClear()
    expect(wrapper.emitted('save')).toBeUndefined()
    expect(wrapper.emitted('clear')).toBeUndefined()
  })
})
