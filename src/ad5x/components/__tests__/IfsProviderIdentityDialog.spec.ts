import { shallowMount } from '@vue/test-utils'
import i18n from '@/plugins/i18n'
import type { Ad5xIfsSlot } from '@/ad5x/api/ifs'
import IfsProviderIdentityDialog from '../IfsProviderIdentityDialog.vue'

const slot: Ad5xIfsSlot = {
  slot: 2,
  present: true,
  active: false,
  stall: false,
  material: 'PLA',
  color: '#112233',
  spool: {
    source: 'spoolman',
    brand: 'Test',
    series: '',
    name: 'PETG',
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
    orca_material: '',
    orca_filament_id: '',
    orca_setting_id: ''
  },
  appearance: { color_mode: 'solid', colors: ['#AABBCC'], finish: 'standard' },
  metadata_status: 'assigned',
  current_identity_status: 'assigned',
  stale_metadata_available: false,
  permissions: { select_slot: true, load_slot: true, unload_slot: false, blocked_reason: '' },
  compatibility: {
    zmod: {
      slot: 2,
      current: { material: 'PLA', color: '#112233' },
      desired: { material: 'PETG', color: '#AABBCC' },
      sync_state: 'diverged',
      write_ready: true,
      lossy: false,
      omitted_fields: [],
      write_blockers: []
    }
  }
}

describe('IfsProviderIdentityDialog', () => {
  beforeEach(() => { i18n.locale = 'en' })
  it('shows current and desired identities and emits an explicit spool projection apply', () => {
    const wrapper = shallowMount(IfsProviderIdentityDialog, {
      i18n,
      propsData: { value: true, slotData: slot, materialTypes: ['PLA', 'PETG'], hardwareAccepted: true }
    })
    ;(wrapper.vm as any).reset()
    ;(wrapper.vm as any).applySpool()

    expect((wrapper.vm as any).currentLabel).toBe('PLA · #112233')
    expect((wrapper.vm as any).mismatched).toBe(true)
    expect(wrapper.emitted('save')?.[0]?.[0]).toEqual({
      material: 'PETG', color: '#AABBCC', applySpoolProjection: true
    })
  })

  it('keeps direct IFS identity editing available when only the spool projection is blocked', () => {
    const projectionBlocked: Ad5xIfsSlot = { ...slot, compatibility: { zmod: { ...slot.compatibility!.zmod, desired: { material: '', color: '' }, sync_state: 'unsupported', write_ready: false, write_blockers: ['missing_material'] } } }
    const wrapper = shallowMount(IfsProviderIdentityDialog, { i18n, propsData: { value: true, slotData: projectionBlocked, materialTypes: ['PLA', 'PETG'], hardwareAccepted: true } })
    ;(wrapper.vm as any).reset()
    ;(wrapper.vm as any).save()
    expect((wrapper.vm as any).controlsDisabled).toBe(false)
    expect((wrapper.vm as any).desired).toBeNull()
    expect(wrapper.emitted('save')?.[0]?.[0]).toEqual({ material: 'PLA', color: '#112233', applySpoolProjection: false })
  })

  it('fails closed in the UI when provider material types are unknown', () => {
    const wrapper = shallowMount(IfsProviderIdentityDialog, { i18n, propsData: { value: true, slotData: slot, materialTypes: ['?'], hardwareAccepted: true } })
    ;(wrapper.vm as any).reset()
    ;(wrapper.vm as any).save()
    expect((wrapper.vm as any).providerTypesKnown).toBe(false)
    expect((wrapper.vm as any).controlsDisabled).toBe(true)
    expect(wrapper.emitted('save')).toBeUndefined()
  })

  it('blocks every provider write until hardware acceptance is true', () => {
    const wrapper = shallowMount(IfsProviderIdentityDialog, {
      i18n,
      propsData: { value: true, slotData: slot, hardwareAccepted: false }
    })
    ;(wrapper.vm as any).reset()
    ;(wrapper.vm as any).save()
    ;(wrapper.vm as any).applySpool()

    expect((wrapper.vm as any).controlsDisabled).toBe(true)
    expect(wrapper.emitted('save')).toBeUndefined()
  })
})
