<template>
  <collapsable-card
    title="Калибровка Z"
    icon="$bedMesh"
    layout-path="dashboard.ad5x-calibration-card"
  >
    <template #menu>
      <app-btn
        icon
        data-test="ad5x-dashboard-open"
        @click="$router.push({ name: 'ad5x' })"
      >
        <v-icon dense>
          $fullScreen
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

        <div class="text-caption text--secondary mt-3">
          Для автоматической калибровки используются температуры, разрешённые текущим START_PRINT; тип материала служит контекстом, а не скрытой заменой профиля слайсера.
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

@Component({})
export default class Ad5xCalibrationDashboardCard extends Vue {
  snapshot: Ad5xZCalibrationSnapshot | null = null
  loading = false
  error: string | null = null

  get ready (): boolean {
    const state = this.snapshot?.module.state
    return Boolean(
      this.snapshot?.module.health === 'ok' &&
      state?.calibration.motion_owner === 'zmod' &&
      state?.calibration.offset_write_enabled === false &&
      state?.safety.fail_closed === true
    )
  }

  get effectiveText (): string {
    const value = this.snapshot?.module.state.offset.effective
    return typeof value === 'number' ? `${value.toFixed(3)} mm` : '—'
  }

  get meshTestMode (): number | null {
    const value = this.snapshot?.module.state.provenance.rc_path?.mesh_test
    return typeof value === 'number' ? value : null
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
    const profile = this.snapshot?.module.state.provenance.rc_path?.active_mesh_profile

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
    const types = this.currentFile?.filament_type
    if (Array.isArray(types) && types.length > 0) {
      return [...new Set(types.filter(Boolean))].join(' + ')
    }
    return 'нет metadata текущего задания'
  }

  private apiClient (): Ad5xApiClient {
    const socket = (this as unknown as { $socket: Ad5xSocketTransport }).$socket
    return new Ad5xApiClient(socket)
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

  created (): void {
    void this.refresh()
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
