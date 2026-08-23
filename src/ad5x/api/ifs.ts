import { isAd5xSnapshot, type Ad5xSnapshot } from './types'

export type Ad5xIfsColorMode = 'solid' | 'dual' | 'tricolor' | 'gradient' | 'rainbow' | 'special'

export type Ad5xIfsAction = 'select_slot' | 'load_slot' | 'unload_slot'

export interface Ad5xIfsActionResult {
  ok: boolean
  action: Ad5xIfsAction
  slot: number
  result?: unknown
  error?: string
  snapshot: Ad5xSnapshot
}

export interface Ad5xIfsAppearance {
  color_mode: Ad5xIfsColorMode
  colors: readonly string[]
  finish: string
}

export interface Ad5xIfsSpool {
  source: string
  brand: string
  series: string
  name: string
  material: string
  variant: string
  spoolman_id: number | null
  spoolman_spool_id: number | null
  spoolman_filament_id: number | null
  remaining_g: number | null
  remaining_length_mm: number | null
  initial_g: number | null
  used_g: number | null
  used_length_mm: number | null
  location: string
  archived: boolean
  nozzle_temp: number | null
  bed_temp: number | null
  orca_material: string
  orca_filament_id: string
  orca_setting_id: string
}

export interface Ad5xIfsSlotPermissions {
  select_slot: boolean
  load_slot: boolean
  unload_slot: boolean
  blocked_reason: string
}

export interface Ad5xIfsSlot {
  slot: number
  present: boolean
  active: boolean
  stall: boolean
  material?: string
  color?: string
  spool: Ad5xIfsSpool
  appearance: Ad5xIfsAppearance
  metadata_status: string
  current_identity_status: string
  stale_metadata_available: boolean
  permissions: Ad5xIfsSlotPermissions
}

export interface Ad5xIfsOperation {
  state: string
  action: string
  slot: number
  error: string
}

export interface Ad5xIfsSpoolmanStatus {
  configured: boolean
  connected: boolean
  library_available: boolean
  binding_supported: boolean
  consumption_tracking_supported: boolean
  active_spool_id: number | null
  expected_active_spool_id: number | null
  expected_active_slot: number
  tracking_slot: number
  tracking_spool_id: number | null
  bindings: readonly unknown[]
  error: string
}

export interface Ad5xIfsModule {
  state: string
  active_slot: number
  slots: readonly Ad5xIfsSlot[]
  filament_at_toolhead: boolean | null
  print_state: string
  operation: Ad5xIfsOperation
  capabilities: Readonly<Record<string, unknown>>
  write_blocked_reason: string
  spoolman?: Ad5xIfsSpoolmanStatus
}

function isRecord (value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isFiniteNumberOrNull (value: unknown): value is number | null {
  return value === null || (typeof value === 'number' && Number.isFinite(value))
}

function isInteger (value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value)
}

function isIfsAction (value: unknown): value is Ad5xIfsAction {
  return value === 'select_slot' || value === 'load_slot' || value === 'unload_slot'
}

export function isAd5xIfsActionResult (
  value: unknown,
  expectedAction?: Ad5xIfsAction,
  expectedSlot?: number
): value is Ad5xIfsActionResult {
  if (!isRecord(value) || typeof value.ok !== 'boolean') return false
  if (!isIfsAction(value.action)) return false
  if (!isInteger(value.slot) || value.slot < 1 || value.slot > 4) return false
  if (expectedAction !== undefined && value.action !== expectedAction) return false
  if (expectedSlot !== undefined && value.slot !== expectedSlot) return false
  if (value.error !== undefined && typeof value.error !== 'string') return false
  if (!value.ok && typeof value.error !== 'string') return false
  return isAd5xSnapshot(value.snapshot)
}

function isStringArray (value: unknown): value is string[] {
  return Array.isArray(value) && value.every(item => typeof item === 'string')
}

function isSpool (value: unknown): value is Ad5xIfsSpool {
  if (!isRecord(value)) return false

  const stringFields = [
    'source', 'brand', 'series', 'name', 'material', 'variant', 'location',
    'orca_material', 'orca_filament_id', 'orca_setting_id'
  ] as const
  if (!stringFields.every(field => typeof value[field] === 'string')) return false

  const numericFields = [
    'spoolman_id', 'spoolman_spool_id', 'spoolman_filament_id', 'remaining_g',
    'remaining_length_mm', 'initial_g', 'used_g', 'used_length_mm',
    'nozzle_temp', 'bed_temp'
  ] as const
  if (!numericFields.every(field => isFiniteNumberOrNull(value[field]))) return false

  return typeof value.archived === 'boolean'
}

