<template>
  <v-card
    outlined
    class="mt-4"
    data-test="ifs-preprint-plan"
  >
    <v-card-title class="d-flex flex-wrap align-center py-3 preprint-title">
      <span>План печати</span>
      <v-spacer />
      <v-chip
        small
        label
        :color="statusColor"
        data-test="preprint-status"
      >
        {{ statusLabel }}
      </v-chip>
    </v-card-title>

    <v-card-subtitle
      v-if="plan.filename"
      class="pb-2"
    >
      {{ plan.filename }}
    </v-card-subtitle>

    <v-card-text>
      <v-alert
        v-if="!plan.available"
        text
        type="info"
        class="mb-0"
        data-test="preprint-unavailable"
      >
        Для текущего файла ещё нет данных о материалах и назначениях IFS.
        <span v-if="plan.error"> · {{ plan.error }}</span>
      </v-alert>

      <template v-else>
        <div class="d-flex flex-wrap mb-3 preprint-summary">
          <v-chip
            small
            outlined
          >
            Нужно: {{ plan.summary.required_tools }}
          </v-chip>
          <v-chip
            small
            outlined
          >
            Назначено: {{ plan.summary.assigned_tools }}
          </v-chip>
          <v-chip
            small
            outlined
            :color="plan.summary.ready_tools === plan.summary.required_tools ? 'success' : undefined"
          >
            Готово: {{ plan.summary.ready_tools }}
          </v-chip>
        </div>

        <v-alert
          v-if="plan.warnings.length"
          text
          :type="plan.status === 'blocked' ? 'error' : 'warning'"
          data-test="preprint-warnings"
        >
          <div
            v-for="warning in plan.warnings"
            :key="warning"
          >
            {{ warningLabel(warning) }}
          </div>
        </v-alert>

        <div
          v-for="row in plan.rows"
          :key="`tool-${row.tool}`"
          class="preprint-row"
          :data-test="`preprint-row-${row.tool}`"
        >
          <div class="preprint-tool">
            T{{ row.tool }}
          </div>

          <div class="preprint-cell">
            <div class="text-caption text--secondary">
              Требуется
            </div>
            <div class="d-flex align-center preprint-material">
              <span
                v-if="requirementColor(row)"
                class="preprint-swatch"
                :style="{ backgroundColor: requirementColor(row) }"
              />
              <span class="font-weight-medium">
                {{ row.requirement.material || 'Материал не указан' }}
              </span>
            </div>
            <div
              v-if="row.requirement.color"
              class="text-caption text--secondary"
            >
              {{ row.requirement.color }}
            </div>
          </div>

          <div
            class="preprint-arrow"
            aria-hidden="true"
          >
            →
          </div>

          <div class="preprint-cell">
            <div class="text-caption text--secondary">
              IFS
            </div>
            <template v-if="row.assignment">
              <div class="d-flex align-center preprint-material">
                <span
                  v-if="assignedColor(row)"
                  class="preprint-swatch"
                  :style="{ backgroundColor: assignedColor(row) }"
                />
                <v-chip
                  small
                  label
                  outlined
                >
                  Slot {{ row.assignment.slot }}
                </v-chip>
                <span class="font-weight-medium">
                  {{ assignedLabel(row) }}
                </span>
              </div>
            </template>
            <span
              v-else
              class="font-weight-medium text--secondary"
            >
              Не назначен
            </span>
          </div>

          <v-chip
            small
            label
            :color="rowStateColor(row.state)"
            class="preprint-row-state"
          >
            {{ rowStateLabel(row.state) }}
          </v-chip>
        </div>

        <div class="text-caption text--secondary mt-3">
          Назначения получены из Plugins AD5X / Z-Mod. Изменение карты и запуск печати на этом экране пока отключены.
        </div>
      </template>
    </v-card-text>
  </v-card>
</template>

<script lang="ts">
import Vue from 'vue'
import { Component, Prop } from 'vue-property-decorator'
import type {
  Ad5xIfsPreprintPlan as Ad5xIfsPreprintPlanModel,
  Ad5xIfsPreprintRow,
  Ad5xIfsPreprintRowState,
  Ad5xIfsSlot
} from '@/ad5x/api/ifs'
import { getIfsPrimaryColor } from '@/ad5x/api/ifs'

