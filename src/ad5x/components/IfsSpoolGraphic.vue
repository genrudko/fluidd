<template>
  <svg
    class="ifs-spool"
    :class="{ 'ifs-spool--empty': !slotData.present, 'ifs-spool--active': slotData.active }"
    viewBox="0 0 180 180"
    role="img"
    :aria-label="ariaLabel"
    data-test="ifs-spool-graphic"
  >
    <defs>
      <linearGradient
        :id="gradientId"
        x1="0%"
        y1="0%"
        x2="100%"
        y2="100%"
      >
        <stop
          v-for="stop in gradientStops"
          :key="stop.key"
          :offset="stop.offset"
          :stop-color="stop.color"
        />
      </linearGradient>
      <mask :id="maskId">
        <rect
          width="180"
          height="180"
          fill="black"
        />
        <circle
          cx="90"
          cy="90"
          r="57"
          fill="white"
        />
        <circle
          cx="90"
          cy="90"
          :r="filamentInnerRadius"
          fill="black"
        />
      </mask>
    </defs>

    <circle
      cx="90"
      cy="90"
      r="71"
      class="ifs-spool__flange"
    />
    <circle
      cx="90"
      cy="90"
      r="63"
      class="ifs-spool__recess"
    />

    <circle
      v-if="slotData.present"
      cx="90"
      cy="90"
      r="57"
      :fill="gradientFill"
      :mask="maskFill"
      data-test="ifs-spool-filament"
    />

    <circle
      cx="90"
      cy="90"
      r="27"
      class="ifs-spool__hub"
    />
    <circle
      cx="90"
      cy="90"
      r="10"
      class="ifs-spool__axle"
    />

    <text
      v-if="slotData.present && remainingPercent !== null"
      x="90"
      y="95"
      text-anchor="middle"
      class="ifs-spool__amount"
      data-test="ifs-spool-percent"
    >
      {{ roundedRemainingPercent }}%
    </text>
    <text
      v-else-if="!slotData.present"
      x="90"
      y="96"
      text-anchor="middle"
      class="ifs-spool__empty-label"
      data-test="ifs-spool-empty"
    >
      EMPTY
    </text>

    <circle
      v-if="slotData.active"
      cx="90"
      cy="90"
      r="77"
      class="ifs-spool__active-ring"
      data-test="ifs-spool-active"
    />
  </svg>
</template>

<script lang="ts">
import Vue from 'vue'
import { Component, Prop } from 'vue-property-decorator'
import type { Ad5xIfsSlot } from '@/ad5x/api/ifs'
import { getIfsPrimaryColor, getIfsRemainingPercent } from '@/ad5x/api/ifs'

interface GradientStop {
  key: string
  offset: string
  color: string
}

@Component({})
export default class IfsSpoolGraphic extends Vue {
  @Prop({ type: Object, required: true })
  readonly slotData!: Ad5xIfsSlot

  get gradientId (): string {
    return `ad5x-ifs-spool-gradient-${this.slotData.slot}`
  }

  get maskId (): string {
    return `ad5x-ifs-spool-mask-${this.slotData.slot}`
  }

  get gradientFill (): string {
    return `url(#${this.gradientId})`
  }

  get maskFill (): string {
    return `url(#${this.maskId})`
  }

  get colors (): readonly string[] {
    return this.slotData.appearance.colors.length
      ? this.slotData.appearance.colors
      : [getIfsPrimaryColor(this.slotData)]
  }

  get remainingPercent (): number | null {
    return getIfsRemainingPercent(this.slotData)
  }

  get roundedRemainingPercent (): number {
    return Math.round(this.remainingPercent ?? 0)
  }

  get filamentInnerRadius (): number {
    if (this.remainingPercent === null) return 35
    return 35 + (1 - this.remainingPercent / 100) * 20
  }

  get gradientStops (): GradientStop[] {
    const colors = this.colors
    if (colors.length === 1) {
      return [
        { key: 'solid-start', offset: '0%', color: colors[0] },
        { key: 'solid-end', offset: '100%', color: colors[0] }
      ]
    }

    if (this.slotData.appearance.color_mode === 'gradient' ||
        this.slotData.appearance.color_mode === 'rainbow') {
      return colors.map((color, index) => ({
        key: `smooth-${index}-${color}`,
        offset: `${(index / (colors.length - 1)) * 100}%`,
        color
      }))
    }

    const stops: GradientStop[] = []
    colors.forEach((color, index) => {
      const start = (index / colors.length) * 100
      const end = ((index + 1) / colors.length) * 100
      stops.push({ key: `segment-${index}-start-${color}`, offset: `${start}%`, color })
      stops.push({ key: `segment-${index}-end-${color}`, offset: `${end}%`, color })
    })
    return stops
  }

  get ariaLabel (): string {
    if (!this.slotData.present) return `IFS slot ${this.slotData.slot}: empty`
    const material = this.slotData.spool.material || this.slotData.material || 'filament'
    return `IFS slot ${this.slotData.slot}: ${material}`
  }
}
</script>

<style scoped lang="scss">
.ifs-spool {
  width: 100%;
  max-width: 190px;
  display: block;
  margin: 0 auto;

  &__flange {
    fill: rgba(120, 120, 120, 0.32);
    stroke: rgba(160, 160, 160, 0.8);
    stroke-width: 4;
  }

  &__recess {
    fill: rgba(20, 20, 20, 0.18);
    stroke: rgba(160, 160, 160, 0.28);
    stroke-width: 2;
  }

  &__hub {
    fill: rgba(100, 100, 100, 0.9);
    stroke: rgba(210, 210, 210, 0.55);
    stroke-width: 2;
  }

  &__axle {
    fill: rgba(30, 30, 30, 0.72);
  }

  &__amount {
    fill: white;
    font-size: 15px;
    font-weight: 700;
    paint-order: stroke;
    stroke: rgba(0, 0, 0, 0.72);
    stroke-width: 3px;
  }

  &__empty-label {
    fill: currentColor;
    opacity: 0.45;
    font-size: 12px;
    font-weight: 700;
    letter-spacing: 1px;
  }

  &__active-ring {
    fill: none;
    stroke: var(--v-primary-base);
    stroke-width: 5;
    stroke-linecap: round;
  }

  &--empty {
    opacity: 0.58;
  }
}
</style>
