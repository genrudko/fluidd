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
          Компактный вид текущего Bed Mesh из штатного состояния Fluidd/Klipper.
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
      <template v-if="hasMeshLoaded">
        <div class="d-flex flex-wrap mb-3 text-caption">
          <div class="me-4 mb-1">
            <span class="text--secondary">Профиль:</span>
            <strong
              class="ms-1"
              data-test="z-mesh-profile"
            >{{ activeProfileLabel }}</strong>
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
          <span>упрощённая карта</span>
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
        Текущая карта стола не загружена. Здесь появится активный mesh после его загрузки или построения.
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

@Component({})
export default class ZCalibrationMeshPreview extends Vue {
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

  get hasMeshLoaded (): boolean {
    return Boolean(this.currentMesh?.coordinates?.length)
  }

  get meshMin (): number {
    return this.currentMesh?.min ?? 0
  }

  get meshMax (): number {
    return this.currentMesh?.max ?? 0
  }

  get meshRange (): number {
    return this.currentMesh?.range ?? 0
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

  get gridStyle (): Record<string, string> {
    const columns = Math.max(1, this.currentMesh?.dimensions?.[0] ?? 1)
    return {
      gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`
    }
  }

  get meshCells (): MeshCell[] {
    const mesh = this.currentMesh
    if (!mesh) return []

    const range = Math.max(mesh.range, 0.000001)

    return mesh.coordinates.map((point, index) => {
      const x = Number(point.value[0] ?? 0)
      const y = Number(point.value[1] ?? 0)
      const z = Number(point.value[2] ?? 0)
      const normalized = Math.max(0, Math.min(1, (z - mesh.min) / range))
      const hue = Math.round(220 - (normalized * 200))

      return {
        key: `${point.name}-${index}`,
        label: z.toFixed(2),
        tooltip: `X ${x.toFixed(1)} · Y ${y.toFixed(1)} · Z ${z.toFixed(4)} mm`,
        style: {
          backgroundColor: `hsl(${hue} 70% 45%)`
        }
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
