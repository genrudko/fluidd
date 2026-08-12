import type { Ad5xApi, Ad5xCapabilities, Ad5xSocketTransport } from './types'

const CAPABILITIES_METHOD = 'plugins_ad5x.get_capabilities'

function isCapabilitiesPayload (value: unknown): value is Ad5xCapabilities {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

export class Ad5xApiClient implements Ad5xApi {
  constructor (private readonly socket: Ad5xSocketTransport) {}

  async getCapabilities (): Promise<Ad5xCapabilities> {
    const response = await this.socket.emit(CAPABILITIES_METHOD)

    if (!isCapabilitiesPayload(response)) {
      throw new Error('Plugins AD5X capabilities response must be an object')
    }

    return response
  }
}
