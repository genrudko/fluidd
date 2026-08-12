import type { Ad5xCapabilities } from '../api/types'

export type Ad5xApiStatus = 'unavailable' | 'idle' | 'loading' | 'compatible' | 'error'

export interface Ad5xState {
  backendAvailable: boolean
  apiStatus: Ad5xApiStatus
  capabilities: Ad5xCapabilities | null
  error: string | null
}
