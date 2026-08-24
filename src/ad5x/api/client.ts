import type {
  Ad5xApi,
  Ad5xSnapshot,
  Ad5xSocketTransport,
  Ad5xZCalibrationApi,
  Ad5xZCalibrationDiagnostics,
  Ad5xZCalibrationReconcileResult,
  Ad5xZCalibrationSnapshot
} from './types'
import type {
  Ad5xIfsAction,
  Ad5xIfsActionResult,
  Ad5xIfsAppearance,
  Ad5xIfsMetadataResult,
  Ad5xIfsJobPreviewResult,
  Ad5xIfsLaunchPrepareResult,
  Ad5xIfsMappingDraftResult,
  Ad5xIfsSpool,
  Ad5xSpoolmanLibraryResult,
  Ad5xSpoolmanMutationResult
} from './ifs'
import {
  isAd5xIfsActionResult,
  isAd5xIfsJobPreviewResult,
  isAd5xIfsLaunchPrepareResult,
  isAd5xIfsMappingDraftResult,
  isAd5xIfsMetadataResult,
  isAd5xSpoolmanLibraryResult,
  isAd5xSpoolmanMutationResult
} from './ifs'
import {
  isAd5xSnapshot,
  isAd5xZCalibrationDiagnostics,
  isAd5xZCalibrationReconcileResult,
  isAd5xZCalibrationSnapshot
} from './types'

const SNAPSHOT_METHOD = 'server.plugins_ad5x.snapshot'
const IFS_ACTION_METHOD = 'server.plugins_ad5x.ifs.action'
const IFS_METADATA_METHOD = 'server.plugins_ad5x.ifs.metadata'
const IFS_JOB_PREVIEW_METHOD = 'server.plugins_ad5x.ifs.job.preview'
const IFS_MAPPING_DRAFT_METHOD = 'server.plugins_ad5x.ifs.job.mapping.draft'
const IFS_LAUNCH_PREPARE_METHOD = 'server.plugins_ad5x.ifs.job.launch.prepare'
const IFS_SPOOLMAN_LIBRARY_METHOD = 'server.plugins_ad5x.ifs.spoolman.library'
const IFS_SPOOLMAN_BIND_METHOD = 'server.plugins_ad5x.ifs.spoolman.bind'
const IFS_SPOOLMAN_UNBIND_METHOD = 'server.plugins_ad5x.ifs.spoolman.unbind'
const IFS_SPOOLMAN_REFRESH_METHOD = 'server.plugins_ad5x.ifs.spoolman.refresh'
const ZCAL_SNAPSHOT_METHOD = 'server.plugins_ad5x.z_calibration.snapshot'
const ZCAL_RECONCILE_METHOD = 'server.plugins_ad5x.z_calibration.reconcile'
const ZCAL_DIAGNOSTICS_METHOD = 'server.plugins_ad5x.z_calibration.diagnostics'

function isAd5xSocketTransport (value: unknown): value is Ad5xSocketTransport {
  return typeof value === 'object' &&
    value !== null &&
    'emit' in value &&
    typeof value.emit === 'function'
}

export function resolveAd5xSocketTransport (host: unknown): Ad5xSocketTransport {
  if (typeof host !== 'object' || host === null || !('$socket' in host)) {
    throw new Error('Fluidd socket transport is unavailable')
  }

  const socket = host.$socket
  if (!isAd5xSocketTransport(socket)) {
    throw new Error('Fluidd socket transport is incompatible')
  }

  return socket
}

export class Ad5xApiClient implements Ad5xApi, Ad5xZCalibrationApi {
  constructor (private readonly socket: Ad5xSocketTransport) {}

  async getSnapshot (): Promise<Ad5xSnapshot> {
    const response = await this.socket.emit(SNAPSHOT_METHOD)

    if (!isAd5xSnapshot(response)) {
      throw new Error('Plugins AD5X snapshot response is incompatible with API 1.0')
    }

    return response
  }

