import { Ad5xApiClient } from '../client'

function snapshot () {
  return {
    api_version: '1.0',
    backend_version: '0.1.2',
    revision: 7,
    backend: { health: 'ok' },
    modules: {}
  }
}

describe('Ad5xApiClient', () => {
  it('uses the canonical Moonraker snapshot RPC through the Fluidd socket transport', async () => {
    const payload = snapshot()
    const emit = vi.fn().mockResolvedValue(payload)
    const client = new Ad5xApiClient({ emit })

    await expect(client.getSnapshot()).resolves.toEqual(payload)
    expect(emit).toHaveBeenCalledOnce()
    expect(emit).toHaveBeenCalledWith('server.plugins_ad5x.snapshot')
  })

  it('rejects a non-object snapshot payload', async () => {
    const client = new Ad5xApiClient({
      emit: vi.fn().mockResolvedValue('unexpected')
    })

    await expect(client.getSnapshot()).rejects.toThrow(
      'Plugins AD5X snapshot response is incompatible with API 1.0'
    )
  })

  it('rejects a snapshot from a different API contract', async () => {
    const payload = {
      ...snapshot(),
      api_version: '2.0'
    }
    const client = new Ad5xApiClient({
      emit: vi.fn().mockResolvedValue(payload)
    })

    await expect(client.getSnapshot()).rejects.toThrow(
      'Plugins AD5X snapshot response is incompatible with API 1.0'
    )
  })

  it('rejects a malformed snapshot envelope instead of inventing defaults', async () => {
    const payload = {
      api_version: '1.0',
      backend_version: '0.1.2',
      revision: 1,
      backend: { health: 'ok' }
    }
    const client = new Ad5xApiClient({
      emit: vi.fn().mockResolvedValue(payload)
    })

    await expect(client.getSnapshot()).rejects.toThrow(
      'Plugins AD5X snapshot response is incompatible with API 1.0'
    )
  })
})
