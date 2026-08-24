import { createLocalVue, shallowMount } from '@vue/test-utils'
import Vuex from 'vuex'
import ZCalibrationActions from '../ZCalibrationActions.vue'

const localVue = createLocalVue()
localVue.use(Vuex)

function createStore (state = 'standby') {
  return new Vuex.Store({
    modules: {
      printer: {
        namespaced: true,
        getters: {
          getKlippyReady: () => true,
          getPrinterState: () => state,
          getHomedAxes: () => () => false
        }
      }
    }
  })
}

function mountActions (state = 'standby', preprintMode: number | null = 3) {
  const emit = vi.fn().mockResolvedValue({})
  const wrapper = shallowMount(ZCalibrationActions, {
    localVue,
    store: createStore(state),
    propsData: { preprintMode },
    mocks: {
      $socket: { emit }
    }
  })
  return { wrapper, emit }
}

describe('ZCalibrationActions', () => {
  it('uses the normal Fluidd gcode transport for Home Z', async () => {
    const { wrapper, emit } = mountActions()
    await (wrapper.vm as any).homeZ()

    expect(emit).toHaveBeenCalledWith('printer.gcode.script', {
      dispatch: 'console/onGcodeScript',
      params: { script: 'G28 Z' }
    })
    expect(wrapper.emitted('refresh')).toBeTruthy()
  })

  it('persists the pre-print calibration setting only through the parser-safe Plugins AD5X semantic macro', async () => {
    const { wrapper, emit } = mountActions()
    const vm = wrapper.vm as any

    await vm.setPreprint(false)

    expect(emit).toHaveBeenCalledWith('printer.gcode.script', {
      dispatch: 'console/onGcodeScript',
      params: { script: 'ADZ_SET_PREPRINT ENABLED=0' }
    })
    expect(emit.mock.calls[0][1].params.script).not.toContain('SAVE_VARIABLE')
    expect(emit.mock.calls[0][1].params.script).not.toContain('AD5X_Z_')
    expect(wrapper.emitted('refresh')).toBeTruthy()
  })

  it('reflects managed pre-print modes and disables manual Z check when pre-print mode is off', async () => {
    const { wrapper, emit } = mountActions('standby', 0)
    const vm = wrapper.vm as any

    expect(vm.preprintEnabled).toBe(false)
    expect(vm.preprintModeLabel).toContain('MESH_TEST=0')
    expect(vm.checkActionDisabled).toBe(true)

    await vm.checkZ()
    expect(emit).not.toHaveBeenCalled()
  })

  it('calls only the parser-safe semantic macro for Z check with visible temperatures', async () => {
    const { wrapper, emit } = mountActions()
    const vm = wrapper.vm as any
    vm.extruderTemp = 235
    vm.bedTemp = 75

    await vm.checkZ()

    expect(emit).toHaveBeenCalledWith('printer.gcode.script', {
      dispatch: 'console/onGcodeScript',
      params: {
        script: 'ADZ_CHECK EXTRUDER_TEMP=235.0 BED_TEMP=75.0'
      }
    })
    expect(emit.mock.calls[0][1].params.script).not.toContain('_MESH_TEST')
    expect(emit.mock.calls[0][1].params.script).not.toContain('PROBE')
    expect(emit.mock.calls[0][1].params.script).not.toContain('AD5X_Z_')
  })

  it('calls only the parser-safe semantic runtime-mesh macro and not the Z-Mod physical macro', async () => {
    const { wrapper, emit } = mountActions()
    const vm = wrapper.vm as any
    vm.extruderTemp = 250
    vm.bedTemp = 100

    await vm.buildRuntimeMesh()

    const script = emit.mock.calls[0][1].params.script
    expect(script).toBe('ADZ_BUILD_RUNTIME_MESH EXTRUDER_TEMP=250.0 BED_TEMP=100.0')
    expect(script).not.toContain('AUTO_FULL_BED_LEVEL')
    expect(script).not.toContain('BED_MESH_CALIBRATE')
    expect(script).not.toContain('AD5X_Z_')
  })

  it('does not start semantic physical actions with invalid temperature fields', async () => {
    const { wrapper, emit } = mountActions()
    const vm = wrapper.vm as any
    vm.extruderTemp = 0
    vm.bedTemp = 60

    expect(vm.semanticActionDisabled).toBe(true)
    await vm.checkZ()
    expect(emit).not.toHaveBeenCalled()
  })

  it('blocks homing, setting changes and semantic actions while the printer is printing', () => {
    const { wrapper } = mountActions('printing')
    const vm = wrapper.vm as any

    expect(vm.preprintToggleDisabled).toBe(true)
    expect(vm.homeDisabled).toBe(true)
    expect(vm.semanticActionDisabled).toBe(true)
  })

  it('offers parser-safe semantic auto restore after an action error and keeps full calibration disabled', async () => {
    const emit = vi.fn()
      .mockRejectedValueOnce(new Error('synthetic failure'))
      .mockResolvedValueOnce({})
    const wrapper = shallowMount(ZCalibrationActions, {
      localVue,
      store: createStore(),
      propsData: { preprintMode: 3 },
      mocks: { $socket: { emit } }
    })
    const vm = wrapper.vm as any

    await vm.buildRuntimeMesh()
    expect(vm.actionError).toContain('synthetic failure')

    await vm.restoreAuto()
    expect(emit.mock.calls[1][1].params.script).toBe('ADZ_RESTORE_AUTO')
    expect(wrapper.find('[data-test="z-full-calibration-action"]').attributes('disabled')).toBeDefined()
  })
})
