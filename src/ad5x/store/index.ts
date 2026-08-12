import type { Module, Store } from 'vuex'
import type { Ad5xApi, Ad5xCapabilities } from '../api/types'
import type { Ad5xApiStatus, Ad5xState } from './types'

export const AD5X_STORE_NAMESPACE = 'ad5x'

const registeredStores = new WeakSet<object>()

function createState (): Ad5xState {
  return {
    backendAvailable: false,
    apiStatus: 'idle',
    capabilities: null,
    error: null
  }
}

function createModule<TRootState> (): Module<Ad5xState, TRootState> {
  return {
    namespaced: true,
    state: createState(),
    actions: {
      reset ({ commit }) {
        commit('reset')
      }
    },
    mutations: {
      reset (state) {
        Object.assign(state, createState())
      },
      setBackendAvailable (state, value: boolean) {
        state.backendAvailable = value
      },
      setApiStatus (state, value: Ad5xApiStatus) {
        state.apiStatus = value
      },
      setCapabilities (state, value: Ad5xCapabilities | null) {
        state.capabilities = value
      },
      setError (state, value: string | null) {
        state.error = value
      }
    }
  }
}

export function ensureAd5xStore<TRootState> (store: Store<TRootState>): void {
  if (registeredStores.has(store)) return

  store.registerModule(AD5X_STORE_NAMESPACE, createModule<TRootState>())
  registeredStores.add(store)
}

export function getAd5xState<TRootState> (store: Store<TRootState>): Ad5xState {
  ensureAd5xStore(store)

  return (store.state as TRootState & { ad5x: Ad5xState }).ad5x
}

function errorMessage (error: unknown): string {
  return error instanceof Error ? error.message : 'Unknown Plugins AD5X API error'
}

export async function initializeAd5x<TRootState> (
  store: Store<TRootState>,
  backendAvailable: boolean,
  api?: Ad5xApi
): Promise<void> {
  ensureAd5xStore(store)
  store.commit(`${AD5X_STORE_NAMESPACE}/setBackendAvailable`, backendAvailable)
  store.commit(`${AD5X_STORE_NAMESPACE}/setCapabilities`, null)
  store.commit(`${AD5X_STORE_NAMESPACE}/setError`, null)

  if (!backendAvailable) {
    store.commit(`${AD5X_STORE_NAMESPACE}/setApiStatus`, 'unavailable')
    return
  }

  if (!api) {
    store.commit(`${AD5X_STORE_NAMESPACE}/setApiStatus`, 'error')
    store.commit(`${AD5X_STORE_NAMESPACE}/setError`, 'Plugins AD5X API adapter unavailable')
    return
  }

  store.commit(`${AD5X_STORE_NAMESPACE}/setApiStatus`, 'loading')

  try {
    const capabilities = await api.getCapabilities()

    store.commit(`${AD5X_STORE_NAMESPACE}/setCapabilities`, capabilities)
    store.commit(`${AD5X_STORE_NAMESPACE}/setApiStatus`, 'compatible')
  } catch (error: unknown) {
    store.commit(`${AD5X_STORE_NAMESPACE}/setApiStatus`, 'error')
    store.commit(`${AD5X_STORE_NAMESPACE}/setError`, errorMessage(error))
  }
}
