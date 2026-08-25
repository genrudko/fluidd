export interface Ad5xBackendState {
  health: string
}

export interface Ad5xSnapshot {
  api_version: '1.0'
  backend_version: string
  revision: number
  backend: Ad5xBackendState
  modules: Readonly<Record<string, unknown>>
}

export interface Ad5xZCalibrationIntegration {
  policy_status: string
  policy_id: string | null
  hook_commands: readonly string[] | null
}

export interface Ad5xZCalibrationMachineAnchor {
  model: string
  policy_id?: string | null
  policy_loaded?: boolean
  runtime_available?: boolean
  active: boolean
  finalized: boolean
  shift: number
  measured_delta?: number | null
  persistent?: boolean | null
  base_profile?: string | null
  runtime_profile?: string | null
  point_count?: number
  status: string
  offset_component?: boolean
}

export interface Ad5xZCalibrationThermal {
  control_source: string
  bed_target: number | null
  extruder_target: number | null
  first_layer_bed_temp: number | null
  first_layer_extr_temp: number | null
  filament_type?: string | readonly string[] | null
  filament_name?: string | readonly string[] | null
  metadata_available: boolean
  bed_status: string
  extruder_status: string
}

export interface Ad5xZCalibrationPurge {
  selected_algorithm: string | null
  selected_macro: string | null
  effective_macro: string | null
  reason: string
  status: string
  force_kamp: boolean
  use_kamp: number
  selected_macro_available: boolean
  line_purge_available: boolean
  selectable_algorithms: readonly string[]
}

export interface Ad5xZCalibrationState {
  calibration: {
    state: string
    motion_actions_enabled: boolean
    motion_owner: string
    offset_hook_enabled: boolean
    offset_hook_status: string
    offset_write_enabled: boolean
    integration: Ad5xZCalibrationIntegration
  }
  offset: {
    auto_alignment: number
    persistent_user: number
    slicer_job: number
    live_adjustment: number
    external_unknown: number
    known_total: number
    effective: number | null
    provenance_status: string
  }
  machine_anchor?: Ad5xZCalibrationMachineAnchor
  provenance: {
    status: string
    model: string
    sources: Readonly<Record<string, string>>
    missing_components: readonly string[]
    actual_effective: number | null
    reported_homing_origin_z?: number | null
    requested_slicer_z_offset: number | null
    slicer_z_offset_effect: string
    rc_path: Readonly<Record<string, unknown>>
    machine_anchor?: Ad5xZCalibrationMachineAnchor
  }
  job: {
    phase: string
    requested_slicer_z_offset: number | null
    slicer_z_offset_effect: string
    filename?: string | null
    thermal?: Ad5xZCalibrationThermal
    purge?: Ad5xZCalibrationPurge
  }
  runtime: {
    klippy: string
    print_state: string
    homed_axes: string
    effective_valid?: boolean
  }
  safety: {
    fail_closed: boolean
    h7_role: string
    last_error: string | null
  }
}

export interface Ad5xZCalibrationModule {
  schema_version: string
  support: string
  enabled: boolean
  presence: string
  available: boolean
  health: string
  capabilities: readonly string[]
  state: Ad5xZCalibrationState
}

export interface Ad5xZCalibrationSnapshot {
  api_version: '1.0'
  module_version: string
  revision: number
  module: Ad5xZCalibrationModule
}

export interface Ad5xZCalibrationReconcileResult {
  revision: number
  module: Ad5xZCalibrationModule
}

export interface Ad5xZCalibrationDiagnosticEvent {
  schema_version: string
  sequence: number
  timestamp: number
  correlation_id: string
  event_type: string
  payload: Readonly<Record<string, unknown>>
}

export interface Ad5xZCalibrationDiagnostics {
  schema_version: string
  events: readonly Ad5xZCalibrationDiagnosticEvent[]
}

export interface Ad5xApi {
  getSnapshot: () => Promise<Ad5xSnapshot>
}

export interface Ad5xZCalibrationApi {
  getZCalibrationSnapshot: () => Promise<Ad5xZCalibrationSnapshot>
  reconcileZCalibration: () => Promise<Ad5xZCalibrationReconcileResult>
  getZCalibrationDiagnostics: () => Promise<Ad5xZCalibrationDiagnostics>
}

export interface Ad5xSocketRequestOptions {
  params?: Readonly<Record<string, unknown>>
}

export interface Ad5xSocketTransport {
  emit: (method: string, options?: Ad5xSocketRequestOptions) => Promise<unknown>
}

function isRecord (value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isFiniteNumber (value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value)
}

function isNullableFiniteNumber (value: unknown): value is number | null {
  return value === null || isFiniteNumber(value)
}

function isStringArray (value: unknown): value is string[] {
  return Array.isArray(value) && value.every(item => typeof item === 'string')
}

