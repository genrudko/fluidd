import { shallowMount } from '@vue/test-utils'
import IfsEquivalentSpoolCard from '../IfsEquivalentSpoolCard.vue'
import type { Ad5xIfsEquivalentSpoolPreview } from '@/ad5x/api/ifs'

function preview (overrides: Partial<Ad5xIfsEquivalentSpoolPreview> = {}): Ad5xIfsEquivalentSpoolPreview {
  return {
    provider: 'zmod',
    provider_command: 'ANALOG_PRUTOK',
    automatic_transition_enabled: false,
    transition_hardware_accepted: false,
    source_slot: 1,
    source: { material: 'PLA', color: '#AA0000', effective_material: 'PLA' },
    candidates: [
      { slot: 2, present: true, material: 'PLA', color: '#AA0000', eligible: true, blockers: [] },
      { slot: 3, present: true, material: 'PETG', color: '#AA0000', eligible: false, blockers: ['material_mismatch'] },
      { slot: 4, present: false, material: 'PLA', color: '#AA0000', eligible: false, blockers: ['slot_empty'] }
    ],
    eligible_slots: [2],
    next_slot: 2,
    status: 'available',
    reason: '',
    ...overrides
  }
}

describe('IfsEquivalentSpoolCard', () => {
  it('shows the provider-priority equivalent without offering a transition action', () => {
    const wrapper = shallowMount(IfsEquivalentSpoolCard, { propsData: { preview: preview(), compact: false } })
    const vm = wrapper.vm as any
    expect(vm.statusLabel).toBe('IFS 2 готов')
    expect(vm.summaryText).toContain('IFS 2')
    expect(wrapper.text()).toContain('не вызывает ANALOG_PRUTOK')
    expect(wrapper.findAll('button').length).toBe(0)
    expect(vm.candidateBlockers(preview().candidates[1])).toContain('другой материал')
  })

  it('reports no candidate and keeps automatic transition disabled', () => {
    const value = preview({ status: 'no_candidate', eligible_slots: [], next_slot: 0 })
    const wrapper = shallowMount(IfsEquivalentSpoolCard, { propsData: { preview: value, compact: true } })
    const vm = wrapper.vm as any
    expect(vm.statusLabel).toBe('Резерва нет')
    expect(vm.summaryText).toContain('не видит')
    expect(value.automatic_transition_enabled).toBe(false)
    expect(wrapper.find('[data-test="equivalent-slot-2"]').exists()).toBe(false)
  })

  it('fails soft when provider mode is suspended or identity is incomplete', async () => {
    const wrapper = shallowMount(IfsEquivalentSpoolCard, { propsData: { preview: preview({ status: 'suspended', next_slot: 0 }) } })
    expect((wrapper.vm as any).statusLabel).toBe('Приостановлено')
    await wrapper.setProps({ preview: preview({ status: 'unknown', next_slot: 0 }) })
    expect((wrapper.vm as any).statusLabel).toBe('Недостаточно данных')
  })
})
