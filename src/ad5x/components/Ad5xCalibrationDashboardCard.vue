<template>
  <collapsable-card
    title="Подготовка печати"
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
              {{ statusTitle }}
            </div>
            <div class="text-caption text--secondary">
              {{ statusCaption }}
            </div>
          </div>
          <v-icon :color="statusColor">
            {{ statusIcon }}
          </v-icon>
        </div>

        <v-divider class="mb-2" />

        <div class="ad5x-z-dashboard-grid">
          <div>
            <div class="text-caption text--secondary">
              Z-offset
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
              Привязка Auto-Z
            </div>
            <div
              class="text-body-2 font-weight-medium"
              data-test="ad5x-dashboard-anchor"
            >
              {{ anchorText }}
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
              Стол для Auto-Z
            </div>
            <div
              class="text-body-2 font-weight-medium"
              data-test="ad5x-dashboard-bed-target"
            >
              {{ bedTargetText }}
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
          <div>
            <div class="text-caption text--secondary">
              Пурж
            </div>
            <div
              class="text-body-2 font-weight-medium"
              data-test="ad5x-dashboard-purge"
            >
              {{ purgeText }}
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
            label="Auto-Z перед печатью"
            @change="setPreprint"
          />

          <div class="d-flex align-center me-3 mb-2 ad5x-purge-control">
            <v-select
              :items="purgeOptions"
              :value="purgeAlgorithm"
              class="ad5x-purge-select"
              data-test="ad5x-dashboard-purge-select"
              dense
              hide-details
              item-text="text"
              item-value="value"
              label="Пурж"
              outlined
              :disabled="controlsDisabled || !purgeControlAvailable"
              @change="setPurgeAlgorithm"
            />
          </div>
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
          Температура стола для Auto-Z берётся из текущего START_PRINT; metadata G-code используется для проверки происхождения. Machine anchor переносится в transient runtime mesh до финального purge и не меняет пользовательский Z-offset.
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

