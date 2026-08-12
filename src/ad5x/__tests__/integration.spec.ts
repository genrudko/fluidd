import { AD5X_BACKEND_COMPONENT, isAd5xBackendAvailable } from '../integration'

describe('AD5X backend integration gate', () => {
  it('uses the provisional Moonraker component identifier', () => {
    const componentSupport = vi.fn().mockReturnValue(false)

    expect(isAd5xBackendAvailable(componentSupport)).toBe(false)
    expect(componentSupport).toHaveBeenCalledOnce()
    expect(componentSupport).toHaveBeenCalledWith(AD5X_BACKEND_COMPONENT)
  })

  it('allows the integration when Fluidd reports component support', () => {
    const componentSupport = vi.fn().mockReturnValue(true)

    expect(isAd5xBackendAvailable(componentSupport)).toBe(true)
  })
})
