import type { Ad5xApi, Ad5xSnapshot, Ad5xSocketTransport } from './types'
import { isAd5xSnapshot } from './types'

const SNAPSHOT_METHOD = 'server.plugins_ad5x.snapshot'

export class Ad5xApiClient implements Ad5xApi {
  constructor (private readonly socket: Ad5xSocketTransport) {}

  async getSnapshot (): Promise<Ad5xSnapshot> {
    const response = await this.socket.emit(SNAPSHOT_METHOD)

    if (!isAd5xSnapshot(response)) {
      throw new Error('Plugins AD5X snapshot response is incompatible with API 1.0')
    }

    return response
  }
}
