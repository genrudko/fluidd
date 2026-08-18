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

function mountActions (state = 'standby') {
  const emit = vi.fn().mockResolvedValue({})
  const wrapper = shallowMount(ZCalibrationActions, {
    localVue,
    store: createStore(state),
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

  it('calls only the Plugins AD5X semantic macro for Z check with visible temperatures', async () => {
    const { wrapper, emit } = mountActions()
    const vm = wrapper.vm as any
    vm.extruderTemp = 235
    vm.bedTemp = 75

    await vm.checkZ()

    expect(emit).toHaveBeenCalledWith('printer.gcode.script', {
      dispatch: 'console/onGcodeScript',
      params: {
        script: 'AD5X_Z_CHECK EXTRUDER_TEMP=235.0 BED_TEMP=75.0'
      }
    })
    expect(emit.mock.calls[0][1].params.script).not.toContain('_MESH_TEST')
    expect(emit.mock.calls[0][1].params.script).not.toContain('PROBE')
  })

  it('calls only the semantic runtime-mesh macro and not the Z-Mod physical macro', async () => {
    const { wrapper, emit } = mountActions()
    const vm = wrapper.vm as any
    vm.extruderTemp = 250
    vm.bedTemp = 100

    await vm.buildRuntimeMesh()

    const script = emit.mock.calls[0][1].params.script
    expect(script).toBe('AD5X_Z_BUILD_RUNTIME_MESH EXTRUDER_TEMP=250.0 BED_TEMP=100.0')
    expect(script).not.toContain('AUTO_FULL_BED_LEVEL')
    expect(script).not.toContain('BED_MESH_CALIBRATE')
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

  it('blocks homing and semantic actions while the printer is printing', () => {
    const { wrapper } = mountActions('printing')
    const vm = wrapper.vm as any

    expect(vm.homeDisabled).toBe(true)
    expect(vm.semanticActionDisabled).toBe(true)
  })

  it('offers semantic auto restore after an action error and keeps full calibration disabled', async () => {
    const emit = vi.fn()
      .mockRejectedValueOnce(new Error('synthetic failure'))
      .mockResolvedValueOnce({})
    const wrapper = shallowMount(ZCalibrationActions, {
      localVue,
      store: createStore(),
      mocks: { $socket: { emit } }
    })
    const vm = wrapper.vm as any

    await vm.buildRuntimeMesh()
    expect(vm.actionError).toContain('synthetic failure')

    await vm.restoreAuto()
    expect(emit.mock.calls[1][1].params.script).toBe('AD5X_Z_RESTORE_AUTO')
    expect(wrapper.find('[data-test="z-full-calibration-action"]').attributes('disabled')).toBeDefined()
  })
})
