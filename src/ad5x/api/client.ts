import type {
  Ad5xApi,
  Ad5xSnapshot,
  Ad5xSocketTransport,
  Ad5xZCalibrationApi,
  Ad5xZCalibrationDiagnostics,
  Ad5xZCalibrationReconcileResult,
  Ad5xZCalibrationSnapshot
} from './types'
import {
  isAd5xSnapshot,
  isAd5xZCalibrationDiagnostics,
  isAd5xZCalibrationReconcileResult,
  isAd5xZCalibrationSnapshot
} from './types'

const SNAPSHOT_METHOD = 'server.plugins_ad5x.snapshot'
const ZCAL_SNAPSHOT_METHOD = 'server.plugins_ad5x.z_calibration.snapshot'
const ZCAL_RECONCILE_METHOD = 'server.plugins_ad5x.z_calibration.reconcile'
const ZCAL_DIAGNOSTICS_METHOD = 'server.plugins_ad5x.z_calibration.diagnostics'

export class Ad5xApiClient implements Ad5xApi, Ad5xZCalibrationApi {
  constructor (private readonly socket: Ad5xSocketTransport) {}

  async getSnapshot (): Promise<Ad5xSnapshot> {
    const response = await this.socket.emit(SNAPSHOT_METHOD)

    if (!isAd5xSnapshot(response)) {
      throw new Error('Plugins AD5X snapshot response is incompatible with API 1.0')
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
