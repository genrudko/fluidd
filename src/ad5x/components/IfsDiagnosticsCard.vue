<template>
  <v-card
    outlined
    class="mt-4"
    data-test="ifs-diagnostics"
  >
    <v-card-title class="d-flex flex-wrap align-center py-3">
      <span>Диагностика IFS</span>
      <v-spacer />
      <v-chip
        small
        label
        outlined
      >
        read-only
      </v-chip>
    </v-card-title>
    <v-card-text>
      <v-row dense>
        <v-col
          v-for="row in rows"
          :key="row.label"
          cols="12"
          sm="6"
          md="4"
        >
          <div class="text-caption text--secondary">
            {{ row.label }}
          </div>
          <div
            class="font-weight-medium"
            :data-test="row.test"
          >
            {{ row.value }}
          </div>
        </v-col>
      </v-row>
      <div class="text-caption text--secondary mt-3">
        Сырые/нормализованные сигналы Z-Mod для диагностики. Они не являются командами управления или recovery-действиями.
      </div>
    </v-card-text>
  </v-card>
</template>

<script lang="ts">
import Vue from 'vue'
import { Component, Prop } from 'vue-property-decorator'
import type { Ad5xIfsDiagnostics } from '@/ad5x/api/ifs'

interface DiagnosticRow { label: string; value: string; test: string }

@Component
export default class IfsDiagnosticsCard extends Vue {
  @Prop({ type: Object, required: true }) readonly diagnostics!: Ad5xIfsDiagnostics
  @Prop({ type: Number, default: 0 }) readonly stateCode!: number
  @Prop({ type: Number, default: 0 }) readonly activeSlot!: number
  @Prop({ default: null }) readonly filamentAtToolhead!: boolean | null

  mask (value: number): string { return `0b${(value & 0xF).toString(2).padStart(4, '0')}` }
  yesNo (value: boolean | null): string { return value === null ? 'неизвестно' : (value ? 'да' : 'нет') }

  get rows (): DiagnosticRow[] {
    return [
      { label: 'IFS state code', value: String(this.stateCode), test: 'diag-state-code' },
      { label: 'Активный слот', value: this.activeSlot ? `IFS ${this.activeSlot}` : 'нет', test: 'diag-active-slot' },
      { label: 'Runtime active slot', value: this.diagnostics.runtime_active_slot ? `IFS ${this.diagnostics.runtime_active_slot}` : 'нет', test: 'diag-runtime-slot' },
      { label: 'F13 chan (raw)', value: String(this.diagnostics.raw_channel), test: 'diag-raw-channel' },
      { label: 'F13 silk_state', value: this.mask(this.diagnostics.silk_mask), test: 'diag-silk-mask' },
      { label: 'F13 stall_state', value: this.mask(this.diagnostics.stall_mask), test: 'diag-stall-mask' },
      { label: 'Insert slot', value: this.diagnostics.insert_slot ? `IFS ${this.diagnostics.insert_slot}` : 'нет', test: 'diag-insert-slot' },
      { label: 'NeedInsert', value: this.yesNo(this.diagnostics.need_insert), test: 'diag-need-insert' },
      { label: 'Filament at toolhead', value: this.yesNo(this.filamentAtToolhead), test: 'diag-toolhead' }
    ]
  }
}
</script>
