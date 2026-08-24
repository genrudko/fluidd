import { shallowMount } from '@vue/test-utils'
import IfsInteroperabilityCard from '../IfsInteroperabilityCard.vue'

const topology = { kind: 'selector_single_extruder', ifs_slot_count: 4, external_source: { id: 'external:bypass', kind: 'manual_bypass', modeled: true, runtime_supported: false, control_supported: false } }
const interoperability = { orca_lane_data: { namespace: 'lane_data', enabled: true, direction: 'printer_to_orca', publishable: true, record_count: 4, conflicts: [], fingerprint: 'abc', requires_moonraker_agent: true, target_version: '2.4.2', state: 'in_sync', error: '' } }

describe('IfsInteroperabilityCard', () => {
  it('shows Orca publication state without offering write controls', () => {
    const wrapper = shallowMount(IfsInteroperabilityCard, { propsData: { topology, interoperability, expert: false } })
    expect(wrapper.find('[data-test="ifs-orca-state"]').text()).toContain('in_sync')
    expect(wrapper.findAll('v-btn-stub')).toHaveLength(0)
  })

  it('keeps external bypass separate and explicitly unsupported at runtime', () => {
    const wrapper = shallowMount(IfsInteroperabilityCard, { propsData: { topology, interoperability, expert: false } })
    expect(wrapper.text()).toContain('external:bypass')
    expect(wrapper.text()).toContain('не Slot 5')
    expect(wrapper.find('[data-test="ifs-external-runtime"]').text()).toContain('не поддержан')
  })

  it('exposes bounded transport detail only in expert mode', () => {
    const regular = shallowMount(IfsInteroperabilityCard, { propsData: { topology, interoperability, expert: false } })
    expect(regular.find('[data-test="ifs-orca-details"]').exists()).toBe(false)
    const expert = shallowMount(IfsInteroperabilityCard, { propsData: { topology, interoperability, expert: true } })
    expect(expert.find('[data-test="ifs-orca-details"]').text()).toContain('Moonraker agent=required')
  })
})
