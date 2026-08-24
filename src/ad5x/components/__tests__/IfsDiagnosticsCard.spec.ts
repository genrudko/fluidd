import { shallowMount } from '@vue/test-utils'
import IfsDiagnosticsCard from '../IfsDiagnosticsCard.vue'
import i18n from '@/plugins/i18n'

describe('IfsDiagnosticsCard', () => {
  beforeEach(() => { i18n.locale = 'en' })
  const diagnostics = { silk_mask: 5, raw_channel: 3, insert_slot: 2, need_insert: true, stall_mask: 10, runtime_active_slot: 1 }

  it('renders provider diagnostics without exposing control actions', () => {
    const wrapper = shallowMount(IfsDiagnosticsCard, { i18n, propsData: { diagnostics, stateCode: 5, activeSlot: 2, filamentAtToolhead: true } })
    const vm = wrapper.vm as any
    expect(vm.mask(5)).toBe('0b0101')
    expect(vm.mask(10)).toBe('0b1010')
    expect(vm.rows.find((row: any) => row.test === 'diag-raw-channel').value).toBe('3')
    expect(vm.rows.find((row: any) => row.test === 'diag-need-insert').value).toBe('yes')
    expect(wrapper.text()).toContain('read-only')
    expect(wrapper.findAll('button').length).toBe(0)
  })

  it('keeps raw F13 channel separate from active slot and runtime slot', () => {
    const wrapper = shallowMount(IfsDiagnosticsCard, { i18n, propsData: { diagnostics, stateCode: 5, activeSlot: 2, filamentAtToolhead: null } })
    const rows = (wrapper.vm as any).rows
    expect(rows.find((row: any) => row.test === 'diag-active-slot').value).toBe('IFS 2')
    expect(rows.find((row: any) => row.test === 'diag-runtime-slot').value).toBe('IFS 1')
    expect(rows.find((row: any) => row.test === 'diag-toolhead').value).toBe('unknown')
  })
})