  async performIfsAction (action: Ad5xIfsAction, slot: number): Promise<Ad5xIfsActionResult> {
    if (!Number.isInteger(slot) || slot < 1 || slot > 4) {
      throw new Error(`Invalid IFS slot: ${slot}`)
    }

    const response = await this.socket.emit(IFS_ACTION_METHOD, {
      params: { action, slot }
    })

    if (!isAd5xIfsActionResult(response, action, slot)) {
      throw new Error('IFS action response is incompatible with API 1.0')
    }

    return response
  }

  async previewIfsJob (filename: string): Promise<Ad5xIfsJobPreviewResult> {
    const normalized = filename.trim()
    if (!normalized) throw new Error('IFS preview filename is required')
    const response = await this.socket.emit(IFS_JOB_PREVIEW_METHOD, {
      params: { filename: normalized }
    })
    if (!isAd5xIfsJobPreviewResult(response)) {
      throw new Error('IFS job preview response is incompatible with API 1.0')
    }
    return response
  }

  async draftIfsJobMapping (
    previewToken: string,
    resolvedToolMap: readonly number[],
    leveling?: 0 | 1
  ): Promise<Ad5xIfsMappingDraftResult> {
    const token = previewToken.trim()
    if (!/^[0-9a-f]{64}$/i.test(token)) throw new Error('Invalid IFS preview token')
    if (!resolvedToolMap.length || !resolvedToolMap.every(slot => Number.isInteger(slot) && slot >= 1 && slot <= 4)) {
      throw new Error('Invalid IFS resolved tool map')
    }
    if (leveling !== undefined && leveling !== 0 && leveling !== 1) throw new Error('Invalid IFS leveling mode')
    const response = await this.socket.emit(IFS_MAPPING_DRAFT_METHOD, {
      params: { preview_token: token, resolved_tool_map: [...resolvedToolMap], ...(leveling === undefined ? {} : { leveling }) }
    })
    if (!isAd5xIfsMappingDraftResult(response)) {
      throw new Error('IFS mapping draft response is incompatible with API 1.0')
    }
    return response
  }

  async prepareIfsJobLaunch (filename: string, previewToken: string, draftToken: string, resolvedToolMap: readonly number[], leveling: 0 | 1): Promise<Ad5xIfsLaunchPrepareResult> {
    const normalized = filename.trim()
    const preview = previewToken.trim()
    const draft = draftToken.trim()
    if (!normalized) throw new Error('IFS launch prepare filename is required')
    if (!/^[0-9a-f]{64}$/i.test(preview)) throw new Error('Invalid IFS preview token')
    if (!/^[0-9a-f]{64}$/i.test(draft)) throw new Error('Invalid IFS draft token')
    if (!resolvedToolMap.length || !resolvedToolMap.every(slot => Number.isInteger(slot) && slot >= 1 && slot <= 4)) throw new Error('Invalid IFS resolved tool map')
    if (leveling !== 0 && leveling !== 1) throw new Error('Invalid IFS leveling mode')
    const response = await this.socket.emit(IFS_LAUNCH_PREPARE_METHOD, { params: { filename: normalized, preview_token: preview, draft_token: draft, resolved_tool_map: [...resolvedToolMap], leveling } })
    if (!isAd5xIfsLaunchPrepareResult(response)) throw new Error('IFS launch prepare response is incompatible with API 1.0')
    return response
  }

  async updateIfsMetadata (
    slot: number,
    spool: Ad5xIfsSpool,
    appearance: Ad5xIfsAppearance
  ): Promise<Ad5xIfsMetadataResult> {
    if (!Number.isInteger(slot) || slot < 1 || slot > 4) throw new Error(`Invalid IFS slot: ${slot}`)
    const response = await this.socket.emit(IFS_METADATA_METHOD, {
      params: { slot, clear: false, spool, appearance }
    })
    if (!isAd5xIfsMetadataResult(response, slot)) {
      throw new Error('IFS metadata response is incompatible with API 1.0')
    }
    return response
  }

