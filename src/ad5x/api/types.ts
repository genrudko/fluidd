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

export interface Ad5xZCalibrationState {
  calibration: {
    state: string
    motion_actions_enabled: boolean
    offset_hook_enabled: boolean
    offset_hook_status: string
    offset_write_enabled: boolean
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
  job: {
    phase: string
    mode: string | null
    source_z_offset: number | null
    baseline_effective: number | null
    applied_target: number | null
  }
  runtime: {
    klippy: string
    print_state: string
    homed_axes: string
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

export interface Ad5xApi {
  getSnapshot: () => Promise<Ad5xSnapshot>
}

export interface Ad5xSocketTransport {
  emit: (method: string) => Promise<unknown>
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

export function isAd5xSnapshot (value: unknown): value is Ad5xSnapshot {
  if (!isRecord(value)) return false
  if (value.api_version !== '1.0') return false
  if (typeof value.backend_version !== 'string' || value.backend_version.length === 0) return false
  if (!isFiniteNumber(value.revision)) return false
  if (!isRecord(value.backend) || typeof value.backend.health !== 'string') return false
  if (!isRecord(value.modules)) return false

  return true
}

export function getZCalibrationModule (
  snapshot: Ad5xSnapshot
): Ad5xZCalibrationModule | null {
  const module = snapshot.modules.z_calibration
  if (!isRecord(module)) return null
  if (typeof module.schema_version !== 'string') return null
  if (typeof module.support !== 'string') return null
  if (typeof module.enabled !== 'boolean') return null
  if (typeof module.presence !== 'string') return null
  if (typeof module.available !== 'boolean') return null
  if (typeof module.health !== 'string') return null
  if (!Array.isArray(module.capabilities) || !module.capabilities.every(value => typeof value === 'string')) return null
  if (!isRecord(module.state)) return null

  const calibration = module.state.calibration
  const offset = module.state.offset
  const job = module.state.job
  const runtime = module.state.runtime
  const safety = module.state.safety

  if (!isRecord(calibration) ||
      typeof calibration.state !== 'string' ||
      typeof calibration.motion_actions_enabled !== 'boolean' ||
      typeof calibration.offset_hook_enabled !== 'boolean' ||
      typeof calibration.offset_hook_status !== 'string' ||
      typeof calibration.offset_write_enabled !== 'boolean') return null

  if (!isRecord(offset) ||
      !isFiniteNumber(offset.auto_alignment) ||
      !isFiniteNumber(offset.persistent_user) ||
      !isFiniteNumber(offset.slicer_job) ||
      !isFiniteNumber(offset.live_adjustment) ||
      !isFiniteNumber(offset.external_unknown) ||
      !isFiniteNumber(offset.known_total) ||
      !isNullableFiniteNumber(offset.effective) ||
      typeof offset.provenance_status !== 'string') return null

  if (!isRecord(job) ||
      typeof job.phase !== 'string' ||
      !(job.mode === null || typeof job.mode === 'string') ||
      !isNullableFiniteNumber(job.source_z_offset) ||
      !isNullableFiniteNumber(job.baseline_effective) ||
      !isNullableFiniteNumber(job.applied_target)) return null

  if (!isRecord(runtime) ||
      typeof runtime.klippy !== 'string' ||
      typeof runtime.print_state !== 'string' ||
      typeof runtime.homed_axes !== 'string') return null

  if (!isRecord(safety) ||
      typeof safety.fail_closed !== 'boolean' ||
      typeof safety.h7_role !== 'string' ||
      !(safety.last_error === null || typeof safety.last_error === 'string')) return null

  return module as unknown as Ad5xZCalibrationModule
}