type DashboardAction = 'preprint' | 'purge'
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
      state?.safety.fail_closed === true &&
      !this.machineAnchorRequiresAttention &&
      this.purgeHealthy
    )
  }

  get machineAnchor () {
    return this.snapshot?.module.state.machine_anchor ??
      this.snapshot?.module.state.provenance.machine_anchor ??
      null
  }

  get machineAnchorPending (): boolean {
    return this.machineAnchor?.status === 'pending_transfer'
  }

  get machineAnchorRequiresAttention (): boolean {
    if (!this.snapshot?.module.capabilities.includes('transient_machine_anchor_provenance')) return false
    return !['active', 'idle', 'pending_transfer'].includes(this.machineAnchor?.status || 'unavailable')
  }

  get purgePolicySupported (): boolean {
    return Boolean(this.snapshot?.module.capabilities.includes('purge_policy_provenance'))
  }

  get purge () {
    return this.snapshot?.module.state.job.purge ?? null
  }

  get purgeHealthy (): boolean {
    return !this.purgePolicySupported || this.purge?.status === 'ready'
  }

  get statusTitle (): string {
    if (this.machineAnchorPending) return 'Auto-Z выполняется'
    return this.ready ? 'Готово к печати' : 'Требует внимания'
  }

  get statusCaption (): string {
    if (this.machineAnchorPending) return 'Точная точка снята; привязка переносится в runtime mesh'
    if (!this.purgeHealthy) return `Пурж: ${this.purge?.status || 'состояние неизвестно'}`
    if (this.ready) return 'Auto-Z, карта стола и финальный purge согласованы'
    return 'Проверьте Auto-Z, machine anchor и защитный контур в подробностях'
  }

  get statusColor (): string {
    if (this.machineAnchorPending) return 'primary'
    return this.ready ? 'success' : 'warning'
  }

  get statusIcon (): string {
    if (this.machineAnchorPending) return '$refresh'
    return this.ready ? '$check' : '$warning'
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
    return typeof value === 'number' ? this.formatMm(value) : '—'
  }

  get anchorText (): string {
    const anchor = this.machineAnchor
    if (!anchor) {
      const legacy = this.snapshot?.module.state.offset.auto_alignment
      return typeof legacy === 'number' ? `${this.formatMm(legacy)} · legacy` : '—'
    }
    const value = this.machineAnchorPending && anchor.measured_delta != null
      ? anchor.measured_delta
      : anchor.shift
    if (anchor.status === 'active') return `${this.formatMm(value)} · runtime mesh`
    if (anchor.status === 'pending_transfer') return `${this.formatMm(value)} · измерено`
    if (anchor.status === 'idle') return `${this.formatMm(value)} · не активна`
    return `${this.formatMm(value)} · ${anchor.status}`
  }

  get meshTestMode (): number | null {
    const value = this.snapshot?.module.state.provenance.rc_path?.mesh_test
    return typeof value === 'number' ? value : null
  }

  get preprintEnabled (): boolean {
    return this.meshTestMode === 3
  }

  get preprintText (): string {
    if (this.meshTestMode === 3) return 'Auto-Z включён'
    if (this.meshTestMode === 0) return 'Auto-Z выключен'
    if (this.meshTestMode == null) return 'состояние неизвестно'
    return `режим Z-Mod MESH_TEST=${this.meshTestMode}`
  }

  get bedTargetText (): string {
    const thermal = this.snapshot?.module.state.job.thermal
    const target = thermal?.bed_target
    if (typeof target !== 'number') return 'из текущего START_PRINT'
    const targetText = `${target.toFixed(0)} °C`
    const metadata = thermal?.first_layer_bed_temp
    if (thermal?.bed_status === 'matched') return `${targetText} · профиль совпадает`
    if (thermal?.bed_status === 'mismatch' && typeof metadata === 'number') {
      return `${targetText} · G-code ${metadata.toFixed(0)} °C`
    }
    return `${targetText} · START_PRINT`
  }

  get purgeAlgorithm (): string | null {
    const algorithm = this.purge?.selected_algorithm
    return this.isSelectablePurgeAlgorithm(algorithm) ? algorithm : null
  }

  get purgeOptions (): Array<{ text: string, value: string }> {
    const available = this.purge?.selectable_algorithms ?? []
    return [
      { text: 'Orca', value: 'orca' }, { text: 'FF', value: 'ff' },
      { text: 'FF 2', value: 'ff2' }, { text: 'Schreider', value: 'schreider' },
      { text: 'KAMP Line', value: 'line' }
    ].filter(option => available.length === 0 || available.includes(option.value))
  }

  get purgeControlAvailable (): boolean {
    return this.purgePolicySupported && this.purge !== null && this.purgeOptions.length > 0
  }

  get purgeText (): string {
    if (!this.purgePolicySupported || !this.purge) return 'Z-Mod · legacy'
    const selected = this.purgeLabel(this.purge.selected_algorithm, this.purge.selected_macro)
    const effective = this.purge.effective_macro || 'нет маршрута'
    if (this.purge.status !== 'ready') return `${selected} · ${effective} · ${this.purge.status}`
    if (this.purge.reason === 'kamp_line') return `${selected} → KAMP Line`
    if (this.purge.reason === 'delegate_missing_fallback') return `${selected} → KAMP Line (fallback)`
    return selected
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
    const thermalType = this.snapshot?.module.state.job.thermal?.filament_type
    if (typeof thermalType === 'string' && thermalType) return thermalType
    if (Array.isArray(thermalType) && thermalType.length > 0) return [...new Set(thermalType.filter(Boolean))].join(' + ')
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

  async setPurgeAlgorithm (algorithm: string | null): Promise<void> {
    if (this.controlsDisabled || !this.purgeControlAvailable) return
    if (!this.isSelectablePurgeAlgorithm(algorithm)) return
    if (algorithm === this.purgeAlgorithm) return
    this.actionLoading = 'purge'
    this.actionError = null
    try {
      await this.runGcode(`ADZ_SET_PURGE ALGORITHM=${algorithm.toUpperCase()}`)
      await this.refresh()
    } catch (error: unknown) {
      this.actionError = error instanceof Error
        ? `Не удалось изменить purge: ${error.message}`
        : 'Не удалось изменить purge.'
    } finally {
      this.actionLoading = null
    }
  }

  private isSelectablePurgeAlgorithm (algorithm: unknown): algorithm is string {
    return typeof algorithm === 'string' && ['orca', 'ff', 'ff2', 'schreider', 'line'].includes(algorithm)
  }

  private purgeLabel (algorithm: string | null, macro: string | null): string {
    const labels: Record<string, string> = {
      orca: 'Orca', ff: 'FF', ff2: 'FF 2', schreider: 'Schreider', line: 'KAMP Line'
    }
    if (algorithm && labels[algorithm]) return labels[algorithm]
    return macro ? `Пользовательский · ${macro}` : 'не выбран'
  }

  private formatMm (value: number): string {
    const sign = value > 0 ? '+' : ''
    return `${sign}${value.toFixed(3)} mm`
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

.ad5x-purge-control {
  min-width: 190px;
}

.ad5x-purge-select {
  max-width: 220px;
}

@media (max-width: 599px) {
  .ad5x-z-dashboard-grid {
    grid-template-columns: 1fr;
  }
}
</style>