  async clearIfsMetadata (slot: number): Promise<Ad5xIfsMetadataResult> {
    if (!Number.isInteger(slot) || slot < 1 || slot > 4) throw new Error(`Invalid IFS slot: ${slot}`)
    const response = await this.socket.emit(IFS_METADATA_METHOD, { params: { slot, clear: true } })
    if (!isAd5xIfsMetadataResult(response, slot)) {
      throw new Error('IFS metadata response is incompatible with API 1.0')
    }
    return response
  }

  async getSpoolmanLibrary (query = ''): Promise<Ad5xSpoolmanLibraryResult> {
    const response = await this.socket.emit(IFS_SPOOLMAN_LIBRARY_METHOD, {
      params: { q: query.trim(), limit: 20, allow_archived: false }
    })
    if (!isAd5xSpoolmanLibraryResult(response)) {
      throw new Error('Spoolman library response is incompatible with API 1.0')
    }
    return response
  }

  async bindSpoolman (slot: number, spoolId: number): Promise<Ad5xSpoolmanMutationResult> {
    if (!Number.isInteger(slot) || slot < 1 || slot > 4) throw new Error(`Invalid IFS slot: ${slot}`)
    if (!Number.isInteger(spoolId) || spoolId <= 0) throw new Error(`Invalid Spoolman spool id: ${spoolId}`)
    const response = await this.socket.emit(IFS_SPOOLMAN_BIND_METHOD, {
      params: { slot, spool_id: spoolId, allow_archived: false }
    })
    if (!isAd5xSpoolmanMutationResult(response) ||
        (response.ok && (response.slot !== slot || response.spool_id !== spoolId))) {
      throw new Error('Spoolman bind response is incompatible with API 1.0')
    }
    return response
  }

  async unbindSpoolman (slot: number): Promise<Ad5xSpoolmanMutationResult> {
    if (!Number.isInteger(slot) || slot < 1 || slot > 4) throw new Error(`Invalid IFS slot: ${slot}`)
    const response = await this.socket.emit(IFS_SPOOLMAN_UNBIND_METHOD, {
      params: { slot, keep_metadata: true }
    })
    if (!isAd5xSpoolmanMutationResult(response) || (response.ok && response.slot !== slot)) {
      throw new Error('Spoolman unbind response is incompatible with API 1.0')
    }
    return response
  }

  async refreshSpoolman (slot: number): Promise<Ad5xSpoolmanMutationResult> {
    if (!Number.isInteger(slot) || slot < 0 || slot > 4) throw new Error(`Invalid IFS slot: ${slot}`)
    const response = await this.socket.emit(IFS_SPOOLMAN_REFRESH_METHOD, { params: { slot } })
    if (!isAd5xSpoolmanMutationResult(response) || (response.ok && response.slot !== slot)) {
      throw new Error('Spoolman refresh response is incompatible with API 1.0')
    }
    return response
  }

  async getZCalibrationSnapshot (): Promise<Ad5xZCalibrationSnapshot> {
    const response = await this.socket.emit(ZCAL_SNAPSHOT_METHOD)

    if (!isAd5xZCalibrationSnapshot(response)) {
      throw new Error('Z Calibration snapshot response is incompatible with API 1.0')
    }

    return response
  }

  async reconcileZCalibration (): Promise<Ad5xZCalibrationReconcileResult> {
    const response = await this.socket.emit(ZCAL_RECONCILE_METHOD)

    if (!isAd5xZCalibrationReconcileResult(response)) {
      throw new Error('Z Calibration reconcile response is incompatible with API 1.0')
    }

    return response
  }

  async getZCalibrationDiagnostics (): Promise<Ad5xZCalibrationDiagnostics> {
    const response = await this.socket.emit(ZCAL_DIAGNOSTICS_METHOD)

    if (!isAd5xZCalibrationDiagnostics(response)) {
      throw new Error('Z Calibration diagnostics response is incompatible with API 1.0')
    }

    return response
  }
}
