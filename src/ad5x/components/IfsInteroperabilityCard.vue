<template>
  <v-card
    outlined
    class="mt-4"
    data-test="ifs-interoperability"
  >
    <v-card-title class="d-flex flex-wrap align-center py-3">
      <span>{{ $t('app.ad5x.ifs.interoperability.title') }}</span><v-spacer />
      <v-chip
        small
        label
        :color="orcaColor"
        data-test="ifs-orca-state"
      >
        Orca: {{ orca.state || 'unknown' }}
      </v-chip>
    </v-card-title>
    <v-card-text>
      <div class="text-body-2 font-weight-medium">
        OrcaSlicer / Moonraker lane_data
      </div>
      <div class="text-caption text--secondary">
        {{ orca.namespace }} · {{ $t('app.ad5x.ifs.interoperability.laneSummary', { count: orca.record_count, target: orca.target_version }) }}
      </div>
      <v-alert
        v-if="orca.error"
        dense
        text
        type="warning"
        class="mt-3 mb-0"
        data-test="ifs-orca-error"
      >
        {{ orca.error }}
      </v-alert>
      <div
        v-if="expert"
        class="text-caption text--secondary mt-2"
        data-test="ifs-orca-details"
      >
        {{ $t('app.ad5x.ifs.interoperability.orcaDetails', { direction: orca.direction, publishable: orca.publishable ? $t('app.ad5x.common.yes') : $t('app.ad5x.common.no'), agent: orca.requires_moonraker_agent ? $t('app.ad5x.common.required') : $t('app.ad5x.common.notRequired') }) }}
        <span v-if="orca.conflicts.length"> · {{ $t('app.ad5x.ifs.interoperability.conflicts', { count: orca.conflicts.length }) }}</span>
      </div>
      <v-divider class="my-4" />
      <div class="d-flex flex-wrap align-center">
        <div>
          <div class="text-body-2 font-weight-medium">
            {{ $t('app.ad5x.ifs.interoperability.externalFeed') }}
          </div>
          <div class="text-caption text--secondary">
            {{ external.id }} · {{ $t('app.ad5x.ifs.interoperability.separateSource') }}
          </div>
        </div>
        <v-spacer />
        <v-chip
          small
          label
          outlined
          :color="external.runtime_supported ? 'success' : undefined"
          data-test="ifs-external-runtime"
        >
          {{ external.runtime_supported ? $t('app.ad5x.ifs.interoperability.runtimeSupported') : $t('app.ad5x.ifs.interoperability.runtimeUnsupported') }}
        </v-chip>
      </div>
      <div
        v-if="expert"
        class="text-caption text--secondary mt-2"
      >
        {{ $t('app.ad5x.ifs.interoperability.externalDetails', { control: external.control_supported ? $t('app.ad5x.common.yes') : $t('app.ad5x.common.no'), kind: external.kind }) }}
      </div>
    </v-card-text>
  </v-card>
</template>

<script lang="ts">
import Vue from 'vue'
import { Component, Prop } from 'vue-property-decorator'
import type { Ad5xIfsInteroperability, Ad5xIfsTopology } from '@/ad5x/api/ifs'
@Component
export default class IfsInteroperabilityCard extends Vue {
  @Prop({ type: Object, required: true }) readonly topology!: Ad5xIfsTopology
  @Prop({ type: Object, required: true }) readonly interoperability!: Ad5xIfsInteroperability
  @Prop({ type: Boolean, default: false }) readonly expert!: boolean
  get orca () { return this.interoperability.orca_lane_data }
  get external () { return this.topology.external_source }
  get orcaColor (): string | undefined {
    if (this.orca.state === 'published' || this.orca.state === 'in_sync' || this.orca.state === 'ready') return 'success'
    if (this.orca.state === 'conflict' || this.orca.state === 'error') return 'warning'
    return undefined
  }
}
</script>
