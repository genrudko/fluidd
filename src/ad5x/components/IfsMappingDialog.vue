<template>
  <v-dialog
    :value="value"
    max-width="820"
    @input="$emit('input', $event)"
  >
    <v-card data-test="ifs-mapping-dialog">
      <v-card-title class="d-flex align-center mapping-title">
        <span>{{ $t('app.ad5x.ifs.mapping.title') }}</span>
        <v-spacer />
        <v-chip
          small
          label
          outlined
        >
          {{ $t('app.ad5x.ifs.mapping.manualDraft') }}
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
          {{ $t('app.ad5x.ifs.mapping.draftNotice') }}
        </v-alert>

        <div
          class="mapping-leveling mb-4"
          data-test="mapping-leveling"
        >
          <div>
            <div class="font-weight-medium">
              {{ $t('app.ad5x.ifs.mapping.bedMeshBeforePrint') }}
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
              {{ $t('app.ad5x.ifs.mapping.keepMesh') }}
            </v-btn>
            <v-btn
              :value="1"
              small
            >
              {{ $t('app.ad5x.ifs.mapping.probeMesh') }}
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
              {{ $t('app.ad5x.ifs.mapping.required') }}
            </div>
            <div class="font-weight-medium">
              {{ row.requirement.material || $t('app.ad5x.ifs.mapping.materialUnspecified') }}
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
          {{ $t('app.ad5x.ifs.mapping.resetAutomatic') }}
        </v-btn>
        <span class="text-caption text--secondary ml-2">
          {{ $t('app.ad5x.ifs.mapping.analysisSource') }}
        </span>
        <v-spacer />
        <v-btn
          text
          :disabled="busy || !canPrepare"
          data-test="mapping-prepare"
          @click="prepareLaunch"
        >
          {{ $t('app.ad5x.ifs.mapping.finalCheck') }}
        </v-btn>
        <v-btn
          text
          :disabled="busy"
          @click="$emit('input', false)"
        >
          {{ $t('app.ad5x.ifs.mapping.close') }}
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

  @Prop({ type: String, default: '' })
  readonly draftToken!: string

  @Prop({ type: Boolean, default: false })
  readonly prepared!: boolean

  mapping: number[] = []
  automaticMapping: number[] = []
  leveling: 0 | 1 | null = null

  get providerLevelingLabel (): string {
    if (this.providerLeveling === 1) return this.$t('app.ad5x.ifs.mapping.providerLevelingProbe').toString()
    if (this.providerLeveling === 0) return this.$t('app.ad5x.ifs.mapping.providerLevelingKeep').toString()
    return this.$t('app.ad5x.ifs.mapping.providerLevelingUnknown').toString()
  }

  get dryRunAlertType (): 'info' | 'success' | 'warning' {
    if (!this.launchGate) return 'info'
    return this.launchGate.candidate && this.launchGate.provider_launch_plan.ready ? 'success' : 'warning'
  }

  get dryRunStatusText (): string {
    if (!this.launchGate) return this.$t('app.ad5x.ifs.mapping.dryRunUnchecked').toString()
    const providerPlan = this.launchGate.provider_launch_plan
    if (this.launchGate.candidate && providerPlan.ready) {
      const acceptance = this.launchGate.hardware_acceptance
      if (acceptance.required && !acceptance.accepted) {
        if (this.prepared) return this.$t('app.ad5x.ifs.mapping.dryRunPreparedHardwareBlocked').toString()
        return this.$t('app.ad5x.ifs.mapping.dryRunReadyHardwareBlocked').toString()
      }
      return this.$t('app.ad5x.ifs.mapping.dryRunReadyDisabled').toString()
    }
    if (providerPlan.missing_parameters.includes('LEVELING')) {
      return this.$t('app.ad5x.ifs.mapping.levelingRequired').toString()
    }
    const blockers = this.launchGate.blockers.filter(code => code !== 'launch_write_not_enabled')
    return blockers.length
      ? this.$t('app.ad5x.ifs.mapping.dryRunBlocked', { blockers: blockers.join(', ') }).toString()
      : this.$t('app.ad5x.ifs.mapping.dryRunNotReady').toString()
  }

  get canPrepare (): boolean {
    return Boolean(this.preview && this.previewToken && this.draftToken && this.mapping.length === this.preview.allowed_tool_count && (this.leveling === 0 || this.leveling === 1))
  }

  get canResetAutomatic (): boolean {
    return this.mapping.length === this.automaticMapping.length &&
      this.mapping.some((slot, index) => slot !== this.automaticMapping[index])
  }

  get slotItems (): SlotItem[] {
    return [1, 2, 3, 4].map(slotNumber => {
      const slot = this.slots.find(item => item.slot === slotNumber)
      if (!slot) return { value: slotNumber, text: this.$t('app.ad5x.ifs.mapping.slotUnavailable', { slot: slotNumber }).toString() }
      if (!slot.present) return { value: slotNumber, text: this.$t('app.ad5x.ifs.mapping.slotEmpty', { slot: slotNumber }).toString() }
      const label = slot.spool.name || slot.spool.material || slot.material || this.$t('app.ad5x.ifs.mapping.spoolFallback').toString()
      return { value: slotNumber, text: `${slotNumber} · ${label}` }
    })
  }

  @Watch('value')
  onValueChanged (open: boolean): void {
    if (!open) return
    this.resetMapping()
    if (this.leveling === null || !this.mapping.length) return
    this.$nextTick(() => {
      if (!this.busy && this.value) this.emitChange()
    })
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

  prepareLaunch (): void {
    if (!this.canPrepare || this.leveling === null) return
    this.$emit('prepare', [...this.mapping], this.leveling)
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
      case 'ready': return this.$t('app.ad5x.ifs.mapping.stateReady').toString()
      case 'unassigned': return this.$t('app.ad5x.ifs.mapping.stateUnassigned').toString()
      case 'slot_empty': return this.$t('app.ad5x.ifs.mapping.stateSlotEmpty').toString()
      case 'slot_missing': return this.$t('app.ad5x.ifs.mapping.stateSlotMissing').toString()
    }
  }

  warningLabel (warning: string): string {
    const labels: Readonly<Record<string, string>> = {
      assigned_slot_empty: this.$t('app.ad5x.ifs.mapping.warningAssignedSlotEmpty').toString(),
      assigned_slot_missing: this.$t('app.ad5x.ifs.mapping.warningAssignedSlotMissing').toString(),
      unassigned_tool: this.$t('app.ad5x.ifs.mapping.warningUnassignedTool').toString(),
      manual_duplicate_slot: this.$t('app.ad5x.ifs.mapping.warningManualDuplicate').toString(),
      duplicate_slot: this.$t('app.ad5x.ifs.mapping.warningDuplicate').toString()
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
