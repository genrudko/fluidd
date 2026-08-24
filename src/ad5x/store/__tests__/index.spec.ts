import Vue from 'vue'
import Vuex from 'vuex'
import {
  AD5X_STORE_NAMESPACE,
  applyAd5xSnapshot,
  ensureAd5xStore,
  getAd5xState,
  initializeAd5x,
  refreshAd5x
} from '../index'

Vue.use(Vuex)

type TestRootState = Record<string, never>

function createStore () {
  return new Vuex.Store<TestRootState>({ state: {} })
}

function snapshot (revision = 3) {
  return {
    api_version: '1.0' as const,
    backend_version: '0.2.0',
    revision,
    backend: { health: 'ok' },
    modules: {}
  }
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
      snapshot: null,
      notifiedRevision: 0,
      error: null
    })
  })

  it('does not call AD5X API when the backend is absent', async () => {
    const store = createStore()
    const getSnapshot = vi.fn()
    await initializeAd5x(store, false, { getSnapshot })

    expect(getSnapshot).not.toHaveBeenCalled()
    expect(getAd5xState(store)).toMatchObject({
      backendAvailable: false,
      apiStatus: 'unavailable',
      snapshot: null,
      notifiedRevision: 0,
      error: null
    })
  })

  it('stores the canonical snapshot when the backend is present', async () => {
    const store = createStore()
    const payload = snapshot()
    const getSnapshot = vi.fn().mockResolvedValue(payload)
    await initializeAd5x(store, true, { getSnapshot })

    expect(getSnapshot).toHaveBeenCalledOnce()
    expect(getAd5xState(store)).toMatchObject({
      backendAvailable: true,
      apiStatus: 'compatible',
      snapshot: payload,
      notifiedRevision: 3,
      error: null
    })
  })

  it('records snapshot change notifications monotonically', async () => {
    const store = createStore()
    ensureAd5xStore(store)
    await store.dispatch(`${AD5X_STORE_NAMESPACE}/onSnapshotChanged`, { revision: 8 })
    await store.dispatch(`${AD5X_STORE_NAMESPACE}/onSnapshotChanged`, { revision: 6 })

    expect(getAd5xState(store).notifiedRevision).toBe(8)
  })

  it('applies an action response snapshot without an extra backend read', async () => {
    const store = createStore()
    await initializeAd5x(store, true, { getSnapshot: vi.fn().mockResolvedValue(snapshot(3)) })

    const payload = snapshot(11)
    applyAd5xSnapshot(store, payload)

    expect(getAd5xState(store)).toMatchObject({
      backendAvailable: true,
      apiStatus: 'compatible',
      snapshot: payload,
      notifiedRevision: 11,
      error: null
    })
  })

  it('refreshes the snapshot without resetting backend availability', async () => {
    const store = createStore()
    await initializeAd5x(store, true, { getSnapshot: vi.fn().mockResolvedValue(snapshot(3)) })

    const payload = snapshot(9)
    await refreshAd5x(store, { getSnapshot: vi.fn().mockResolvedValue(payload) })

    expect(getAd5xState(store)).toMatchObject({
      backendAvailable: true,
      apiStatus: 'compatible',
      snapshot: payload,
      notifiedRevision: 9,
      error: null
    })
  })

  it('fails safely when snapshot retrieval rejects', async () => {
    const store = createStore()
    const getSnapshot = vi.fn().mockRejectedValue(new Error('snapshot unavailable'))
    await initializeAd5x(store, true, { getSnapshot })

    expect(getAd5xState(store)).toMatchObject({
      backendAvailable: true,
      apiStatus: 'error',
      snapshot: null,
      error: 'snapshot unavailable'
    })
  })
})
