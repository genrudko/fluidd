import { shallowMount } from '@vue/test-utils'
import i18n from '@/plugins/i18n'
import IfsPreprintPlan from '../IfsPreprintPlan.vue'
import type { Ad5xIfsPreprintPlan as Plan, Ad5xIfsSlot } from '@/ad5x/api/ifs'

function slot (number: number, present = true): Ad5xIfsSlot {
  return {
    slot: number,
    present,
    active: false,
    stall: false,
    material: present ? 'PLA' : undefined,
    color: present ? '#F330F9' : undefined,
    spool: {
      source: present ? 'manual' : '',
      brand: '',
      series: '',
      name: present ? 'PLA Magenta' : '',
      material: present ? 'PLA' : '',
      variant: '',
      spoolman_id: null,
      spoolman_spool_id: null,
      spoolman_filament_id: null,
      remaining_g: null,
      remaining_length_mm: null,
      initial_g: null,
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
    appearance: { color_mode: 'solid', colors: present ? ['#F330F9'] : [], finish: '' },
    metadata_status: present ? 'assigned' : 'none',
    current_identity_status: present ? 'assigned' : 'empty',
    stale_metadata_available: false,
    permissions: { select_slot: false, load_slot: false, unload_slot: false, blocked_reason: '' }
  }
}

function plan (overrides: Partial<Plan> = {}): Plan {
  return {
    available: true,
    source: 'zmod',
    filename: 'demo.gcode',
    status: 'ready',
    rows: [{
      tool: 0,
      requirement: { material: 'PLA', color: '#F330F9' },
      assignment: { slot: 3, present: true, metadata_status: 'assigned', spool: {}, appearance: {} },
      state: 'ready'
    }],
    warnings: [],
    summary: { required_tools: 1, assigned_tools: 1, ready_tools: 1 },
    auto_assign: {},
    messages: [],
    error: '',
    ...overrides
  }
}

describe('IfsPreprintPlan', () => {
  beforeEach(() => { i18n.locale = 'en' })
  it('uses the normalized physical slot as the visual source for an assigned tool', () => {
    const wrapper = shallowMount(IfsPreprintPlan, { i18n, propsData: { plan: plan(), slots: [slot(3)] } })
    const vm = wrapper.vm as any

    expect(vm.assignedLabel(plan().rows[0])).toBe('PLA Magenta')
    expect(vm.assignedColor(plan().rows[0])).toBe('#F330F9')
  })

  it('does not invent a spool when the assigned physical slot is missing', () => {
    const missing = plan({
      status: 'blocked',
      warnings: ['assigned_slot_missing'],
      rows: [{
        tool: 1,
        requirement: { material: 'PETG', color: '#161616' },
        assignment: { slot: 5, present: false, metadata_status: 'none', spool: {}, appearance: {} },
        state: 'slot_missing'
      }]
    })
    const wrapper = shallowMount(IfsPreprintPlan, { i18n, propsData: { plan: missing, slots: [slot(1)] } })
    const vm = wrapper.vm as any

    expect(vm.assignedLabel(missing.rows[0])).toBe('Slot is missing')
    expect(vm.assignedColor(missing.rows[0])).toBe('')
  })

  it('offers the edit action only when mapping is editable', async () => {
    const editable = shallowMount(IfsPreprintPlan, {
      i18n,
      propsData: { plan: plan(), slots: [slot(3)], editable: true, editing: false }
    })
    const button = editable.find('[data-test="preprint-edit"]')
    expect(button.exists()).toBe(true)
    button.vm.$emit('click')
    await editable.vm.$nextTick()
    expect(editable.emitted('edit')).toHaveLength(1)

    const readonly = shallowMount(IfsPreprintPlan, {
      i18n,
      propsData: { plan: plan(), slots: [slot(3)], editable: false, editing: false }
    })
    expect(readonly.find('[data-test="preprint-edit"]').exists()).toBe(false)
  })

  it('keeps summary visible but collapses tool rows in compact mode', () => {
    const wrapper = shallowMount(IfsPreprintPlan, { i18n, propsData: { plan: plan(), slots: [slot(3)], compact: true } })
    expect(wrapper.find('[data-test="preprint-status"]').exists()).toBe(true)
    expect(wrapper.find('[data-test="preprint-row-0"]').classes()).toContain('d-none')
  })

  it('keeps aggregate Z-Mod quality warnings global instead of assigning them to a tool', () => {
    const warningPlan = plan({ status: 'warning', warnings: ['weak_color', 'duplicate_slot'] })
    const wrapper = shallowMount(IfsPreprintPlan, { i18n, propsData: { plan: warningPlan, slots: [slot(3)] } })
    const vm = wrapper.vm as any

    expect(vm.warningLabel('weak_color')).toContain('ambiguous')
    expect(vm.warningLabel('duplicate_slot')).toContain('multiple tools')
    expect(warningPlan.rows[0]).not.toHaveProperty('weak_color')
  })
})
