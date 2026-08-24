import type { Ad5xSnapshot } from '../api/types'

export type Ad5xApiStatus = 'unavailable' | 'idle' | 'loading' | 'compatible' | 'error'

export interface Ad5xState {
  backendAvailable: boolean
  apiStatus: Ad5xApiStatus
  snapshot: Ad5xSnapshot | null
  notifiedRevision: number
  error: string | null
}
