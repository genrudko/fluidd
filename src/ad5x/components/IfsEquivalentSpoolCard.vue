<template>
  <v-card
    outlined
    class="mt-4"
    data-test="ifs-equivalent-spool"
  >
    <v-card-title class="d-flex align-center py-3">
      <span>Резервная катушка</span><v-spacer />
      <v-chip
        small
        label
        :color="statusColor"
        data-test="equivalent-status"
      >
        {{ statusLabel }}
      </v-chip>
    </v-card-title>
    <v-card-text
      v-if="mode === 'auto'"
      data-test="equivalent-auto"
    >
      <div
        v-if="available"
        class="d-flex align-center"
      >
        <slot-node
          :slot="preview.source_slot"
          :material="sourceMaterial"
          :color-value="sourceColor"
        />
        <span
          class="mx-3 text-h6"
          aria-hidden="true"
        >→</span>
        <slot-node
          :slot="preview.next_slot"
          :material="nextCandidate ? nextCandidate.material : ''"
          :color-value="nextCandidate ? nextCandidate.color : ''"
          eligible
        />
      </div>
      <div
        v-else
        class="text-body-2"
      >
        {{ unavailableLabel }}
      </div>
    </v-card-text>
    <v-card-text
      v-else
      data-test="equivalent-topology"
    >
      <div class="equivalent-lanes">
        <slot-node
          :slot="preview.source_slot"
          :material="sourceMaterial"
          :color-value="sourceColor"
        />
        <div class="equivalent-candidates">
          <div
            v-for="candidate in preview.candidates"
            :key="candidate.slot"
            class="d-flex align-center equivalent-lane"
            :data-test="`equivalent-slot-${candidate.slot}`"
          >
            <div class="equivalent-line" />
            <div class="flex-grow-1">
              <slot-node
                :slot="candidate.slot"
                :material="candidate.present ? candidate.material : ''"
                :color-value="candidate.present ? candidate.color : ''"
                :eligible="candidate.present && candidate.eligible"
                :unavailable="!candidate.present"
              />
              <div
                v-if="candidate.slot === preview.next_slot"
                class="text-caption primary--text mt-1"
                data-test="equivalent-first-reserve"
              >
                первый резерв
              </div>
              <div
                v-if="mode === 'expert'"
                class="text-caption text--secondary mt-1"
                :data-test="`equivalent-reasons-${candidate.slot}`"
              >
                {{ candidateReason(candidate) }}
              </div>
            </div>
          </div>
        </div>
      </div>
      <div
        v-if="mode === 'expert'"
        class="text-caption text--secondary mt-3"
        data-test="equivalent-read-only"
      >
        Только просмотр · автоматический переход выключен · аппаратное подтверждение отсутствует
      </div>
    </v-card-text>
  </v-card>
</template>

<script lang="ts">
import Vue, { type CreateElement, type RenderContext } from 'vue'
import { Component, Prop } from 'vue-property-decorator'
import type { Ad5xIfsEquivalentSpoolCandidate, Ad5xIfsEquivalentSpoolPreview } from '@/ad5x/api/ifs'

type IfsEquivalentSpoolMode = 'auto' | 'hybrid' | 'expert'

@Component({
  components: {
    SlotNode: {
      functional: true,
      props: {
        slot: { type: Number, required: true },
        material: { type: String, default: '' },
        colorValue: { type: String, default: '' },
        eligible: { type: Boolean, default: false },
        unavailable: { type: Boolean, default: false }
      },
      render (createElement: CreateElement, context: RenderContext<Record<string, unknown>>) {
        const props = context.props
        const detail = props.unavailable
          ? 'пусто / недоступно'
          : [props.material || 'материал неизвестен', props.colorValue || 'цвет неизвестен'].join(' · ')
        return createElement('div', {
          class: ['equivalent-node', { 'equivalent-node--eligible': props.eligible, 'equivalent-node--unavailable': props.unavailable }]
        }, [
          createElement('div', { class: 'd-flex align-center' }, [
            typeof props.colorValue === 'string' && props.colorValue && !props.unavailable
              ? createElement('span', { class: 'equivalent-swatch', style: { backgroundColor: props.colorValue } })
              : null,
            createElement('span', { class: 'font-weight-medium' }, `IFS ${props.slot || '?'}`)
          ]),
          createElement('div', { class: 'text-caption text--secondary mt-1' }, detail)
        ])
      }
    }
  }
})
export default class IfsEquivalentSpoolCard extends Vue {
  @Prop({ type: Object, required: true }) readonly preview!: Ad5xIfsEquivalentSpoolPreview
  @Prop({ type: String, required: true }) readonly mode!: IfsEquivalentSpoolMode

  get available (): boolean {
    return this.preview.status === 'available' &&
      this.preview.next_slot > 0 &&
      this.nextCandidate?.present === true &&
      this.nextCandidate.eligible
  }

  get nextCandidate (): Ad5xIfsEquivalentSpoolCandidate | undefined { return this.preview.candidates.find(candidate => candidate.slot === this.preview.next_slot) }
  get sourceMaterial (): string { const value = this.preview.source?.material; return typeof value === 'string' ? value : '' }
  get sourceColor (): string { const value = this.preview.source?.color; return typeof value === 'string' ? value : '' }
  get statusLabel (): string {
    if (this.available) return 'Резерв готов'
    if (this.preview.status === 'no_candidate') return 'Резерв отсутствует'
    if (this.preview.status === 'suspended') return 'Резерв недоступен'
    return 'Статус неизвестен'
  }

  get unavailableLabel (): string { return this.preview.status === 'no_candidate' ? 'Резерв отсутствует' : 'Резерв недоступен' }
  get statusColor (): string | undefined { return this.available ? 'success' : undefined }
  candidateReason (candidate: Ad5xIfsEquivalentSpoolCandidate): string {
    if (!candidate.present) return 'Недоступен: слот пуст'
    if (candidate.eligible) return 'Подходит как резерв'
    const labels: Readonly<Record<string, string>> = {
      slot_empty: 'слот пуст',
      material_mismatch: 'другой материал',
      color_mismatch: 'другой цвет',
      provider_material_unknown: 'материал неизвестен',
      provider_color_unknown: 'цвет неизвестен'
    }
    const reasons = candidate.blockers.map(blocker => labels[blocker] ?? 'причина недоступна')
    return `Не подходит: ${reasons.length ? reasons.join(' · ') : 'причина недоступна'}`
  }
}
</script>

<style scoped>
.equivalent-lanes { display: grid; grid-template-columns: minmax(130px, 1fr) 2fr; gap: 16px; align-items: center; }
.equivalent-candidates { display: grid; gap: 10px; }
.equivalent-line { width: 24px; border-top: 2px solid currentColor; opacity: .25; margin-right: 8px; }
.equivalent-node { border: 1px solid rgba(128, 128, 128, .35); border-radius: 8px; padding: 10px 12px; min-width: 0; }
.equivalent-node--eligible { border-color: var(--v-success-base); }
.equivalent-node--unavailable { opacity: .65; }
.equivalent-swatch { width: 14px; height: 14px; border: 1px solid rgba(128, 128, 128, .5); border-radius: 50%; margin-right: 8px; }
@media (max-width: 600px) { .equivalent-lanes { grid-template-columns: 1fr; } .equivalent-line { display: none; } }
</style>
