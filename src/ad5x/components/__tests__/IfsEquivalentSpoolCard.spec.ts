import { mount } from '@vue/test-utils'
import IfsEquivalentSpoolCard from '../IfsEquivalentSpoolCard.vue'
import type { Ad5xIfsEquivalentSpoolPreview } from '@/ad5x/api/ifs'

function preview (overrides: Partial<Ad5xIfsEquivalentSpoolPreview> = {}): Ad5xIfsEquivalentSpoolPreview {
  return {
    provider: 'zmod',
    provider_command: 'ANALOG_PRUTOK',
    automatic_transition_enabled: false,
    transition_hardware_accepted: false,
    source_slot: 1,
    source: { material: 'PLA', color: '#AA0000' },
    candidates: [
      { slot: 2, present: true, material: 'PLA', color: '#AA0000', eligible: true, blockers: [] },
      { slot: 3, present: true, material: 'PLA', color: '#AA0000', eligible: true, blockers: [] },
      { slot: 4, present: false, material: 'PLA', color: '#AA0000', eligible: false, blockers: ['slot_empty'] }
    ],
    eligible_slots: [2, 3],
    next_slot: 3,
    status: 'available',
    reason: '',
    ...overrides
  }
}

function mountCard (value: Ad5xIfsEquivalentSpoolPreview, mode: 'auto' | 'hybrid' | 'expert') {
  return mount(IfsEquivalentSpoolCard, {
    propsData: { preview: value, mode },
    mocks: { $globals: { Icons: { arrowRight: 'arrow' } } }
  })
}

describe('IfsEquivalentSpoolCard', () => {
  it('shows only source and authoritative next slot in Auto', () => {
    const wrapper = mountCard(preview(), 'auto')
    expect(wrapper.text()).toContain('IFS 1')
    expect(wrapper.text()).toContain('IFS 3')
    expect(wrapper.text()).not.toContain('IFS 2')
  })

  it('shows concise no-candidate state in Auto', () => {
    const wrapper = mountCard(preview({ status: 'no_candidate', next_slot: 0, eligible_slots: [] }), 'auto')
    expect(wrapper.text()).toContain('Резерв отсутствует')
    expect(wrapper.text()).not.toContain('другой материал')
  })

  it('shows all candidates and next-slot priority in Hybrid', () => {
    const wrapper = mountCard(preview(), 'hybrid')
    expect(wrapper.find('[data-test="equivalent-slot-2"]').exists()).toBe(true)
    expect(wrapper.find('[data-test="equivalent-slot-3"]').text()).toContain('первый резерв')
    expect(wrapper.find('[data-test="equivalent-slot-2"]').text()).not.toContain('первый резерв')
    expect(wrapper.find('[data-test="equivalent-slot-4"]').text()).toContain('пусто / недоступно')
  })

  it('translates Expert blockers without exposing ids', () => {
    const wrapper = mountCard(preview({
      candidates: [
        { slot: 2, present: true, material: 'PETG', color: '#00AA00', eligible: false, blockers: ['material_mismatch', 'private_code'] }
      ],
      eligible_slots: [],
      next_slot: 0,
      status: 'no_candidate'
    }), 'expert')
    expect(wrapper.text()).toContain('другой материал')
    expect(wrapper.text()).toContain('причина недоступна')
    expect(wrapper.text()).not.toContain('material_mismatch')
    expect(wrapper.text()).not.toContain('private_code')
  })

  it('renders present=false empty and unavailable', () => {
    const empty = mountCard(preview(), 'expert').find('[data-test="equivalent-slot-4"]')
    expect(empty.text()).toContain('слот пуст')
    expect(empty.text()).not.toContain('#AA0000')
  })

  it.each(['suspended', 'unknown'])('fails soft for %s', status => {
    expect(mountCard(preview({ status, next_slot: 0 }), 'auto').text()).toContain('Резерв недоступен')
  })

  it('has no raw command or transition action', () => {
    const wrapper = mountCard(preview(), 'expert')
    expect(wrapper.text()).not.toContain('ANALOG_PRUTOK')
    expect(wrapper.findAll('button')).toHaveLength(0)
    expect(wrapper.text()).toContain('автоматический переход выключен')
  })
})
