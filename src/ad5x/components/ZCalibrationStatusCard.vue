<template>
  <v-card
    class="mt-4"
    data-test="z-calibration-card"
    outlined
  >
    <v-card-title>Z Calibration</v-card-title>
    <v-card-text>
      <v-alert
        v-if="!module"
        data-test="z-calibration-unavailable"
        text
        type="info"
      >
        Z Calibration state unavailable or incompatible
      </v-alert>

      <template v-else>
        <v-alert
          v-if="hasExternalUnknown"
          data-test="external-unknown-warning"
          text
          type="warning"
        >
          Klipper reports an unexplained Z-offset component of {{ formatMm(module.state.offset.external_unknown) }}.
        </v-alert>

        <v-simple-table>
          <tbody>
            <tr>
              <th>Module</th>
              <td data-test="z-module-health">
                {{ module.health }} / {{ module.available ? 'available' : 'unavailable' }}
              </td>
            </tr>
            <tr>
              <th>Klippy</th>
              <td data-test="z-klippy-state">
                {{ module.state.runtime.klippy }} / {{ module.state.runtime.print_state }}
              </td>
            </tr>
            <tr>
              <th>Lifecycle hook</th>
              <td data-test="z-hook-state">
                {{ hookLabel }}
              </td>
            </tr>
            <tr>
              <th>Z write gate</th>
              <td data-test="z-write-gate">
                {{ module.state.calibration.offset_write_enabled ? 'Enabled' : 'Disabled' }}
              </td>
            </tr>
            <tr>
              <th>Motion actions</th>
              <td data-test="z-motion-actions">
                {{ module.state.calibration.motion_actions_enabled ? 'Enabled' : 'Disabled' }}
              </td>
            </tr>
            <tr>
              <th>Effective Z-offset</th>
              <td data-test="z-effective-offset">
                {{ effectiveOffsetLabel }}
              </td>
            </tr>
            <tr>
              <th>Provenance</th>
              <td data-test="z-provenance">
                {{ module.state.offset.provenance_status }}
              </td>
            </tr>
            <tr>
              <th>Job lifecycle</th>
              <td data-test="z-job-phase">
                {{ module.state.job.phase }}
              </td>
            </tr>
            <tr>
              <th>Safety</th>
              <td data-test="z-safety-state">
                {{ safetyLabel }}
              </td>
            </tr>
          </tbody>
        </v-simple-table>

        <v-alert
          v-if="module.state.safety.last_error"
          class="mt-4"
          data-test="z-safety-error"
          text
          type="warning"
        >
          {{ module.state.safety.last_error }}
        </v-alert>
      </template>
    </v-card-text>
  </v-card>
</template>

<script lang="ts">
import Vue from 'vue'
import { Component, Prop } from 'vue-property-decorator'
import type { Ad5xSnapshot, Ad5xZCalibrationModule } from '@/ad5x/api/types'
import { getZCalibrationModule } from '@/ad5x/api/types'

@Component({})
export default class ZCalibrationStatusCard extends Vue {
  @Prop({ required: true }) readonly snapshot!: Ad5xSnapshot

  get module (): Ad5xZCalibrationModule | null {
    return getZCalibrationModule(this.snapshot)
  }

  get hasExternalUnknown (): boolean {
    return this.module !== null && Math.abs(this.module.state.offset.external_unknown) > 0.000001
  }

  get hookLabel (): string {
    if (!this.module) return 'Unavailable'

    const labels: Readonly<Record<string, string>> = {
      loaded: 'Loaded',
      absent: 'Absent',
      unknown: 'Unknown',
      malformed: 'Malformed',
      incompatible: 'Incompatible'
    }

    return labels[this.module.state.calibration.offset_hook_status] ?? this.module.state.calibration.offset_hook_status
  }

  get effectiveOffsetLabel (): string {
    if (!this.module || this.module.state.offset.effective === null) return 'Unavailable'

    return this.formatMm(this.module.state.offset.effective)
  }

  get safetyLabel (): string {
    if (!this.module) return 'Unavailable'

    const failClosed = this.module.state.safety.fail_closed ? 'fail-closed' : 'not fail-closed'
    return `${failClosed}; load cell: ${this.module.state.safety.h7_role}`
  }

  formatMm (value: number): string {
    return `${value.toFixed(3)} mm`
  }
}
</script>
