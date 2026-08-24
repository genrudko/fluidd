<template>
  <v-card
    class="mt-4"
    data-test="z-mesh-preview"
    outlined
  >
    <v-card-title class="d-flex align-center">
      <div>
        <div class="text-subtitle-1 font-weight-medium">
          Карта стола
        </div>
        <div class="text-caption text--secondary">
          Компактный Bed Mesh: сохранённая активная карта и временная карта Calibration Center.
        </div>
      </div>
      <v-spacer />
      <app-btn
        data-test="z-open-full-mesh"
        :disabled="!supportsBedMesh"
        outlined
        small
        @click="openFullMesh"
      >
        Подробная карта
      </app-btn>
    </v-card-title>

    <v-card-text v-if="supportsBedMesh">
      <v-btn-toggle
        v-if="hasRuntimeProfile"
        v-model="viewMode"
        class="mb-3"
        data-test="z-mesh-view-toggle"
        dense
        mandatory
      >
        <v-btn
          small
          value="runtime"
        >
          Временная
        </v-btn>
        <v-btn
          small
          value="active"
        >
          Активная auto
        </v-btn>
      </v-btn-toggle>

      <v-alert
        v-if="hasRuntimeProfile && effectiveViewMode === 'runtime'"
        class="mb-3"
        data-test="z-runtime-mesh-note"
        dense
        text
        type="info"
      >
        Показана последняя временная карта `ad5x_runtime`. Она не записана через SAVE_CONFIG; активной для печати остаётся проверенная `auto`.
      </v-alert>

      <template v-if="hasMeshLoaded">
        <div class="d-flex flex-wrap mb-3 text-caption">
          <div class="me-4 mb-1">
            <span class="text--secondary">Профиль:</span>
            <strong
              class="ms-1"
              data-test="z-mesh-profile"
            >{{ displayProfileLabel }}</strong>
          </div>
          <div class="me-4 mb-1">
            <span class="text--secondary">Min:</span>
            <strong
              class="ms-1"
              data-test="z-mesh-min"
            >{{ formatMm(meshMin) }}</strong>
          </div>
          <div class="me-4 mb-1">
            <span class="text--secondary">Max:</span>
            <strong
              class="ms-1"
              data-test="z-mesh-max"
            >{{ formatMm(meshMax) }}</strong>
          </div>
          <div class="mb-1">
            <span class="text--secondary">Разброс:</span>
            <strong
              class="ms-1"
              data-test="z-mesh-range"
            >{{ formatMm(meshRange) }}</strong>
          </div>
        </div>

        <div
          class="z-mesh-grid"
          data-test="z-mesh-grid"
          :style="gridStyle"
        >
          <div
            v-for="cell in meshCells"
            :key="cell.key"
            class="z-mesh-cell"
            :style="cell.style"
            :title="cell.tooltip"
          >
            {{ cell.label }}
          </div>
        </div>

        <div class="d-flex justify-space-between mt-2 text-caption text--secondary">
          <span>{{ formatMm(meshMin) }}</span>
          <span>{{ effectiveViewMode === 'runtime' ? 'временная карта' : 'активная карта' }}</span>
          <span>{{ formatMm(meshMax) }}</span>
        </div>
      </template>

      <v-alert
        v-else
        class="mb-0"
        data-test="z-mesh-empty"
        text
        type="info"
      >
        Карта стола пока недоступна. После загрузки `auto` или построения временной карты она появится здесь.
      </v-alert>
    </v-card-text>

    <v-card-text v-else>
      <v-alert
        class="mb-0"
        data-test="z-mesh-unsupported"
        text
        type="info"
      >
        Bed Mesh не настроен в текущей конфигурации Klipper.
      </v-alert>
    </v-card-text>
  </v-card>
</template>

<script lang="ts">
import Vue from 'vue'
import { Component } from 'vue-property-decorator'
import type {
  AppMeshes,
  BedMeshProfileListEntry,
  MatrixType,
  ProcessedMesh
} from '@/store/mesh/types'

type MeshCell = {
  key: string
  label: string
  tooltip: string
  style: Record<string, string>
}

type RuntimeMeshProfile = {
  points?: number[][]
}

type BedMeshRuntimeState = {
  profiles?: Record<string, RuntimeMeshProfile>
}

@Component({})
export default class ZCalibrationMeshPreview extends Vue {
  viewMode: 'runtime' | 'active' = 'runtime'

  get supportsBedMesh (): boolean {
    return Boolean(this.$store.getters['mesh/getSupportsBedMesh'])
  }

  get matrix (): MatrixType {
    const state = this.$store.state as unknown as { mesh?: { matrix?: MatrixType } }
    return state.mesh?.matrix === 'probed_matrix' ? 'probed_matrix' : 'mesh_matrix'
  }

  get mesh (): AppMeshes {
    return (this.$store.getters['mesh/getCurrentMeshData'] || {}) as AppMeshes
  }

  get currentMesh (): ProcessedMesh | null {
    return this.mesh[this.matrix] || null
  }

