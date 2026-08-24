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

export interface Ad5xIfsMetadataResult {
  ok: boolean
  slot: number
  result?: string
  error?: string
  snapshot: Ad5xSnapshot
}

export interface Ad5xIfsMetadataDraft {
  spool: Ad5xIfsSpool
  appearance: Ad5xIfsAppearance
}

export type Ad5xIfsPreprintStatus = 'unavailable' | 'ready' | 'warning' | 'blocked'
export type Ad5xIfsPreprintRowState = 'ready' | 'unassigned' | 'slot_missing' | 'slot_empty'

export interface Ad5xIfsPreprintRequirement {
  material: string
  color: string
}

export interface Ad5xIfsPreprintAssignment {
  slot: number
  present: boolean
  metadata_status: string
  spool: Readonly<Record<string, unknown>>
  appearance: Readonly<Record<string, unknown>>
}

export interface Ad5xIfsPreprintRow {
  tool: number
  requirement: Ad5xIfsPreprintRequirement
  assignment: Ad5xIfsPreprintAssignment | null
  state: Ad5xIfsPreprintRowState
}

export interface Ad5xIfsPreprintSummary {
  required_tools: number
  assigned_tools: number
  ready_tools: number
}

export interface Ad5xIfsPreprintPlan {
  available: boolean
  source: string
  filename: string
  status: Ad5xIfsPreprintStatus
  rows: readonly Ad5xIfsPreprintRow[]
  warnings: readonly string[]
  summary: Ad5xIfsPreprintSummary
  auto_assign: Readonly<Record<string, unknown>>
  messages: readonly string[]
  error: string
}

export interface Ad5xIfsJobPreview {
  available: boolean
  source: string
  filename: string
  requirements: readonly Readonly<Record<string, unknown>>[]
  assignments: readonly Readonly<Record<string, unknown>>[]
  allowed_tool_count: number
  resolved_tool_map: readonly number[]
  auto_assign: Readonly<Record<string, unknown>>
  messages: readonly string[]
  error: string
}

export interface Ad5xIfsJobPreviewResult {
  ok: boolean
  filename: string
  error?: string
  job_preview?: Ad5xIfsJobPreview
  preview_token?: string
  snapshot?: Ad5xSnapshot
}

export interface Ad5xIfsMappingDraft {
  status: string
  mapping_source: string
  filename: string
  preview_token: string
  draft_token: string
  allowed_tool_count: number
  resolved_tool_map: readonly number[]
  provider_resolved_tool_map: readonly number[]
  assignments: readonly Readonly<Record<string, unknown>>[]
  modified: boolean
  blockers: readonly string[]
  warnings: readonly string[]
}

export interface Ad5xIfsMappingDraftResult {
  ok: boolean
  error?: string
  mapping_draft?: Ad5xIfsMappingDraft
  provider_auto_assign?: Readonly<Record<string, unknown>>
  preprint_plan?: Ad5xIfsPreprintPlan
  launch_gate?: Readonly<Record<string, unknown>>
  snapshot: Ad5xSnapshot
}

export interface Ad5xIfsProviderState {
  name: string
  mode: string
  supported_modes: readonly string[]
  ifs_manager_supported: boolean
  maintenance_suspended: boolean
}

export interface Ad5xIfsOperations {
  select_slot: boolean
  load_slot: boolean
  unload_slot: boolean
  manage: boolean
  preview_job?: boolean
}

export interface Ad5xSpoolmanInventory {
  remaining_g: number | null
  remaining_length_mm: number | null
  initial_g: number | null
  used_g: number | null
  used_length_mm: number | null
  location: string
  archived: boolean
}

export interface Ad5xSpoolmanLibraryItem {
  spoolman_spool_id: number
  spoolman_filament_id: number | null
  spool: Ad5xIfsSpool
  appearance: Ad5xIfsAppearance
  inventory: Ad5xSpoolmanInventory
}

export interface Ad5xSpoolmanLibraryResult {
  ok: boolean
  query?: string
  items: readonly Ad5xSpoolmanLibraryItem[]
  count?: number
  error?: string
}

