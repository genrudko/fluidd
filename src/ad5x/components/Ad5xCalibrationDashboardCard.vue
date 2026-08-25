<template>
  <collapsable-card
    title="Калибровка Z"
    icon="$bedMesh"
    draggable
    layout-path="dashboard.ad5x-calibration-dashboard-card"
  >
    <template #menu>
      <app-btn
        icon
        data-test="ad5x-dashboard-refresh"
        :disabled="loading || actionLoading"
        @click="refresh"
      >
        <v-icon dense>
          $refresh
        </v-icon>
      </app-btn>

    </template>

    <v-card-text class="pt-2">
      <div
        v-if="loading && !snapshot"
        class="d-flex justify-center py-3"
      >
        <v-progress-circular
          indeterminate
          size="24"
        />
      </div>

      <v-alert
        v-else-if="error"
        class="mb-0"
        dense
        text
        type="warning"
      >
        {{ error }}
      </v-alert>

      <template v-else-if="snapshot">
        <div class="d-flex align-center justify-space-between mb-2">
          <div>
            <div class="text-subtitle-2">
              {{ ready ? 'Система готова' : 'Требует внимания' }}
            </div>
            <div class="text-caption text--secondary">
              Z-Mod выполняет физический Auto-Z
            </div>
          </div>
          <v-icon :color="ready ? 'success' : 'warning'">
            {{ ready ? '$check' : '$warning' }}
          </v-icon>
        </div>

        <v-divider class="mb-2" />

        <div class="ad5x-z-dashboard-grid">
          <div>
            <div class="text-caption text--secondary">
              Итоговый Z-offset
            </div>
            <div
              class="text-h6"
              data-test="ad5x-dashboard-effective"
            >
              {{ effectiveText }}
            </div>
          </div>
          <div>
            <div class="text-caption text--secondary">
              Перед печатью
            </div>
            <div
              class="text-body-2 font-weight-medium"
              data-test="ad5x-dashboard-preprint"
            >
              {{ preprintText }}
            </div>
          </div>
          <div>
            <div class="text-caption text--secondary">
              Карта стола
            </div>
            <div
              class="text-body-2 font-weight-medium"
              data-test="ad5x-dashboard-mesh"
            >
              {{ meshText }}
            </div>
          </div>
          <div>
            <div class="text-caption text--secondary">
              Материал
            </div>
            <div
              class="text-body-2 font-weight-medium"
              data-test="ad5x-dashboard-material"
            >
              {{ materialText }}
            </div>
          </div>
        </div>

        <v-divider class="my-3" />

        <div class="d-flex flex-wrap align-center">
          <v-switch
            :input-value="preprintEnabled"
            class="mt-0 me-3 mb-2"
            data-test="ad5x-dashboard-preprint-toggle"
            dense
            :disabled="controlsDisabled"
            hide-details
            label="Калибровка перед печатью"
            @change="setPreprint"
          />

          <app-btn
            class="me-2 mb-2"
            color="primary"
            data-test="ad5x-dashboard-home-z"
            :disabled="controlsDisabled"
            :loading="actionLoading === 'home'"
            small
            @click="homeZ"
          >
            <v-icon
              left
              small
            >
              $home
            </v-icon>
            Home Z
          </app-btn>


        </div>

        <v-alert
          v-if="actionError"
          class="mt-1 mb-0"
          dense
          text
          type="warning"
        >
          {{ actionError }}
        </v-alert>

        <div class="text-caption text--secondary mt-2">
          Перед печатью сначала определяется окончательная карта стола, затем выполняется Z-коррекция. Температуры берутся из текущего START_PRINT выбранного filament-профиля.
        </div>
      </template>
    </v-card-text>
  </collapsable-card>
</template>

<script lang="ts">
import Vue from 'vue'
import { Component } from 'vue-property-decorator'
import { Ad5xApiClient } from '@/ad5x/api/client'
import type {
  Ad5xSocketTransport,
  Ad5xZCalibrationSnapshot
} from '@/ad5x/api/types'
import type { AppFileWithMeta } from '@/store/files/types'

type DashboardAction = 'home' | 'preprint'
type AppFileWithFilamentWeights = AppFileWithMeta & { filament_weights?: number[] }

type FluiddSocket = Ad5xSocketTransport & {
  emit: (
    method: string,
    options?: {
      dispatch?: string
      params?: Record<string, unknown>
    }
  ) => Promise<unknown>
}

@Component({})
export default class Ad5xCalibrationDashboardCard extends Vue {
  snapshot: Ad5xZCalibrationSnapshot | null = null
  loading = false
  error: string | null = null
  actionLoading: DashboardAction | null = null
  actionError: string | null = null

  get ready (): boolean {
    const state = this.snapshot?.module.state
    return Boolean(
      this.snapshot?.module.health === 'ok' &&
      state?.calibration.motion_owner === 'zmod' &&
      state?.calibration.offset_write_enabled === false &&
      state?.safety.fail_closed === true
    )
  }

