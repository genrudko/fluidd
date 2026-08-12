import Vue from 'vue'
import Vuex from 'vuex'
import {
  AD5X_STORE_NAMESPACE,
  ensureAd5xStore,
  getAd5xState,
  initializeAd5x
} from '../index'

Vue.use(Vuex)

type TestRootState = Record<string, never>

function createStore () {
  return new Vuex.Store<TestRootState>({
    state: {}
  })
}

describe('AD5X local store', () => {
  it('registers lazily without changing the Fluidd root store registry', () => {
    const store = createStore()

    ensureAd5xStore(store)
    ensureAd5xStore(store)

    expect(store.hasModule(AD5X_STORE_NAMESPACE)).toBe(true)
    expect(getAd5xState(store).apiStatus).toBe('idle')
  })

  it('participates safely in Fluidd root reset dispatches', async () => {
    const store = createStore()

    await initializeAd5x(store, false)
    expect(getAd5xState(store).apiStatus).toBe('unavailable')

    await store.dispatch(`${AD5X_STORE_NAMESPACE}/reset`)

    expect(getAd5xState(store)).toMatchObject({
      backendAvailable: false,
      apiStatus: 'idle',
      capabilities: null,
      error: null
    })
  })

  it('does not call AD5X API when the backend is absent', async () => {
    const store = createStore()
    const getCapabilities = vi.fn()

    await initializeAd5x(store, false, { getCapabilities })

    expect(getCapabilities).not.toHaveBeenCalled()
    expect(getAd5xState(store)).toMatchObject({
      backendAvailable: false,
      apiStatus: 'unavailable',
      capabilities: null,
      error: null
    })
  })

  it('accepts a mocked capability payload when the backend is present', async () => {
    const store = createStore()
    const payload = { modules: ['diagnostic'] }
    const getCapabilities = vi.fn().mockResolvedValue(payload)

    await initializeAd5x(store, true, { getCapabilities })

    expect(getCapabilities).toHaveBeenCalledOnce()
    expect(getAd5xState(store)).toMatchObject({
      backendAvailable: true,
      apiStatus: 'compatible',
      capabilities: payload,
      error: null
    })
  })
})
