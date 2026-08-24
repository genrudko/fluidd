<template>
  <v-card
    outlined
    class="mt-4"
    data-test="ifs-equivalent-spool"
  >
    <v-card-title class="d-flex flex-wrap align-center py-3">
      <span>Резервная катушка</span>
      <v-spacer />
      <v-chip
        small
        label
        :color="statusColor"
        data-test="equivalent-status"
      >
        {{ statusLabel }}
      </v-chip>
    </v-card-title>
    <v-card-text>
      <div data-test="equivalent-summary">
        {{ summaryText }}
      </div>
      <div
        v-if="!compact && preview.candidates.length"
        class="mt-3"
      >
        <div
          v-for="candidate in preview.candidates"
          :key="candidate.slot"
          class="d-flex flex-wrap align-center py-1"
          :data-test="`equivalent-slot-${candidate.slot}`"
        >
          <span class="font-weight-medium mr-2">IFS {{ candidate.slot }}</span>
          <span class="text--secondary mr-2">{{ candidate.material || '?' }} · {{ candidate.color || '?' }}</span>
          <v-chip
            x-small
            label
            outlined
            :color="candidate.eligible ? 'success' : undefined"
          >
            {{ candidate.eligible ? 'подходит' : candidateBlockers(candidate) }}
          </v-chip>
        </div>
      </div>
      <div class="text-caption text--secondary mt-3">
        Только предварительный просмотр по данным Z-Mod. Plugins AD5X не вызывает ANALOG_PRUTOK и не переключает катушку автоматически.
      </div>
    </v-card-text>
  </v-card>
</template>

<script lang="ts">
import Vue from 'vue'
import { Component, Prop } from 'vue-property-decorator'
import type { Ad5xIfsEquivalentSpoolCandidate, Ad5xIfsEquivalentSpoolPreview } from '@/ad5x/api/ifs'

@Component
export default class IfsEquivalentSpoolCard extends Vue {
  @Prop({ type: Object, required: true })
  readonly preview!: Ad5xIfsEquivalentSpoolPreview

  @Prop({ type: Boolean, default: false })
  readonly compact!: boolean

  get statusLabel (): string {
    switch (this.preview.status) {
      case 'available': return `IFS ${this.preview.next_slot} готов`
      case 'no_candidate': return 'Резерва нет'
      case 'suspended': return 'Приостановлено'
      default: return 'Недостаточно данных'
    }
  }

  get statusColor (): string | undefined {
    if (this.preview.status === 'available') return 'success'
    if (this.preview.status === 'no_candidate') return 'warning'
    return undefined
  }

  get summaryText (): string {
    const source = this.preview.source_slot ? `IFS ${this.preview.source_slot}` : 'текущей катушки'
    if (this.preview.status === 'available') return `Для ${source} первым эквивалентным кандидатом по правилу Z-Mod является IFS ${this.preview.next_slot}.`
    if (this.preview.status === 'no_candidate') return `Для ${source} Z-Mod сейчас не видит физически присутствующей катушки с точно тем же материалом и цветом.`
    if (this.preview.status === 'suspended') return 'Проверка эквивалентной катушки недоступна, пока IFS находится вне поддерживаемого режима DISPLAY_OFF.'
    return 'Недостаточно provider-данных, чтобы безопасно определить эквивалентную катушку.'
  }

  candidateBlockers (candidate: Ad5xIfsEquivalentSpoolCandidate): string {
    return candidate.blockers.map(blocker => ({ slot_empty: 'слот пуст', material_mismatch: 'другой материал', color_mismatch: 'другой цвет', provider_material_unknown: 'материал неизвестен', provider_color_unknown: 'цвет неизвестен' }[blocker] || blocker)).join(' · ')
  }
}
</script>
