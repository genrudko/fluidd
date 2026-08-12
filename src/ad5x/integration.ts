export const AD5X_BACKEND_COMPONENT = 'plugins_ad5x'

export type ComponentSupport = (component: string) => boolean

export function isAd5xBackendAvailable (componentSupport: ComponentSupport): boolean {
  return componentSupport(AD5X_BACKEND_COMPONENT)
}
