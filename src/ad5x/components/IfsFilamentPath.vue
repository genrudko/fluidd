<template>
  <v-card
    outlined
    class="mb-4"
  >
    <v-card-title class="text-subtitle-1 py-3">
      Путь материала
    </v-card-title>
    <v-card-text class="pt-0">
      <svg
        class="ifs-path"
        viewBox="0 0 800 190"
        role="img"
        aria-label="IFS filament path"
        data-test="ifs-filament-path"
      >
        <g
          v-for="node in pathNodes"
          :key="`path-${node.slot}`"
        >
          <path
            :d="node.path"
            fill="none"
            :stroke="node.active ? node.color : inactiveColor"
            :stroke-width="node.active ? 8 : 4"
            :stroke-dasharray="node.active ? undefined : '8 9'"
            stroke-linecap="round"
          />
          <circle
            :cx="node.x"
            cy="34"
            r="22"
            :fill="node.present ? node.color : emptyColor"
            :stroke="node.active ? activeOutline : outlineColor"
            :stroke-width="node.active ? 5 : 2"
          />
          <text
            :x="node.x"
            y="40"
            text-anchor="middle"
            class="ifs-path__slot-label"
          >
            {{ node.slot }}
          </text>
        </g>

        <rect
          x="350"
          y="104"
          width="100"
          height="36"
          rx="18"
          class="ifs-path__selector"
        />
        <text
          x="400"
          y="128"
          text-anchor="middle"
          class="ifs-path__label"
        >IFS</text>
        <path
          d="M400 140v22"
          :stroke="activeColor"
          stroke-width="8"
          stroke-linecap="round"
        />
        <rect
          x="360"
          y="160"
          width="80"
          height="26"
          rx="8"
          class="ifs-path__extruder"
        />
        <text
          x="400"
          y="179"
          text-anchor="middle"
          class="ifs-path__label"
        >TOOL</text>
      </svg>
    </v-card-text>
  </v-card>
</template>

<script lang="ts">
import Vue from 'vue'
import { Component, Prop } from 'vue-property-decorator'
import type { Ad5xIfsSlot } from '@/ad5x/api/ifs'
import { getIfsPrimaryColor } from '@/ad5x/api/ifs'

interface PathNode {
  slot: number
  x: number
  path: string
  color: string
  present: boolean
  active: boolean
}

@Component({})
export default class IfsFilamentPath extends Vue {
  @Prop({ type: Array, required: true })
  readonly slots!: readonly Ad5xIfsSlot[]

  readonly inactiveColor = 'rgba(128, 128, 128, 0.34)'
  readonly emptyColor = 'rgba(128, 128, 128, 0.18)'
  readonly outlineColor = 'rgba(128, 128, 128, 0.58)'
  readonly activeOutline = 'var(--v-primary-base)'

  get pathNodes (): PathNode[] {
    const positions = [100, 300, 500, 700]
    return this.slots.map(slot => ({
      slot: slot.slot,
      x: positions[slot.slot - 1],
      path: `M${positions[slot.slot - 1]} 56 C${positions[slot.slot - 1]} 92 400 80 400 104`,
      color: getIfsPrimaryColor(slot),
      present: slot.present,
      active: slot.active
    }))
  }

  get activeColor (): string {
    const active = this.slots.find(slot => slot.active && slot.present)
    return active ? getIfsPrimaryColor(active) : this.inactiveColor
  }
}
</script>

<style scoped lang="scss">
.ifs-path {
  width: 100%;
  min-height: 125px;
  display: block;

  &__slot-label,
  &__label {
    fill: white;
    font-size: 14px;
    font-weight: 700;
    paint-order: stroke;
    stroke: rgba(0, 0, 0, 0.72);
    stroke-width: 3px;
  }

  &__selector {
    fill: rgba(100, 100, 100, 0.78);
    stroke: rgba(180, 180, 180, 0.62);
    stroke-width: 2;
  }

  &__extruder {
    fill: rgba(70, 70, 70, 0.92);
    stroke: rgba(190, 190, 190, 0.62);
    stroke-width: 2;
  }
}
</style>
