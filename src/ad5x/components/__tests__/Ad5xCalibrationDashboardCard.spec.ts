import { createLocalVue, shallowMount } from '@vue/test-utils'
import Vuex from 'vuex'
import Ad5xCalibrationDashboardCard from '../Ad5xCalibrationDashboardCard.vue'

const localVue = createLocalVue()
localVue.use(Vuex)

function createStore () {
  return new Vuex.Store({
    modules: {
      printer: {
        namespaced: true,
        state: {
          printer: {
            print_stats: {
              filename: ''
            }
          }
        },
        getters: {
          getKlippyReady: () => true,
          getPrinterState: () => 'standby'
        }
      },
      mesh: {
        namespaced: true,
        getters: {
          getCurrentMeshData: () => null
        }
      }
    }
  })
}

describe('Ad5xCalibrationDashboardCard', () => {
  it('uses the exact registered dashboard layout id and native draggable mode', () => {
    const wrapper = shallowMount(Ad5xCalibrationDashboardCard, {
      localVue,
      store: createStore(),
      methods: {
        refresh: vi.fn().mockResolvedValue(undefined)
      },
      mocks: {
        $socket: { emit: vi.fn().mockResolvedValue({}) },
        $router: { push: vi.fn() }
      }
    })

    const card = wrapper.find('collapsable-card-stub')
    expect(card.attributes('layout-path')).toBe('dashboard.ad5x-calibration-dashboard-card')
    expect(card.attributes('draggable')).toBeDefined()
  })
})
