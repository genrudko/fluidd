<template>
  <v-card
    outlined
    class="mt-4"
    data-test="ifs-interoperability"
  >
    <v-card-title class="d-flex flex-wrap align-center py-3">
      <span>Интеграции</span><v-spacer />
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
        {{ orca.namespace }} · {{ orca.record_count }} lanes · target {{ orca.target_version }}
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
        direction={{ orca.direction }} · publishable={{ orca.publishable ? 'yes' : 'no' }} · Moonraker agent={{ orca.requires_moonraker_agent ? 'required' : 'not required' }}
        <span v-if="orca.conflicts.length"> · conflicts={{ orca.conflicts.length }}</span>
      </div>
      <v-divider class="my-4" />
      <div class="d-flex flex-wrap align-center">
        <div>
          <div class="text-body-2 font-weight-medium">
            Внешняя / bypass подача
          </div>
          <div class="text-caption text--secondary">
            {{ external.id }} · отдельный источник, не Slot 5
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
          {{ external.runtime_supported ? 'runtime supported' : 'runtime не поддержан' }}
        </v-chip>
      </div>
      <div
        v-if="expert"
        class="text-caption text--secondary mt-2"
      >
        control={{ external.control_supported ? 'yes' : 'no' }} · kind={{ external.kind }}
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