  get klippyReady (): boolean {
    return Boolean(this.$store.getters['printer/getKlippyReady'])
  }

  get printerBusy (): boolean {
    const state = String(this.$store.getters['printer/getPrinterState'] || '')
    return state === 'printing' || state === 'paused' || state === 'busy'
  }

  get controlsDisabled (): boolean {
    return !this.klippyReady || this.printerBusy || this.loading || this.actionLoading !== null
  }

  get effectiveText (): string {
    const value = this.snapshot?.module.state.offset.effective
    return typeof value === 'number' ? `${value.toFixed(3)} mm` : '—'
  }

  get meshTestMode (): number | null {
    const value = this.snapshot?.module.state.provenance.rc_path?.mesh_test
    return typeof value === 'number' ? value : null
  }

  get preprintEnabled (): boolean {
    return this.meshTestMode === 3
  }

  get preprintText (): string {
    if (this.meshTestMode === 3) return 'калибровка включена'
    if (this.meshTestMode === 0) return 'калибровка выключена'
    if (this.meshTestMode == null) return 'состояние неизвестно'
    return `режим Z-Mod MESH_TEST=${this.meshTestMode}`
  }

  get meshText (): string {
    const mesh = this.$store.getters['mesh/getCurrentMeshData'] as any
    const matrix = mesh?.probed_matrix ?? mesh?.mesh_matrix
    const range = matrix?.range
    const rawProfile = this.snapshot?.module.state.provenance.rc_path?.active_mesh_profile
    const profile = typeof rawProfile === 'string' && rawProfile.length > 0
      ? rawProfile
      : null

    if (typeof range === 'number') {
      return `${profile || 'активная'} · Δ ${range.toFixed(3)} mm`
    }
    return profile || 'не загружена'
  }

  get currentFile (): AppFileWithMeta | undefined {
    const filename = String(this.$store.state.printer?.printer?.print_stats?.filename || '')
    if (!filename) return undefined

    const parts = filename.split('/')
    const name = parts.pop() || ''
    const path = `gcodes/${parts.join('/')}`.replace(/\/$/, '')
    return this.$store.getters['files/getFile'](path, name) as AppFileWithMeta | undefined
  }

  get materialText (): string {
    const file = this.currentFile as AppFileWithFilamentWeights | undefined
    const types = file?.filament_type
    if (Array.isArray(types) && types.length > 0) {
      const weights = file?.filament_weights
      if (Array.isArray(weights) && weights.length === types.length) {
        const used = types.filter((type, index) => Boolean(type) && Number(weights[index]) > 0)
        if (used.length > 0) return [...new Set(used)].join(' + ')
      }
      return [...new Set(types.filter(Boolean))].join(' + ')
    }
    return 'нет metadata текущего задания'
  }

  private socket (): FluiddSocket {
    return (this as unknown as { $socket: FluiddSocket }).$socket
  }

  private apiClient (): Ad5xApiClient {
    return new Ad5xApiClient(this.socket())
  }

  private async runGcode (script: string): Promise<void> {
    await this.socket().emit('printer.gcode.script', {
      dispatch: 'console/onGcodeScript',
      params: { script }
    })
  }

  async refresh (): Promise<void> {
    if (this.loading) return
    this.loading = true
    this.error = null
    try {
      this.snapshot = await this.apiClient().getZCalibrationSnapshot()
    } catch (error: unknown) {
      this.error = error instanceof Error ? error.message : 'Не удалось получить состояние калибровки.'
    } finally {
      this.loading = false
    }
  }

  async setPreprint (enabled: boolean): Promise<void> {
    if (this.controlsDisabled) return
    this.actionLoading = 'preprint'
    this.actionError = null
    try {
      await this.runGcode(`ADZ_SET_PREPRINT ENABLED=${enabled ? 1 : 0}`)
      await this.refresh()
    } catch (error: unknown) {
      this.actionError = error instanceof Error
        ? `Не удалось изменить pre-print калибровку: ${error.message}`
        : 'Не удалось изменить pre-print калибровку.'
    } finally {
      this.actionLoading = null
    }
  }

  async homeZ (): Promise<void> {
    if (this.controlsDisabled) return
    this.actionLoading = 'home'
    this.actionError = null
    try {
      await this.runGcode('G28 Z')
      await this.refresh()
    } catch (error: unknown) {
      this.actionError = error instanceof Error
        ? `Homing Z не выполнен: ${error.message}`
        : 'Homing Z не выполнен.'
    } finally {
      this.actionLoading = null
    }
  }

  created (): void {
    this.refresh().catch(() => undefined)
  }
}
</script>

<style scoped>
.ad5x-z-dashboard-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px 16px;
}

@media (max-width: 599px) {
  .ad5x-z-dashboard-grid {
    grid-template-columns: 1fr;
  }
}
</style>
