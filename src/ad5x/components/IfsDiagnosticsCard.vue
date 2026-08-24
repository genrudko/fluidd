<template>
  <v-card
    outlined
    class="mt-4"
    data-test="ifs-diagnostics"
  >
    <v-card-title class="d-flex flex-wrap align-center py-3">
      <span>{{ $t('app.ad5x.ifs.diagnostics.title') }}</span>
      <v-spacer />
      <v-chip
        small
        label
        outlined
      >
        {{ $t('app.ad5x.common.readOnly') }}
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
        {{ $t('app.ad5x.ifs.diagnostics.description') }}
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
  yesNo (value: boolean | null): string { return value === null ? this.$t('app.ad5x.common.unknown').toString() : (value ? this.$t('app.ad5x.common.yes').toString() : this.$t('app.ad5x.common.no').toString()) }

  get rows (): DiagnosticRow[] {
    return [
      { label: this.$t('app.ad5x.ifs.diagnostics.stateCode').toString(), value: String(this.stateCode), test: 'diag-state-code' },
      { label: this.$t('app.ad5x.ifs.diagnostics.activeSlot').toString(), value: this.activeSlot ? `IFS ${this.activeSlot}` : this.$t('app.ad5x.common.none').toString(), test: 'diag-active-slot' },
      { label: this.$t('app.ad5x.ifs.diagnostics.runtimeActiveSlot').toString(), value: this.diagnostics.runtime_active_slot ? `IFS ${this.diagnostics.runtime_active_slot}` : this.$t('app.ad5x.common.none').toString(), test: 'diag-runtime-slot' },
      { label: this.$t('app.ad5x.ifs.diagnostics.rawChannel').toString(), value: String(this.diagnostics.raw_channel), test: 'diag-raw-channel' },
      { label: this.$t('app.ad5x.ifs.diagnostics.silkState').toString(), value: this.mask(this.diagnostics.silk_mask), test: 'diag-silk-mask' },
      { label: this.$t('app.ad5x.ifs.diagnostics.stallState').toString(), value: this.mask(this.diagnostics.stall_mask), test: 'diag-stall-mask' },
      { label: this.$t('app.ad5x.ifs.diagnostics.insertSlot').toString(), value: this.diagnostics.insert_slot ? `IFS ${this.diagnostics.insert_slot}` : this.$t('app.ad5x.common.none').toString(), test: 'diag-insert-slot' },
      { label: this.$t('app.ad5x.ifs.diagnostics.needInsert').toString(), value: this.yesNo(this.diagnostics.need_insert), test: 'diag-need-insert' },
      { label: this.$t('app.ad5x.ifs.diagnostics.filamentAtToolhead').toString(), value: this.yesNo(this.filamentAtToolhead), test: 'diag-toolhead' }
    ]
  }
}
</script>
