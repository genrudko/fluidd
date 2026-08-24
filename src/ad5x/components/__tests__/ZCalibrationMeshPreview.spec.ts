import { createLocalVue, shallowMount } from '@vue/test-utils'
import Vuex from 'vuex'
import ZCalibrationMeshPreview from '../ZCalibrationMeshPreview.vue'

const localVue = createLocalVue()
localVue.use(Vuex)

function createStore (withRuntime = true) {
  return new Vuex.Store({
    modules: {
      printer: {
        namespaced: true,
        state: {
          printer: {
            bed_mesh: {
              profile_name: 'auto',
              profiles: {
                auto: {
                  points: [
                    [-0.02, 0],
                    [0.01, 0.03]
                  ]
                },
                ...(withRuntime
                  ? {
                      ad5x_runtime: {
                        points: [
                          [-0.05, -0.01],
                          [0.02, 0.07]
                        ]
                      }
                    }
                  : {})
              }
            }
          }
        }
      },
      mesh: {
        namespaced: true,
        state: {
          matrix: 'mesh_matrix'
        },
        getters: {
          getSupportsBedMesh: () => true,
          getCurrentMeshData: () => ({
            mesh_matrix: {
              coordinates: [
                { name: '0,0', value: [0, 0, -0.02] },
                { name: '1,0', value: [1, 0, 0] },
                { name: '0,1', value: [0, 1, 0.01] },
                { name: '1,1', value: [1, 1, 0.03] }
              ],
              dimensions: [2, 2],
              min: -0.02,
              max: 0.03,
              mid: 0.005,
              range: 0.05
            }
          }),
          getBedMeshProfiles: () => [
            { name: 'auto', active: true, adaptive: false, range: 0.05 },
            ...(withRuntime
              ? [{ name: 'ad5x_runtime', active: false, adaptive: false, range: 0.12 }]
              : [])
          ]
        }
      }
    }
  })
}

describe('ZCalibrationMeshPreview', () => {
  it('prefers the temporary ad5x_runtime profile for comparison while auto stays active', () => {
    const wrapper = shallowMount(ZCalibrationMeshPreview, {
      localVue,
      store: createStore(true),
      mocks: {
        $router: { push: vi.fn().mockResolvedValue(undefined) }
      }
    })
    const vm = wrapper.vm as any

    expect(vm.effectiveViewMode).toBe('runtime')
    expect(vm.displayProfileLabel).toContain('ad5x_runtime')
    expect(vm.meshMin).toBe(-0.05)
    expect(vm.meshMax).toBe(0.07)
    expect(vm.meshRange).toBeCloseTo(0.12)
    expect(vm.meshCells).toHaveLength(4)
    expect(wrapper.find('[data-test="z-runtime-mesh-note"]').exists()).toBe(true)
  })

  it('falls back to the active mesh when no temporary profile exists', () => {
    const wrapper = shallowMount(ZCalibrationMeshPreview, {
      localVue,
      store: createStore(false),
      mocks: {
        $router: { push: vi.fn().mockResolvedValue(undefined) }
      }
    })
    const vm = wrapper.vm as any

    expect(vm.effectiveViewMode).toBe('active')
    expect(vm.displayProfileLabel).toBe('auto')
    expect(vm.meshMin).toBe(-0.02)
    expect(vm.meshMax).toBe(0.03)
    expect(wrapper.find('[data-test="z-runtime-mesh-note"]').exists()).toBe(false)
  })
})
