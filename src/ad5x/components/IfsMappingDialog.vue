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

        <div
          class="mapping-leveling mb-4"
          data-test="mapping-leveling"
        >
          <div>
            <div class="font-weight-medium">
              Карта стола перед печатью
            </div>
            <div class="text-caption text--secondary">
              {{ providerLevelingLabel }}
            </div>
          </div>
          <v-btn-toggle
            :value="leveling"
            dense
            :disabled="busy || !previewToken"
            data-test="mapping-leveling-toggle"
            @change="updateLeveling"
          >
            <v-btn
              :value="0"
              small
            >
              Не снимать
            </v-btn>
            <v-btn
              :value="1"
              small
            >
              Снять
            </v-btn>
          </v-btn-toggle>
        </div>

        <v-alert
          text
          :type="dryRunAlertType"
          class="mb-4"
          data-test="mapping-dry-run-status"
        >
          {{ dryRunStatusText }}
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
  Ad5xIfsLaunchGate,
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

  @Prop({ type: Number, default: null })
  readonly providerLeveling!: 0 | 1 | null

  @Prop({ type: Object, default: null })
  readonly launchGate!: Ad5xIfsLaunchGate | null

  mapping: number[] = []
  automaticMapping: number[] = []
  leveling: 0 | 1 | null = null

  get providerLevelingLabel (): string {
    if (this.providerLeveling === 1) return 'Z-Mod по умолчанию: снять карту'
    if (this.providerLeveling === 0) return 'Z-Mod по умолчанию: не снимать карту'
    return 'Z-Mod не сообщил значение по умолчанию — выберите явно'
  }

  get dryRunAlertType (): 'info' | 'success' | 'warning' {
    if (!this.launchGate) return 'info'
    return this.launchGate.candidate && this.launchGate.provider_launch_plan.ready ? 'success' : 'warning'
  }

  get dryRunStatusText (): string {
    if (!this.launchGate) return 'Dry-run ещё не перепроверен backend. Измените назначение или режим карты стола.'
    const providerPlan = this.launchGate.provider_launch_plan
    if (this.launchGate.candidate && providerPlan.ready) {
      return 'План PRINT_ZCOLOR структурно готов. Реальный запуск остаётся отключён до аппаратной приёмки.'
    }
    if (providerPlan.missing_parameters.includes('LEVELING')) {
      return 'Для полного плана Z-Mod требуется явный выбор режима карты стола.'
    }
    const blockers = this.launchGate.blockers.filter(code => code !== 'launch_write_not_enabled')
    return blockers.length
      ? `Backend заблокировал dry-run: ${blockers.join(', ')}`
      : 'План Z-Mod пока не готов к dry-run.'
  }

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
    this.leveling = this.providerLeveling === 0 || this.providerLeveling === 1 ? this.providerLeveling : null
  }

  emitChange (): void {
    this.$emit('change', [...this.mapping], this.leveling)
  }

  resetToAutomatic (): void {
    if (!this.canResetAutomatic) return
    this.mapping = [...this.automaticMapping]
    this.emitChange()
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
    this.emitChange()
  }

  updateLeveling (value: unknown): void {
    const leveling = Number(value)
    if (leveling !== 0 && leveling !== 1) return
    if (!this.mapping.length && this.preview) this.mapping = [...this.preview.resolved_tool_map]
    this.leveling = leveling
    this.emitChange()
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

.mapping-leveling {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
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
  .mapping-leveling {
    align-items: stretch;
    flex-direction: column;
  }

  .mapping-row {
    grid-template-columns: 44px minmax(0, 1fr) auto;
  }

  .mapping-row .v-select {
    grid-column: 2 / 4;
  }
}
</style>
