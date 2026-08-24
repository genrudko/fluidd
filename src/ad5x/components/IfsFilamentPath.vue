<template>
  <v-row
    dense
    class="ifs-topology mb-4"
  >
    <v-col
      cols="12"
      :md="showBypass ? 9 : 12"
    >
      <v-card
        outlined
        height="100%"
      >
        <v-card-title class="text-subtitle-1 py-3">
          {{ $t('app.ad5x.ifs.path.title') }}
        </v-card-title>
        <v-card-text class="pt-0">
          <svg
            class="ifs-path"
            viewBox="0 0 800 210"
            role="img"
            :aria-label="$t('app.ad5x.ifs.path.ariaLabel').toString()"
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
                :stroke-width="node.active ? 9 : 4"
                :stroke-dasharray="node.active ? undefined : '8 9'"
                stroke-linecap="round"
              />
              <circle
                :cx="node.x"
                cy="39"
                r="30"
                class="ifs-path__spool-flange"
              />
              <circle
                :cx="node.x"
                cy="39"
                r="24"
                class="ifs-path__spool-recess"
              />
              <circle
                v-if="node.present"
                :cx="node.x"
                cy="39"
                r="21"
                :fill="node.color"
                data-test="ifs-path-spool-filament"
              />
              <circle
                :cx="node.x"
                cy="39"
                :r="node.innerRadius"
                class="ifs-path__spool-hub"
              />
              <circle
                :cx="node.x"
                cy="39"
                r="6"
                class="ifs-path__spool-axle"
              />
              <circle
                v-if="node.active"
                :cx="node.x"
                cy="39"
                r="34"
                class="ifs-path__active-ring"
                data-test="ifs-path-active-spool"
              />
              <text
                :x="node.x"
                y="44"
                text-anchor="middle"
                class="ifs-path__slot-label"
              >{{ node.slot }}</text>
              <text
                :x="node.x"
                y="80"
                text-anchor="middle"
                class="ifs-path__material-label"
              >{{ node.material }}</text>
            </g>
            <rect
              x="350"
              y="126"
              width="100"
              height="38"
              rx="19"
              class="ifs-path__selector"
            />
            <text
              x="400"
              y="151"
              text-anchor="middle"
              class="ifs-path__label"
            >IFS</text>
            <path
              d="M400 164v22"
              :stroke="activeColor"
              stroke-width="9"
              stroke-linecap="round"
            />
            <rect
              x="360"
              y="184"
              width="80"
              height="24"
              rx="8"
              class="ifs-path__extruder"
            />
            <text
              x="400"
              y="202"
              text-anchor="middle"
              class="ifs-path__label"
            >TOOL</text>
          </svg>
        </v-card-text>
      </v-card>
    </v-col>
    <v-col
      v-if="showBypass"
      cols="12"
      md="3"
    >
      <v-card
        outlined
        height="100%"
        class="ifs-bypass-card"
        data-test="ifs-bypass-card"
      >
        <v-card-title class="text-subtitle-1 py-3">
          Bypass
        </v-card-title>
        <v-card-text class="d-flex flex-column align-center text-center pt-2">
          <v-icon
            size="54"
            class="mb-3"
          >
            $ifs
          </v-icon>
          <div class="text-subtitle-2">
            {{ $t('app.ad5x.ifs.path.externalFeed') }}
          </div>
          <div class="text-caption text--secondary mt-1">
            {{ $t('app.ad5x.ifs.path.separateSource') }}
          </div>
          <v-chip
            small
            outlined
            class="mt-4"
            :color="externalSource && externalSource.runtime_supported ? 'success' : undefined"
            data-test="ifs-bypass-runtime"
          >
            {{ externalSource && externalSource.runtime_supported ? $t('app.ad5x.ifs.path.runtimeAvailable') : $t('app.ad5x.ifs.path.runtimeUnsupported') }}
          </v-chip>
        </v-card-text>
      </v-card>
    </v-col>
  </v-row>
</template>

<script lang="ts">
import Vue from 'vue'
import { Component, Prop } from 'vue-property-decorator'
import type { Ad5xIfsExternalSource, Ad5xIfsSlot } from '@/ad5x/api/ifs'
import { getIfsPrimaryColor, getIfsRemainingPercent } from '@/ad5x/api/ifs'

interface PathNode {
  slot: number
  x: number
  path: string
  color: string
  present: boolean
  active: boolean
  material: string
  innerRadius: number
}
@Component({})
export default class IfsFilamentPath extends Vue {
  @Prop({ type: Array, required: true }) readonly slots!: readonly Ad5xIfsSlot[]
  @Prop({ type: Object, default: null }) readonly externalSource!: Ad5xIfsExternalSource | null
  readonly inactiveColor = 'rgba(128, 128, 128, 0.34)'

  get pathNodes (): PathNode[] {
    const positions = [100, 300, 500, 700]
    return this.slots.map(slot => {
      const remainingPercent = getIfsRemainingPercent(slot)
      return {
        slot: slot.slot,
        x: positions[slot.slot - 1],
        path: `M${positions[slot.slot - 1]} 69 C${positions[slot.slot - 1]} 105 400 100 400 126`,
        color: getIfsPrimaryColor(slot),
        present: slot.present,
        active: slot.active,
        material: slot.present ? (slot.spool.material || slot.material || '—') : this.$t('app.ad5x.common.empty').toString(),
        innerRadius: slot.present ? 10 + (1 - (remainingPercent ?? 55) / 100) * 9 : 18
      }
    })
  }

  get activeColor (): string {
    const active = this.slots.find(slot => slot.active && slot.present)
    return active ? getIfsPrimaryColor(active) : this.inactiveColor
  }

  get showBypass (): boolean {
    return Boolean(this.externalSource?.modeled)
  }
}
</script>

<style scoped lang="scss">
.ifs-path {
  width: 100%;
  min-height: 145px;
  display: block;

  &__slot-label, &__label {
    fill: white;
    font-size: 14px;
    font-weight: 700;
    paint-order: stroke;
    stroke: rgba(0, 0, 0, 0.72);
    stroke-width: 3px;
  }
  &__material-label { fill: currentColor; font-size: 12px; font-weight: 600; opacity: 0.82; }
  &__spool-flange { fill: rgba(120, 120, 120, 0.34); stroke: rgba(175, 175, 175, 0.82); stroke-width: 3px; }
  &__spool-recess { fill: rgba(25, 25, 25, 0.22); stroke: rgba(170, 170, 170, 0.28); stroke-width: 1.5px; }
  &__spool-hub { fill: rgba(88, 88, 88, 0.96); stroke: rgba(215, 215, 215, 0.58); stroke-width: 1.5px; }
  &__spool-axle { fill: rgba(25, 25, 25, 0.82); }
  &__active-ring { fill: none; stroke: var(--v-primary-base); stroke-width: 5px; }
  &__selector { fill: rgba(100, 100, 100, 0.78); stroke: rgba(180, 180, 180, 0.62); stroke-width: 2; }
  &__extruder { fill: rgba(70, 70, 70, 0.92); stroke: rgba(190, 190, 190, 0.62); stroke-width: 2; }
}

.ifs-bypass-card { min-height: 100%; }
</style>
