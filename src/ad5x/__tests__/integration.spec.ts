import {
  AD5X_BACKEND_COMPONENT,
  AD5X_ZCAL_COMPONENT,
  isAd5xBackendAvailable,
  isSharedAd5xBackendAvailable,
  isZCalibrationBackendAvailable
} from '../integration'

describe('AD5X backend integration gate', () => {
  it('stays hidden when neither Plugins AD5X component is present', () => {
    const componentSupport = vi.fn().mockReturnValue(false)

    expect(isAd5xBackendAvailable(componentSupport)).toBe(false)
    expect(componentSupport).toHaveBeenCalledWith(AD5X_BACKEND_COMPONENT)
    expect(componentSupport).toHaveBeenCalledWith(AD5X_ZCAL_COMPONENT)
  })

  it('allows the integration when the shared backend is present', () => {
    const componentSupport = vi.fn((component: string) => component === AD5X_BACKEND_COMPONENT)

    expect(isSharedAd5xBackendAvailable(componentSupport)).toBe(true)
    expect(isZCalibrationBackendAvailable(componentSupport)).toBe(false)
    expect(isAd5xBackendAvailable(componentSupport)).toBe(true)
  })

  it('allows the integration when only the standalone Z Calibration backend is present', () => {
    const componentSupport = vi.fn((component: string) => component === AD5X_ZCAL_COMPONENT)

    expect(isSharedAd5xBackendAvailable(componentSupport)).toBe(false)
    expect(isZCalibrationBackendAvailable(componentSupport)).toBe(true)
    expect(isAd5xBackendAvailable(componentSupport)).toBe(true)
  })
})
