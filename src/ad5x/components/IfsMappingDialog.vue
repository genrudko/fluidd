<template>
  <v-dialog
    :value="value"
    max-width="820"
    @input="$emit('input', $event)"
  >
    <v-card data-test="ifs-mapping-dialog">
      <v-card-title class="d-flex align-center mapping-title">
        <span>Назначение материалов IFS</span>
        <v-spacer />
        <v-chip
          small
          label
          outlined
        >
          Ручной черновик
        </v-chip>
      </v-card-title>

      <v-card-subtitle v-if="preview">
        {{ preview.filename }}
      </v-card-subtitle>

      <v-card-text>
        <v-alert
          text
          type="info"
          class="mb-4"
        >
          Здесь меняется только черновик T→slot. Запуск печати пока не выполняется.
        </v-alert>

        <v-alert
          v-if="error"
          text
          type="error"
          data-test="mapping-error"
        >
          {{ error }}
        </v-alert>

        <div
          v-for="row in plan.rows"
          :key="`mapping-tool-${row.tool}`"
          class="mapping-row"
          :data-test="`mapping-row-${row.tool}`"
        >
          <div class="mapping-tool">
            T{{ row.tool }}
          </div>

          <div class="mapping-requirement">
            <div class="text-caption text--secondary">
              Требуется
            </div>
            <div class="font-weight-medium">
              {{ row.requirement.material || 'Материал не указан' }}
            </div>
            <div
              v-if="row.requirement.color"
              class="text-caption text--secondary"
            >
              {{ row.requirement.color }}
            </div>
          </div>

          <v-select
            :value="selectedSlot(row.tool)"
            :items="slotItems"
            item-text="text"
            item-value="value"
            dense
            outlined
            hide-details
            :disabled="busy || !previewToken"
            :data-test="`mapping-select-${row.tool}`"
            @change="updateSlot(row.tool, $event)"
          />

          <v-chip
            small
            label
            :color="row.state === 'ready' ? 'success' : 'error'"
          >
            {{ rowStateLabel(row.state) }}
          </v-chip>
        </div>

        <v-alert
          v-if="plan.warnings.length"
          text
          :type="plan.status === 'blocked' ? 'error' : 'warning'"
          class="mt-4 mb-0"
        >
          <div
            v-for="warning in plan.warnings"
            :key="warning"
          >
            {{ warningLabel(warning) }}
          </div>
        </v-alert>

        <v-progress-linear
          v-if="busy"
          indeterminate
          class="mt-4"
          data-test="mapping-busy"
        />
      </v-card-text>

      <v-card-actions>
        <v-btn
          text
          :disabled="busy || !canResetAutomatic"
          data-test="mapping-reset-auto"
          @click="resetToAutomatic"
        >
          Сбросить к авто
        </v-btn>
        <span class="text-caption text--secondary ml-2">
          Источник анализа: Z-Mod · применение карты отключено
        </span>
        <v-spacer />
        <v-btn
          text
          :disabled="busy"
          @click="$emit('input', false)"
        >
          Закрыть
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script lang="ts">
import Vue from 'vue'
import { Component, Prop, Watch } from 'vue-property-decorator'
import type {
  Ad5xIfsJobPreview,
  Ad5xIfsPreprintPlan,
  Ad5xIfsPreprintRowState,
  Ad5xIfsSlot
} from '@/ad5x/api/ifs'

interface SlotItem {
  value: number
  text: string
}

@Component
export default class IfsMappingDialog extends Vue {
  @Prop({ type: Boolean, default: false })
  readonly value!: boolean

  @Prop({ type: Object, default: null })
  readonly preview!: Ad5xIfsJobPreview | null

  @Prop({ type: String, default: '' })
  readonly previewToken!: string

  @Prop({ type: Object, required: true })
  readonly plan!: Ad5xIfsPreprintPlan

  @Prop({ type: Array, required: true })
  readonly slots!: readonly Ad5xIfsSlot[]

  @Prop({ type: Boolean, default: false })
  readonly busy!: boolean

  @Prop({ type: String, default: '' })
  readonly error!: string

  mapping: number[] = []
  automaticMapping: number[] = []

  get canResetAutomatic (): boolean {
    return this.mapping.length === this.automaticMapping.length &&
      this.mapping.some((slot, index) => slot !== this.automaticMapping[index])
  }

  get slotItems (): SlotItem[] {
    return [1, 2, 3, 4].map(slotNumber => {
      const slot = this.slots.find(item => item.slot === slotNumber)
      if (!slot) return { value: slotNumber, text: `${slotNumber} · слот недоступен` }
      if (!slot.present) return { value: slotNumber, text: `${slotNumber} · пусто` }
      const label = slot.spool.name || slot.spool.material || slot.material || 'катушка'
      return { value: slotNumber, text: `${slotNumber} · ${label}` }
    })
  }

  @Watch('value')
  onValueChanged (open: boolean): void {
    if (open) this.resetMapping()
  }

  @Watch('previewToken')
  onPreviewTokenChanged (): void {
    if (this.value) this.resetMapping()
  }

  resetMapping (): void {
    const mapping = this.preview ? [...this.preview.resolved_tool_map] : []
    this.automaticMapping = [...mapping]
    this.mapping = mapping
  }

  resetToAutomatic (): void {
    if (!this.canResetAutomatic) return
    this.mapping = [...this.automaticMapping]
    this.$emit('change', [...this.mapping])
  }

  selectedSlot (tool: number): number | null {
    return this.mapping[tool] ?? this.preview?.resolved_tool_map[tool] ?? null
  }

  updateSlot (tool: number, value: unknown): void {
    const slot = Number(value)
    if (!this.preview || !Number.isInteger(tool) || tool < 0 || tool >= this.preview.allowed_tool_count) return
    if (!Number.isInteger(slot) || slot < 1 || slot > 4) return

    const next = [...this.mapping]
    if (next.length !== this.preview.allowed_tool_count) next.splice(0, next.length, ...this.preview.resolved_tool_map)
    next[tool] = slot
    this.mapping = next
    this.$emit('change', [...next])
  }

  rowStateLabel (state: Ad5xIfsPreprintRowState): string {
    switch (state) {
      case 'ready': return 'Готов'
      case 'unassigned': return 'Не назначен'
      case 'slot_empty': return 'Слот пуст'
      case 'slot_missing': return 'Нет слота'
    }
  }

  warningLabel (warning: string): string {
    const labels: Readonly<Record<string, string>> = {
      assigned_slot_empty: 'Один из назначенных физических слотов пуст.',
      assigned_slot_missing: 'Назначение указывает на отсутствующий физический слот.',
      unassigned_tool: 'Не всем инструментам назначен физический слот.',
      manual_duplicate_slot: 'Один слот вручную назначен нескольким инструментам.',
      duplicate_slot: 'Один физический слот назначен нескольким инструментам.'
    }
    return labels[warning] ?? warning
  }
}
</script>

<style scoped lang="scss">
.mapping-title {
  gap: 8px;
}

.mapping-row {
  display: grid;
  grid-template-columns: 54px minmax(150px, 1fr) minmax(210px, 1.3fr) auto;
  gap: 12px;
  align-items: center;
  padding: 12px 0;
  border-top: 1px solid rgba(128, 128, 128, 0.18);
}

.mapping-tool {
  text-align: center;
  font-weight: 700;
}

.mapping-requirement {
  min-width: 0;
}

@media (max-width: 700px) {
  .mapping-row {
    grid-template-columns: 44px minmax(0, 1fr) auto;
  }

  .mapping-row .v-select {
    grid-column: 2 / 4;
  }
}
</style>