export interface Ad5xSpoolmanMutationResult {
  ok: boolean
  slot?: number
  spool_id?: number
  result?: unknown
  updated?: number
  errors?: readonly unknown[]
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
  available?: boolean
  state: string
  active_slot: number
  slots: readonly Ad5xIfsSlot[]
  filament_at_toolhead: boolean | null
  print_state: string
  operation: Ad5xIfsOperation
  capabilities: Readonly<Record<string, unknown>>
  write_blocked_reason: string
  preprint_plan: Ad5xIfsPreprintPlan
  job_preview?: Ad5xIfsJobPreview
  provider_mode?: string
  maintenance_suspended?: boolean
  provider?: Ad5xIfsProviderState
  operations?: Ad5xIfsOperations
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

export function isAd5xIfsMetadataResult (
  value: unknown,
  expectedSlot?: number
): value is Ad5xIfsMetadataResult {
  if (!isRecord(value) || typeof value.ok !== 'boolean') return false
  if (!isInteger(value.slot) || value.slot < 0 || value.slot > 4) return false
  if (expectedSlot !== undefined && value.slot !== expectedSlot) return false
  if (value.result !== undefined && typeof value.result !== 'string') return false
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

function isPositiveIntegerOrNull (value: unknown): value is number | null {
  return value === null || (isInteger(value) && value > 0)
}

function isSpoolmanInventory (value: unknown): value is Ad5xSpoolmanInventory {
  if (!isRecord(value)) return false
  return isFiniteNumberOrNull(value.remaining_g) &&
    isFiniteNumberOrNull(value.remaining_length_mm) &&
    isFiniteNumberOrNull(value.initial_g) &&
    isFiniteNumberOrNull(value.used_g) &&
    isFiniteNumberOrNull(value.used_length_mm) &&
    typeof value.location === 'string' &&
    typeof value.archived === 'boolean'
}

function isSpoolmanLibraryItem (value: unknown): value is Ad5xSpoolmanLibraryItem {
  return isRecord(value) &&
    isInteger(value.spoolman_spool_id) && value.spoolman_spool_id > 0 &&
    isPositiveIntegerOrNull(value.spoolman_filament_id) &&
    isSpool(value.spool) &&
    isAppearance(value.appearance) &&
    isSpoolmanInventory(value.inventory)
}

export function isAd5xSpoolmanLibraryResult (value: unknown): value is Ad5xSpoolmanLibraryResult {
  if (!isRecord(value) || typeof value.ok !== 'boolean' || !Array.isArray(value.items)) return false
  if (!value.items.every(isSpoolmanLibraryItem)) return false
  if (value.query !== undefined && typeof value.query !== 'string') return false
  if (value.count !== undefined && (!isInteger(value.count) || value.count < 0)) return false
  if (value.error !== undefined && typeof value.error !== 'string') return false
  return value.ok || typeof value.error === 'string'
}

export function isAd5xSpoolmanMutationResult (value: unknown): value is Ad5xSpoolmanMutationResult {
  if (!isRecord(value) || typeof value.ok !== 'boolean' || !isAd5xSnapshot(value.snapshot)) return false
  if (value.slot !== undefined && (!isInteger(value.slot) || value.slot < 0 || value.slot > 4)) return false
  if (value.spool_id !== undefined && (!isInteger(value.spool_id) || value.spool_id <= 0)) return false
  if (value.updated !== undefined && (!isInteger(value.updated) || value.updated < 0)) return false
  if (value.errors !== undefined && !Array.isArray(value.errors)) return false
  if (value.error !== undefined && typeof value.error !== 'string') return false
  return value.ok || typeof value.error === 'string'
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

function isPreprintAssignment (value: unknown): value is Ad5xIfsPreprintAssignment {
  return isRecord(value) &&
    isInteger(value.slot) && value.slot > 0 &&
    typeof value.present === 'boolean' &&
    typeof value.metadata_status === 'string' &&
    isRecord(value.spool) &&
    isRecord(value.appearance)
}

function isPreprintRow (value: unknown): value is Ad5xIfsPreprintRow {
  if (!isRecord(value) || !isInteger(value.tool) || value.tool < 0) return false
  if (!isRecord(value.requirement)) return false
  if (typeof value.requirement.material !== 'string' || typeof value.requirement.color !== 'string') return false
  if (!(value.assignment === null || isPreprintAssignment(value.assignment))) return false
  return value.state === 'ready' || value.state === 'unassigned' || value.state === 'slot_missing' || value.state === 'slot_empty'
}

function isPreprintSummary (value: unknown): value is Ad5xIfsPreprintSummary {
  return isRecord(value) &&
    isInteger(value.required_tools) && value.required_tools >= 0 &&
    isInteger(value.assigned_tools) && value.assigned_tools >= 0 &&
    isInteger(value.ready_tools) && value.ready_tools >= 0
}

export function isAd5xIfsPreprintPlan (value: unknown): value is Ad5xIfsPreprintPlan {
  if (!isRecord(value) || typeof value.available !== 'boolean') return false
  if (typeof value.source !== 'string' || typeof value.filename !== 'string') return false
  if (!(value.status === 'unavailable' || value.status === 'ready' || value.status === 'warning' || value.status === 'blocked')) return false
  if (!Array.isArray(value.rows) || !value.rows.every(isPreprintRow)) return false
  if (!isStringArray(value.warnings) || !isPreprintSummary(value.summary)) return false
  if (!isRecord(value.auto_assign) || !isStringArray(value.messages) || typeof value.error !== 'string') return false
  return true
}

function isSlotMap (value: unknown): value is number[] {
  return Array.isArray(value) && value.every(slot => isInteger(slot) && slot >= 1 && slot <= 4)
}

function isJobPreview (value: unknown): value is Ad5xIfsJobPreview {
  return isRecord(value) &&
    typeof value.available === 'boolean' &&
    typeof value.source === 'string' &&
    typeof value.filename === 'string' &&
    Array.isArray(value.requirements) &&
    Array.isArray(value.assignments) &&
    isInteger(value.allowed_tool_count) && value.allowed_tool_count >= 0 &&
    isSlotMap(value.resolved_tool_map) &&
    isRecord(value.auto_assign) &&
    isStringArray(value.messages) &&
    typeof value.error === 'string'
}

export function isAd5xIfsJobPreviewResult (value: unknown): value is Ad5xIfsJobPreviewResult {
  if (!isRecord(value) || typeof value.ok !== 'boolean' || typeof value.filename !== 'string') return false
  if (!value.ok) return typeof value.error === 'string'
  return isJobPreview(value.job_preview) &&
    typeof value.preview_token === 'string' && /^[0-9a-f]{64}$/i.test(value.preview_token) &&
    isAd5xSnapshot(value.snapshot)
}

function isMappingDraft (value: unknown): value is Ad5xIfsMappingDraft {
  return isRecord(value) &&
    typeof value.status === 'string' &&
    typeof value.mapping_source === 'string' &&
    typeof value.filename === 'string' &&
    typeof value.preview_token === 'string' &&
    typeof value.draft_token === 'string' &&
    isInteger(value.allowed_tool_count) && value.allowed_tool_count >= 0 &&
    isSlotMap(value.resolved_tool_map) &&
    isSlotMap(value.provider_resolved_tool_map) &&
    Array.isArray(value.assignments) &&
    typeof value.modified === 'boolean' &&
    isStringArray(value.blockers) &&
    isStringArray(value.warnings)
}

export function isAd5xIfsMappingDraftResult (value: unknown): value is Ad5xIfsMappingDraftResult {
  if (!isRecord(value) || typeof value.ok !== 'boolean' || !isAd5xSnapshot(value.snapshot)) return false
  if (!value.ok) {
    return typeof value.error === 'string' &&
      (value.mapping_draft === undefined || isMappingDraft(value.mapping_draft))
  }
  return isMappingDraft(value.mapping_draft) &&
    isRecord(value.provider_auto_assign) &&
    isAd5xIfsPreprintPlan(value.preprint_plan) &&
    isRecord(value.launch_gate)
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

function isProviderState (value: unknown): value is Ad5xIfsProviderState {
  return isRecord(value) &&
    typeof value.name === 'string' &&
    typeof value.mode === 'string' &&
    isStringArray(value.supported_modes) &&
    typeof value.ifs_manager_supported === 'boolean' &&
    typeof value.maintenance_suspended === 'boolean'
}

function isIfsOperations (value: unknown): value is Ad5xIfsOperations {
  return isRecord(value) &&
    typeof value.select_slot === 'boolean' &&
    typeof value.load_slot === 'boolean' &&
    typeof value.unload_slot === 'boolean' &&
    typeof value.manage === 'boolean' &&
    (value.preview_job === undefined || typeof value.preview_job === 'boolean')
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
  if (!isAd5xIfsPreprintPlan(value.preprint_plan)) return false
  if (value.job_preview !== undefined && !isJobPreview(value.job_preview)) return false
  if (value.provider_mode !== undefined && typeof value.provider_mode !== 'string') return false
  if (value.maintenance_suspended !== undefined && typeof value.maintenance_suspended !== 'boolean') return false
  if (value.provider !== undefined && !isProviderState(value.provider)) return false
  if (value.operations !== undefined && !isIfsOperations(value.operations)) return false
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