  get bedMeshState (): BedMeshRuntimeState | null {
    const state = this.$store.state as unknown as {
      printer?: { printer?: { bed_mesh?: BedMeshRuntimeState } }
    }
    return state.printer?.printer?.bed_mesh || null
  }

  get runtimeProfile (): RuntimeMeshProfile | null {
    return this.bedMeshState?.profiles?.ad5x_runtime || null
  }

  get runtimePoints (): number[][] {
    const rows = this.runtimeProfile?.points
    return Array.isArray(rows)
      ? rows.filter(row => Array.isArray(row) && row.length > 0)
      : []
  }

  get hasRuntimeProfile (): boolean {
    return this.runtimePoints.length > 0
  }

  get effectiveViewMode (): 'runtime' | 'active' {
    return this.viewMode === 'runtime' && this.hasRuntimeProfile
      ? 'runtime'
      : 'active'
  }

  get hasMeshLoaded (): boolean {
    if (this.effectiveViewMode === 'runtime') return this.hasRuntimeProfile
    return Boolean(this.currentMesh?.coordinates?.length)
  }

  get runtimeValues (): number[] {
    return this.runtimePoints.flat().map(Number).filter(Number.isFinite)
  }

  get meshMin (): number {
    if (this.effectiveViewMode === 'runtime') {
      return this.runtimeValues.length > 0 ? Math.min(...this.runtimeValues) : 0
    }
    return this.currentMesh?.min ?? 0
  }

  get meshMax (): number {
    if (this.effectiveViewMode === 'runtime') {
      return this.runtimeValues.length > 0 ? Math.max(...this.runtimeValues) : 0
    }
    return this.currentMesh?.max ?? 0
  }

  get meshRange (): number {
    return this.effectiveViewMode === 'runtime'
      ? this.meshMax - this.meshMin
      : this.currentMesh?.range ?? 0
  }

  get activeProfile (): BedMeshProfileListEntry | undefined {
    const profiles = (this.$store.getters['mesh/getBedMeshProfiles'] || []) as BedMeshProfileListEntry[]
    return profiles.find(profile => profile.active)
  }

  get activeProfileLabel (): string {
    if (!this.activeProfile) return 'runtime / без имени'
    return this.activeProfile.adaptive
      ? `${this.activeProfile.name} (runtime)`
      : this.activeProfile.name
  }

  get displayProfileLabel (): string {
    return this.effectiveViewMode === 'runtime'
      ? 'ad5x_runtime (временная)'
      : this.activeProfileLabel
  }

  get gridStyle (): Record<string, string> {
    const columns = this.effectiveViewMode === 'runtime'
      ? Math.max(1, this.runtimePoints[0]?.length ?? 1)
      : Math.max(1, this.currentMesh?.dimensions?.[0] ?? 1)

    return {
      gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`
    }
  }

  private cellStyle (z: number): Record<string, string> {
    const range = Math.max(this.meshRange, 0.000001)
    const normalized = Math.max(0, Math.min(1, (z - this.meshMin) / range))
    const hue = Math.round(220 - (normalized * 200))
    return {
      backgroundColor: `hsl(${hue} 70% 45%)`
    }
  }

  get meshCells (): MeshCell[] {
    if (this.effectiveViewMode === 'runtime') {
      const cells: MeshCell[] = []
      this.runtimePoints.forEach((row, rowIndex) => {
        row.forEach((raw, columnIndex) => {
          const z = Number(raw)
          if (!Number.isFinite(z)) return
          cells.push({
            key: `runtime-${rowIndex}-${columnIndex}`,
            label: z.toFixed(2),
            tooltip: `Строка ${rowIndex + 1} · точка ${columnIndex + 1} · Z ${z.toFixed(4)} mm`,
            style: this.cellStyle(z)
          })
        })
      })
      return cells
    }

    const mesh = this.currentMesh
    if (!mesh) return []

    return mesh.coordinates.map((point, index) => {
      const x = Number(point.value[0] ?? 0)
      const y = Number(point.value[1] ?? 0)
      const z = Number(point.value[2] ?? 0)

      return {
        key: `${point.name}-${index}`,
        label: z.toFixed(2),
        tooltip: `X ${x.toFixed(1)} · Y ${y.toFixed(1)} · Z ${z.toFixed(4)} mm`,
        style: this.cellStyle(z)
      }
    })
  }

  formatMm (value: number): string {
    const sign = value > 0 ? '+' : ''
    return `${sign}${value.toFixed(3)} mm`
  }

  openFullMesh (): void {
    this.$router.push({ name: 'tune' }).catch(() => undefined)
  }
}
</script>

<style lang="scss" scoped>
.z-mesh-grid {
  display: grid;
  gap: 3px;
  width: 100%;
  min-height: 180px;
  padding: 3px;
  border: 1px solid rgba(127, 127, 127, 0.25);
  border-radius: 4px;
}

.z-mesh-cell {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 32px;
  padding: 4px;
  border-radius: 2px;
  color: white;
  font-size: 11px;
  font-weight: 500;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.65);
}
</style>