function isNullableStringArray (value: unknown): value is string[] | null {
  return value === null || isStringArray(value)
}

function isNullableStringOrArray (value: unknown): value is string | readonly string[] | null {
  return value === null || typeof value === 'string' || isStringArray(value)
}

function isAd5xZCalibrationThermal (value: unknown): value is Ad5xZCalibrationThermal {
  return isRecord(value) &&
    typeof value.control_source === 'string' &&
    isNullableFiniteNumber(value.bed_target) &&
    isNullableFiniteNumber(value.extruder_target) &&
    isNullableFiniteNumber(value.first_layer_bed_temp) &&
    isNullableFiniteNumber(value.first_layer_extr_temp) &&
    (value.filament_type === undefined || isNullableStringOrArray(value.filament_type)) &&
    (value.filament_name === undefined || isNullableStringOrArray(value.filament_name)) &&
    typeof value.metadata_available === 'boolean' &&
    typeof value.bed_status === 'string' &&
    typeof value.extruder_status === 'string'
}

function isAd5xZCalibrationPurge (value: unknown): value is Ad5xZCalibrationPurge {
  return isRecord(value) &&
    (value.selected_algorithm === null || typeof value.selected_algorithm === 'string') &&
    (value.selected_macro === null || typeof value.selected_macro === 'string') &&
    (value.effective_macro === null || typeof value.effective_macro === 'string') &&
    typeof value.reason === 'string' &&
    typeof value.status === 'string' &&
    typeof value.force_kamp === 'boolean' &&
    isFiniteNumber(value.use_kamp) &&
    typeof value.selected_macro_available === 'boolean' &&
    typeof value.line_purge_available === 'boolean' &&
    isStringArray(value.selectable_algorithms)
}

function isAd5xZCalibrationMachineAnchor (value: unknown): value is Ad5xZCalibrationMachineAnchor {
  if (!isRecord(value)) return false
  if (typeof value.model !== 'string' || value.model.length === 0) return false
  if (typeof value.active !== 'boolean' || typeof value.finalized !== 'boolean') return false
  if (!isFiniteNumber(value.shift) || typeof value.status !== 'string') return false
  if (!(value.policy_id === undefined || value.policy_id === null || typeof value.policy_id === 'string')) return false
  if (!(value.policy_loaded === undefined || typeof value.policy_loaded === 'boolean')) return false
  if (!(value.runtime_available === undefined || typeof value.runtime_available === 'boolean')) return false
  if (!(value.measured_delta === undefined || isNullableFiniteNumber(value.measured_delta))) return false
  if (!(value.persistent === undefined || value.persistent === null || typeof value.persistent === 'boolean')) return false
  if (!(value.base_profile === undefined || value.base_profile === null || typeof value.base_profile === 'string')) return false
  if (!(value.runtime_profile === undefined || value.runtime_profile === null || typeof value.runtime_profile === 'string')) return false
  if (!(value.point_count === undefined || isFiniteNumber(value.point_count))) return false
  if (!(value.offset_component === undefined || typeof value.offset_component === 'boolean')) return false
  return true
}

export function isAd5xSnapshot (value: unknown): value is Ad5xSnapshot {
  if (!isRecord(value)) return false
  if (value.api_version !== '1.0') return false
  if (typeof value.backend_version !== 'string' || value.backend_version.length === 0) return false
  if (!isFiniteNumber(value.revision)) return false
  if (!isRecord(value.backend) || typeof value.backend.health !== 'string') return false
  if (!isRecord(value.modules)) return false

  return true
}

