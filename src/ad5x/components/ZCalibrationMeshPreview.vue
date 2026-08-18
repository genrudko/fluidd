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
          Текущая карта Klipper — без отдельного расчёта во frontend.
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
        <div class="d-flex flex-wrap mb-2 text-caption">
          <div class="me-4 mb-1">
            <span class="text--secondary">Профиль:</span>
            <strong class="ms-1" data-test="z-mesh-profile">{{ activeProfileLabel }}</strong>
          </div>
          <div class="me-4 mb-1">
            <span class="text--secondary">Min:</span>
            <strong class="ms-1" data-test="z-mesh-min">{{ formatMm(currentMesh.min) }}</strong>
          </div>
          <div class="me-4 mb-1">
            <span class="text--secondary">Max:</span>
            <strong class="ms-1" data-test="z-mesh-max">{{ formatMm(currentMesh.max) }}</strong>
          </div>
          <div class="mb-1">
            <span class="text--secondary">Разброс:</span>
            <strong class="ms-1" data-test="z-mesh-range">{{ formatMm(currentMesh.range) }}</strong>
          </div>
        </div>

        <bed-mesh-chart
          :data="series"
          :graphics="graphics"
          :height="260"
          :options="options"
        />
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
import { Component, Mixins } from 'vue-property-decorator'
import StateMixin from '@/mixins/state'
import BedMeshChart from '@/components/widgets/bedmesh/BedMeshChart.vue'
import type {
  AppMeshes,
  BedMeshProfileListEntry,
  MatrixType,
  ProcessedMesh
} from '@/store/mesh/types'

@Component({
  components: {
    BedMeshChart
  }
})
export default class ZCalibrationMeshPreview extends Mixins(StateMixin) {
  get supportsBedMesh (): boolean {
    return this.$typedGetters['mesh/getSupportsBedMesh']
  }

  get matrix (): MatrixType {
    return this.$typedState.mesh.matrix
  }

  get mesh (): AppMeshes {
    return this.$typedGetters['mesh/getCurrentMeshData']
  }

  get currentMesh (): ProcessedMesh {
    return this.mesh[this.matrix]
  }

  get hasMeshLoaded (): boolean {
    const mesh = this.currentMesh
    return Boolean(mesh?.coordinates?.length)
  }

  get activeProfile (): BedMeshProfileListEntry | undefined {
    const profiles: BedMeshProfileListEntry[] = this.$typedGetters['mesh/getBedMeshProfiles']
    return profiles.find(profile => profile.active)
  }

  get activeProfileLabel (): string {
    if (!this.activeProfile) return 'runtime / без имени'
    return this.activeProfile.adaptive
      ? `${this.activeProfile.name} (runtime)`
      : this.activeProfile.name
  }

  get options () {
    const mesh = this.currentMesh
    const range = Math.max(mesh.range, 0.01)
    const padding = range * 0.2

    return {
      legend: {
        show: false
      },
      visualMap: {
        min: mesh.min,
        max: mesh.max,
        dimension: 2,
        seriesIndex: 0
      },
      zAxis3D: {
        min: mesh.min - padding,
        max: mesh.max + padding
      }
    }
  }

  get series () {
    const mesh = this.currentMesh

    return [{
      type: 'surface',
      name: this.matrix,
      shading: 'color',
      wireframe: {
        show: false
      },
      data: mesh.coordinates,
      dataShape: mesh.dimensions
    }]
  }

  get graphics () {
    return [{
      type: 'text',
      right: 10,
      top: 0,
      z: 100,
      silent: true,
      style: {
        text: `Разброс: ${this.currentMesh.range.toFixed(4)} mm`
      }
    }]
  }

  formatMm (value: number): string {
    const sign = value > 0 ? '+' : ''
    return `${sign}${value.toFixed(3)} mm`
  }

  openFullMesh (): void {
    this.$filters.routeTo({ name: 'tune' })
  }
}
</script>
