<template>
  <v-card
    outlined
    class="mt-4"
    data-test="ifs-recovery"
  >
    <v-card-title class="d-flex flex-wrap align-center py-3">
      <span>{{ $t('app.ad5x.ifs.recovery.title') }}</span>
      <v-spacer />
      <v-chip
        small
        label
        :color="statusColor"
        data-test="ifs-recovery-state"
      >
        {{ statusLabel }}
      </v-chip>
    </v-card-title>
    <v-card-text>
      <v-alert
        v-if="preview.evidence.driver_error"
        dense
        text
        type="warning"
        data-test="ifs-recovery-driver-error"
      >
        {{ $t('app.ad5x.ifs.recovery.driverError') }}
      </v-alert>
      <v-alert
        v-else-if="preview.evidence.need_insert"
        dense
        text
        type="info"
        data-test="ifs-recovery-insert"
      >
        {{ $t('app.ad5x.ifs.recovery.autoInsert', { slot: preview.evidence.insert_slot || '?' }) }}
      </v-alert>
      <div class="text-caption text--secondary">
        {{ $t('app.ad5x.ifs.recovery.description') }}
      </div>
      <template v-if="expert">
        <v-divider class="my-3" />
        <div class="text-body-2 font-weight-medium mb-2">
          {{ $t('app.ad5x.ifs.recovery.sourceVerifiedPrimitives') }}
        </div>
        <div
          v-for="item in preview.primitives"
          :key="item.id"
          class="text-caption mb-1"
          data-test="ifs-recovery-primitive"
        >
          {{ item.id }} → {{ item.provider_command }} · {{ item.scope }} · {{ $t('app.ad5x.ifs.recovery.executionDisabled') }}
        </div>
        <div
          class="text-caption text--secondary mt-2"
          data-test="ifs-recovery-sequences"
        >
          {{ $t('app.ad5x.ifs.recovery.sequenceSummary', { driver: sequence('driver_error_retry'), timeout: sequence('timeout_cleanup') }) }}
        </div>
      </template>
    </v-card-text>
  </v-card>
</template>

<script lang="ts">
import Vue from 'vue'
import { Component, Prop } from 'vue-property-decorator'
import type { Ad5xIfsRecoveryPreview } from '@/ad5x/api/ifs'

@Component
export default class IfsRecoveryCard extends Vue {
  @Prop({ type: Object, required: true }) readonly preview!: Ad5xIfsRecoveryPreview
  @Prop({ type: Boolean, default: false }) readonly expert!: boolean

  get statusColor (): string | undefined {
    if (this.preview.status === 'driver_error') return 'warning'
    if (this.preview.status === 'attention') return 'info'
    return undefined
  }

  get statusLabel (): string {
    const labels: Readonly<Record<string, string>> = {
      idle: this.$t('app.ad5x.ifs.recovery.statusIdle').toString(),
      attention: this.$t('app.ad5x.ifs.recovery.statusAttention').toString(),
      driver_error: this.$t('app.ad5x.ifs.recovery.statusDriverError').toString()
    }
    return labels[this.preview.status] ?? this.preview.status
  }

  sequence (name: string): string { return (this.preview.provider_sequences[name] ?? []).join(' → ') || this.$t('app.ad5x.common.none').toString() }
}
</script>