@Component
export default class IfsPreprintPlan extends Vue {
  @Prop({ type: Object, required: true })
  readonly plan!: Ad5xIfsPreprintPlanModel

  @Prop({ type: Array, required: true })
  readonly slots!: readonly Ad5xIfsSlot[]

  get statusLabel (): string {
    switch (this.plan.status) {
      case 'ready': return 'Готов'
      case 'warning': return 'Проверьте'
      case 'blocked': return 'Заблокирован'
      default: return 'Нет данных'
    }
  }

  get statusColor (): string | undefined {
    switch (this.plan.status) {
      case 'ready': return 'success'
      case 'warning': return 'warning'
      case 'blocked': return 'error'
      default: return undefined
    }
  }

  physicalSlot (row: Ad5xIfsPreprintRow): Ad5xIfsSlot | null {
    const slotNumber = row.assignment?.slot
    if (!slotNumber) return null
    return this.slots.find(slot => slot.slot === slotNumber) ?? null
  }

  requirementColor (row: Ad5xIfsPreprintRow): string {
    return /^#[0-9A-F]{6}$/i.test(row.requirement.color) ? row.requirement.color : ''
  }

  assignedColor (row: Ad5xIfsPreprintRow): string {
    const slot = this.physicalSlot(row)
    return slot?.present ? getIfsPrimaryColor(slot) : ''
  }

  assignedLabel (row: Ad5xIfsPreprintRow): string {
    const slot = this.physicalSlot(row)
    if (!slot) return 'Слот отсутствует'
    if (!slot.present) return 'Пусто'
    return slot.spool.name || slot.spool.material || slot.material || 'Катушка без имени'
  }

  rowStateLabel (state: Ad5xIfsPreprintRowState): string {
    switch (state) {
      case 'ready': return 'Готов'
      case 'unassigned': return 'Не назначен'
      case 'slot_empty': return 'Слот пуст'
      case 'slot_missing': return 'Нет слота'
    }
  }

  rowStateColor (state: Ad5xIfsPreprintRowState): string | undefined {
    if (state === 'ready') return 'success'
    if (state === 'unassigned' || state === 'slot_empty' || state === 'slot_missing') return 'error'
    return undefined
  }

  warningLabel (warning: string): string {
    const labels: Readonly<Record<string, string>> = {
      material_failure: 'Z-Mod не смог надёжно сопоставить материал.',
      color_failure: 'Z-Mod не смог надёжно сопоставить цвет.',
      weak_color: 'Сопоставление цвета неоднозначное — проверьте назначения.',
      duplicate_slot: 'Один физический слот назначен нескольким инструментам.',
      unassigned_tool: 'Не всем инструментам назначен физический слот.',
      assigned_slot_missing: 'Назначение указывает на отсутствующий физический слот.',
      assigned_slot_empty: 'Один из назначенных физических слотов пуст.',
      no_requirements: 'В файле не обнаружены требования к материалам.'
    }
    return labels[warning] ?? warning
  }
}
</script>

<style scoped lang="scss">
.preprint-title,
.preprint-summary,
.preprint-material {
  gap: 8px;
}

.preprint-row {
  display: grid;
  grid-template-columns: 52px minmax(0, 1fr) 28px minmax(0, 1.25fr) auto;
  gap: 12px;
  align-items: center;
  padding: 12px 0;
  border-top: 1px solid rgba(128, 128, 128, 0.18);
}

.preprint-tool {
  font-size: 1rem;
  font-weight: 700;
  text-align: center;
}

.preprint-cell {
  min-width: 0;
}

.preprint-arrow {
  text-align: center;
  font-size: 1.25rem;
  opacity: 0.6;
}

.preprint-swatch {
  display: inline-block;
  width: 18px;
  height: 18px;
  flex: 0 0 18px;
  border-radius: 50%;
  border: 1px solid rgba(128, 128, 128, 0.45);
}

@media (max-width: 700px) {
  .preprint-row {
    grid-template-columns: 42px minmax(0, 1fr) auto;
  }

  .preprint-arrow {
    display: none;
  }

  .preprint-cell:nth-of-type(4) {
    grid-column: 2 / 4;
  }

  .preprint-row-state {
    grid-column: 3;
    grid-row: 1;
  }
}
</style>
