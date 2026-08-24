import { shallowMount } from '@vue/test-utils'
import IfsMappingDialog from '../IfsMappingDialog.vue'
import type { Ad5xIfsJobPreview, Ad5xIfsPreprintPlan, Ad5xIfsSlot } from '@/ad5x/api/ifs'

function slot (number: number, present = true): Ad5xIfsSlot {
  return {
    slot: number,
    present,
    active: false,
    stall: false,
    material: present ? 'PLA' : undefined,
    color: present ? '#112233' : undefined,
    spool: {
      source: present ? 'manual' : '',
      brand: '',
      series: '',
      name: present ? `Spool ${number}` : '',
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
    appearance: { color_mode: 'solid', colors: present ? ['#112233'] : [], finish: '' },
    metadata_status: present ? 'assigned' : 'none',
    current_identity_status: present ? 'assigned' : 'empty',
    stale_metadata_available: false,
    permissions: { select_slot: false, load_slot: false, unload_slot: false, blocked_reason: '' }
  }
}

function preview (): Ad5xIfsJobPreview {
  return {
    available: true,
    source: 'zmod',
    filename: 'demo.gcode',
    requirements: [],
    assignments: [],
    allowed_tool_count: 3,
    resolved_tool_map: [1, 2, 3],
    auto_assign: {},
    messages: [],
    error: ''
  }
}

function plan (): Ad5xIfsPreprintPlan {
  return {
    available: true,
    source: 'zmod',
    filename: 'demo.gcode',
    status: 'ready',
    rows: [
      { tool: 0, requirement: { material: 'PLA', color: '#112233' }, assignment: { slot: 1, present: true, metadata_status: 'assigned', spool: {}, appearance: {} }, state: 'ready' },
      { tool: 2, requirement: { material: 'PETG', color: '#445566' }, assignment: { slot: 3, present: true, metadata_status: 'assigned', spool: {}, appearance: {} }, state: 'ready' }
    ],
    warnings: [],
    summary: { required_tools: 2, assigned_tools: 2, ready_tools: 2 },
    auto_assign: {},
    messages: [],
    error: ''
  }
}

describe('IfsMappingDialog', () => {
  it('preserves hidden tools when editing one visible T-to-slot assignment', () => {
    const wrapper = shallowMount(IfsMappingDialog, {
      propsData: {
        value: true,
        preview: preview(),
        previewToken: 'a'.repeat(64),
        plan: plan(),
        slots: [slot(1), slot(2), slot(3), slot(4, false)],
        busy: false,
        error: ''
      }
    })
    const vm = wrapper.vm as any
    vm.resetMapping()
    vm.updateSlot(2, 4)

    expect(wrapper.emitted('change')?.[0]?.[0]).toEqual([1, 2, 4])
  })

  it('labels live and empty physical slots from normalized IFS state', () => {
    const wrapper = shallowMount(IfsMappingDialog, {
      propsData: {
        value: true,
        preview: preview(),
        previewToken: 'a'.repeat(64),
        plan: plan(),
        slots: [slot(1), slot(2, false), slot(3)],
        busy: false,
        error: ''
      }
    })
    const vm = wrapper.vm as any
    expect(vm.slotItems.find((item: any) => item.value === 1).text).toContain('Spool 1')
    expect(vm.slotItems.find((item: any) => item.value === 2).text).toContain('пусто')
    expect(vm.slotItems.find((item: any) => item.value === 4).text).toContain('недоступен')
  })

  it('ignores invalid slot edits', () => {
    const wrapper = shallowMount(IfsMappingDialog, {
      propsData: {
        value: true,
        preview: preview(),
        previewToken: 'a'.repeat(64),
        plan: plan(),
        slots: [slot(1), slot(2), slot(3), slot(4)],
        busy: false,
        error: ''
      }
    })
    const vm = wrapper.vm as any
    vm.resetMapping()
    vm.updateSlot(2, 5)
    expect(wrapper.emitted('change')).toBeUndefined()
  })
})
