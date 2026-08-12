import { Ad5xApiClient } from '../client'

describe('Ad5xApiClient', () => {
  it('uses the existing Fluidd socket transport for the capability seam', async () => {
    const payload = { modules: ['diagnostic'] }
    const emit = vi.fn().mockResolvedValue(payload)
    const client = new Ad5xApiClient({ emit })

    await expect(client.getCapabilities()).resolves.toEqual(payload)
    expect(emit).toHaveBeenCalledOnce()
    expect(emit).toHaveBeenCalledWith('plugins_ad5x.get_capabilities')
  })

  it('rejects a non-object capability payload without inventing a schema', async () => {
    const client = new Ad5xApiClient({
      emit: vi.fn().mockResolvedValue('unexpected')
    })

    await expect(client.getCapabilities()).rejects.toThrow(
      'Plugins AD5X capabilities response must be an object'
    )
  })
})