function isAppearance (value: unknown): value is Ad5xIfsAppearance {
  if (!isRecord(value)) return false

  return typeof value.color_mode === 'string' &&
    ['solid', 'dual', 'tricolor', 'gradient', 'rainbow', 'special'].includes(value.color_mode) &&
    isStringArray(value.colors) &&
    typeof value.finish === 'string'
}

function isPermissions (value: unknown): value is Ad5xIfsSlotPermissions {
  return isRecord(value) &&
    typeof value.select_slot === 'boolean' &&
    typeof value.load_slot === 'boolean' &&
    typeof value.unload_slot === 'boolean' &&
    typeof value.blocked_reason === 'string'
}

function isSlot (value: unknown): value is Ad5xIfsSlot {
  if (!isRecord(value)) return false

  return isInteger(value.slot) &&
    value.slot >= 1 &&
    value.slot <= 4 &&
    typeof value.present === 'boolean' &&
    typeof value.active === 'boolean' &&
    typeof value.stall === 'boolean' &&
    isSpool(value.spool) &&
    isAppearance(value.appearance) &&
    typeof value.metadata_status === 'string' &&
    typeof value.current_identity_status === 'string' &&
    typeof value.stale_metadata_available === 'boolean' &&
    isPermissions(value.permissions)
}

function isOperation (value: unknown): value is Ad5xIfsOperation {
  return isRecord(value) &&
    typeof value.state === 'string' &&
    typeof value.action === 'string' &&
    isInteger(value.slot) &&
    typeof value.error === 'string'
}

function isSpoolmanStatus (value: unknown): value is Ad5xIfsSpoolmanStatus {
  if (!isRecord(value)) return false

  return typeof value.configured === 'boolean' &&
    typeof value.connected === 'boolean' &&
    typeof value.library_available === 'boolean' &&
    typeof value.binding_supported === 'boolean' &&
    typeof value.consumption_tracking_supported === 'boolean' &&
    isFiniteNumberOrNull(value.active_spool_id) &&
    isFiniteNumberOrNull(value.expected_active_spool_id) &&
    isInteger(value.expected_active_slot) &&
    isInteger(value.tracking_slot) &&
    isFiniteNumberOrNull(value.tracking_spool_id) &&
    Array.isArray(value.bindings) &&
    typeof value.error === 'string'
}

export function isAd5xIfsModule (value: unknown): value is Ad5xIfsModule {
  if (!isRecord(value)) return false
  if (typeof value.state !== 'string') return false
  if (!isInteger(value.active_slot)) return false
  if (!Array.isArray(value.slots) || !value.slots.every(isSlot)) return false
  if (!(value.filament_at_toolhead === null || typeof value.filament_at_toolhead === 'boolean')) return false
  if (typeof value.print_state !== 'string') return false
  if (!isOperation(value.operation)) return false
  if (!isRecord(value.capabilities)) return false
  if (typeof value.write_blocked_reason !== 'string') return false
  if (value.spoolman !== undefined && !isSpoolmanStatus(value.spoolman)) return false

  return true
}

export function getIfsModule (snapshot: Ad5xSnapshot | null): Ad5xIfsModule | null {
  if (!snapshot) return null
  const module = snapshot.modules.ifs
  return isAd5xIfsModule(module) ? module : null
}

export function getIfsPrimaryColor (slot: Ad5xIfsSlot): string {
  const primary = slot.appearance.colors[0]
  if (primary && /^#[0-9A-F]{6}$/i.test(primary)) return primary
  if (slot.color && /^#[0-9A-F]{6}$/i.test(slot.color)) return slot.color
  return '#78909C'
}

export function getIfsRemainingPercent (slot: Ad5xIfsSlot): number | null {
  const remaining = slot.spool.remaining_g
  const initial = slot.spool.initial_g
  if (remaining === null || initial === null || initial <= 0) return null

  return Math.max(0, Math.min(100, (remaining / initial) * 100))
}
