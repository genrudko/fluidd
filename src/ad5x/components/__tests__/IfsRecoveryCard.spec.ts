import { shallowMount } from '@vue/test-utils'
import IfsRecoveryCard from '../IfsRecoveryCard.vue'
import i18n from '@/plugins/i18n'

const base = {
  provider: 'zmod',
  read_only: true,
  execution_enabled: false,
  hardware_accepted: false,
  status: 'idle',
  evidence: { module_state: 'ready', state_code: 5, driver_error: false, need_insert: false, insert_slot: 0 },
  primitives: [
    { id: 'reset_driver', provider_command: 'IFS_F15', scope: 'driver', source_verified: true, execution_enabled: false, hardware_accepted: false },
    { id: 'force_stop_motion', provider_command: 'IFS_F112', scope: 'all_motion', source_verified: true, execution_enabled: false, hardware_accepted: false },
    { id: 'unlock_all', provider_command: 'IFS_F18', scope: 'all_slots', source_verified: true, execution_enabled: false, hardware_accepted: false },
    { id: 'unlock_slot', provider_command: 'IFS_F39', scope: 'slot', parameter: 'PRUTOK', slot_range: [1, 4], source_verified: true, execution_enabled: false, hardware_accepted: false }
  ],
  provider_sequences: { driver_error_retry: ['IFS_F15'], timeout_cleanup: ['IFS_F112', 'IFS_F18'] }
}

describe('IfsRecoveryCard', () => {
  beforeEach(() => { i18n.locale = 'en' })
  it('shows source-verified primitives only as read-only expert detail', () => {
    const wrapper = shallowMount(IfsRecoveryCard, { i18n, propsData: { preview: base, expert: true } })
    expect(wrapper.findAll('[data-test="ifs-recovery-primitive"]')).toHaveLength(4)
    expect(wrapper.text()).toContain('execution disabled')
    expect(wrapper.findAll('v-btn-stub')).toHaveLength(0)
  })

  it('surfaces driver error evidence without turning it into an action', () => {
    const preview = { ...base, status: 'driver_error', evidence: { ...base.evidence, state_code: 127, driver_error: true } }
    const wrapper = shallowMount(IfsRecoveryCard, { i18n, propsData: { preview, expert: false } })
    expect(wrapper.find('[data-test="ifs-recovery-driver-error"]').exists()).toBe(true)
    expect(wrapper.findAll('[data-test="ifs-recovery-primitive"]')).toHaveLength(0)
  })

  it('renders provider sequences as evidence in expert mode', () => {
    const wrapper = shallowMount(IfsRecoveryCard, { i18n, propsData: { preview: base, expert: true } })
    expect(wrapper.find('[data-test="ifs-recovery-sequences"]').text()).toContain('IFS_F112 → IFS_F18')
  })
})