export function isAd5xZCalibrationModule (value: unknown): value is Ad5xZCalibrationModule {
  if (!isRecord(value)) return false
  if (typeof value.schema_version !== 'string' || value.schema_version.length === 0) return false
  if (typeof value.support !== 'string') return false
  if (typeof value.enabled !== 'boolean') return false
  if (typeof value.presence !== 'string') return false
  if (typeof value.available !== 'boolean') return false
  if (typeof value.health !== 'string') return false
  if (!isStringArray(value.capabilities)) return false
  if (!isRecord(value.state)) return false

  const calibration = value.state.calibration
  const offset = value.state.offset
  const machineAnchor = value.state.machine_anchor
  const provenance = value.state.provenance
  const requiresMachineAnchor = value.capabilities.includes('transient_machine_anchor_provenance')
  const requiresPurgePolicy = value.capabilities.includes('purge_policy_provenance')
  const job = value.state.job
  const runtime = value.state.runtime
  const safety = value.state.safety

  if (!isRecord(calibration) ||
      typeof calibration.state !== 'string' ||
      typeof calibration.motion_actions_enabled !== 'boolean' ||
      typeof calibration.motion_owner !== 'string' ||
      typeof calibration.offset_hook_enabled !== 'boolean' ||
      typeof calibration.offset_hook_status !== 'string' ||
      typeof calibration.offset_write_enabled !== 'boolean' ||
      !isRecord(calibration.integration) ||
      typeof calibration.integration.policy_status !== 'string' ||
      !(calibration.integration.policy_id === null || typeof calibration.integration.policy_id === 'string') ||
      !isNullableStringArray(calibration.integration.hook_commands)) return false

  if (!isRecord(offset) ||
      !isFiniteNumber(offset.auto_alignment) ||
      !isFiniteNumber(offset.persistent_user) ||
      !isFiniteNumber(offset.slicer_job) ||
      !isFiniteNumber(offset.live_adjustment) ||
      !isFiniteNumber(offset.external_unknown) ||
      !isFiniteNumber(offset.known_total) ||
      !isNullableFiniteNumber(offset.effective) ||
      typeof offset.provenance_status !== 'string') return false

  if (requiresMachineAnchor && !isAd5xZCalibrationMachineAnchor(machineAnchor)) return false
  if (!(machineAnchor === undefined || isAd5xZCalibrationMachineAnchor(machineAnchor))) return false

  if (!isRecord(provenance) ||
      typeof provenance.status !== 'string' ||
      typeof provenance.model !== 'string' ||
      !isRecord(provenance.sources) ||
      !Object.values(provenance.sources).every(source => typeof source === 'string') ||
      !isStringArray(provenance.missing_components) ||
      !isNullableFiniteNumber(provenance.actual_effective) ||
      !(provenance.reported_homing_origin_z === undefined || isNullableFiniteNumber(provenance.reported_homing_origin_z)) ||
      !isNullableFiniteNumber(provenance.requested_slicer_z_offset) ||
      typeof provenance.slicer_z_offset_effect !== 'string' ||
      !isRecord(provenance.rc_path) ||
      !(provenance.machine_anchor === undefined || isAd5xZCalibrationMachineAnchor(provenance.machine_anchor)) ||
      (requiresMachineAnchor && !isAd5xZCalibrationMachineAnchor(provenance.machine_anchor))) return false

  if (!isRecord(job) ||
      typeof job.phase !== 'string' ||
      !isNullableFiniteNumber(job.requested_slicer_z_offset) ||
      typeof job.slicer_z_offset_effect !== 'string' ||
      !(job.filename === undefined || job.filename === null || typeof job.filename === 'string') ||
      !(job.thermal === undefined || isAd5xZCalibrationThermal(job.thermal)) ||
      !(job.purge === undefined || isAd5xZCalibrationPurge(job.purge)) ||
      (requiresPurgePolicy && !isAd5xZCalibrationPurge(job.purge))) return false

  if (!isRecord(runtime) ||
      typeof runtime.klippy !== 'string' ||
      typeof runtime.print_state !== 'string' ||
      typeof runtime.homed_axes !== 'string' ||
      !(runtime.effective_valid === undefined || typeof runtime.effective_valid === 'boolean')) return false

  if (!isRecord(safety) ||
      typeof safety.fail_closed !== 'boolean' ||
      typeof safety.h7_role !== 'string' ||
      !(safety.last_error === null || typeof safety.last_error === 'string')) return false

  return true
}

export function isAd5xZCalibrationSnapshot (value: unknown): value is Ad5xZCalibrationSnapshot {
  if (!isRecord(value)) return false
  if (value.api_version !== '1.0') return false
  if (typeof value.module_version !== 'string' || value.module_version.length === 0) return false
  if (!isFiniteNumber(value.revision)) return false

  return isAd5xZCalibrationModule(value.module)
}

export function isAd5xZCalibrationReconcileResult (
  value: unknown
): value is Ad5xZCalibrationReconcileResult {
  return isRecord(value) &&
    isFiniteNumber(value.revision) &&
    isAd5xZCalibrationModule(value.module)
}

export function isAd5xZCalibrationDiagnostics (
  value: unknown
): value is Ad5xZCalibrationDiagnostics {
  if (!isRecord(value) || typeof value.schema_version !== 'string' || !Array.isArray(value.events)) return false

  return value.events.every(event =>
    isRecord(event) &&
    typeof event.schema_version === 'string' &&
    isFiniteNumber(event.sequence) &&
    isFiniteNumber(event.timestamp) &&
    typeof event.correlation_id === 'string' &&
    typeof event.event_type === 'string' &&
    isRecord(event.payload)
  )
}

// Compatibility helper for the pre-coexistence shared snapshot shape.
// New UI must consume the standalone Z Calibration snapshot instead.
export function getZCalibrationModule (
  snapshot: Ad5xSnapshot
): Ad5xZCalibrationModule | null {
  const module = snapshot.modules.z_calibration
  return isAd5xZCalibrationModule(module) ? module : null
}
