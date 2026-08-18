export const AD5X_BACKEND_COMPONENT = 'plugins_ad5x'
export const AD5X_ZCAL_COMPONENT = 'plugins_ad5x_zcal'

export type ComponentSupport = (component: string) => boolean

export function isSharedAd5xBackendAvailable (componentSupport: ComponentSupport): boolean {
  return componentSupport(AD5X_BACKEND_COMPONENT)
}

export function isZCalibrationBackendAvailable (componentSupport: ComponentSupport): boolean {
  return componentSupport(AD5X_ZCAL_COMPONENT)
}

export function isAd5xBackendAvailable (componentSupport: ComponentSupport): boolean {
  return isSharedAd5xBackendAvailable(componentSupport) ||
    isZCalibrationBackendAvailable(componentSupport)
}
