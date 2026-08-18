<template>
  <v-container class="py-6">
    <v-alert
      v-if="!supportsAnyAd5x"
      data-test="backend-unavailable"
      text
      type="info"
    >
      Plugins AD5X backend не обнаружен. Штатная работа Fluidd не изменена.
    </v-alert>

    <template v-else>
      <z-calibration-status-card
        v-if="zCalibrationSnapshot"
        :loading="zCalibrationLoading"
        :snapshot="zCalibrationSnapshot"
        @reconcile="reconcileZCalibration"
      />

      <v-card
        v-else-if="supportsZCalibration && zCalibrationLoading"
        data-test="z-calibration-loading"
        outlined
      >
        <v-card-title>Центр калибровки Z</v-card-title>
        <v-card-text>
          <v-progress-linear indeterminate />
        </v-card-text>
      </v-card>

      <v-alert
        v-else-if="supportsZCalibration && zCalibrationError"
        data-test="z-calibration-error"
        text
        type="warning"
      >
        <div>{{ zCalibrationError }}</div>
        <v-btn
          class="mt-2"
          outlined
          small
          @click="loadZCalibration"
        >
          Повторить
        </v-btn>
      </v-alert>

      <v-alert
        v-else-if="!supportsZCalibration"
        data-test="z-calibration-unavailable"
        text
        type="info"
      >
        Standalone Z Calibration backend не установлен. Остальные модули Plugins AD5X продолжают работать независимо.
      </v-alert>

      <v-expansion-panels
        class="mt-4"
        flat
      >
        <v-expansion-panel>
          <v-expansion-panel-header>
            Системная информация Plugins AD5X
          </v-expansion-panel-header>
          <v-expansion-panel-content>
            <v-simple-table>
              <tbody>
                <tr>
                  <th>Shared backend</th>
                  <td data-test="backend-status">
                    {{ supportsSharedBackend ? 'Available' : 'Unavailable' }}
                  </td>
                </tr>
                <tr>
                  <th>Shared API</th>
                  <td data-test="api-status">
                    {{ ad5xState.apiStatus }}
                  </td>
                </tr>
                <tr>
                  <th>Shared snapshot</th>
                  <td data-test="snapshot-status">
                    {{ sharedSnapshotStatus }}
                  </td>
                </tr>
                <tr v-if="ad5xState.snapshot">
                  <th>Shared backend version</th>
                  <td data-test="backend-version">
                    {{ ad5xState.snapshot.backend_version }}
                  </td>
                </tr>
                <tr>
                  <th>Z Calibration component</th>
                  <td data-test="z-component-status">
                    {{ supportsZCalibration ? 'Available' : 'Unavailable' }}
                  </td>
                </tr>
                <tr>
                  <th>Z Calibration API</th>
                  <td data-test="z-api-status">
                    {{ zCalibrationStatus }}
                  </td>
                </tr>
              </tbody>
            </v-simple-table>

            <v-alert
              v-if="ad5xState.error"
              class="mt-4"
              data-test="api-error"
              text
              type="warning"
            >
              {{ ad5xState.error }}
            </v-alert>
          </v-expansion-panel-content>
        </v-expansion-panel>
      </v-expansion-panels>
    </template>
  </v-container>
</template>

<script lang="ts">
import Vue from 'vue'
import { Component } from 'vue-property-decorator'
import { Ad5xApiClient } from '@/ad5x/api/client'
import type {
  Ad5xSocketTransport,
  Ad5xZCalibrationSnapshot
} from '@/ad5x/api/types'
import ZCalibrationStatusCard from '@/ad5x/components/ZCalibrationStatusCard.vue'
import {
  isSharedAd5xBackendAvailable,
  isZCalibrationBackendAvailable
} from '@/ad5x/integration'
import { getAd5xState, initializeAd5x } from '@/ad5x/store'
import type { Ad5xState } from '@/ad5x/store/types'

export type ZCalibrationApiStatus = 'unavailable' | 'loading' | 'compatible' | 'error'

@Component({
  components: {
    ZCalibrationStatusCard
  }
})
export default class Ad5xShell extends Vue {
  zCalibrationSnapshot: Ad5xZCalibrationSnapshot | null = null
  zCalibrationStatus: ZCalibrationApiStatus = 'unavailable'
  zCalibrationError: string | null = null
  zCalibrationLoading = false

  get ad5xState (): Ad5xState {
    return getAd5xState(this.$store)
  }

  get componentSupport () {
    return this.$store.getters['server/componentSupport']
  }

  get supportsSharedBackend (): boolean {
    return isSharedAd5xBackendAvailable(this.componentSupport)
  }

  get supportsZCalibration (): boolean {
    return isZCalibrationBackendAvailable(this.componentSupport)
  }

  get supportsAnyAd5x (): boolean {
    return this.supportsSharedBackend || this.supportsZCalibration
  }

  get sharedSnapshotStatus (): string {
    if (!this.supportsSharedBackend) return 'Unavailable'
    if (this.ad5xState.apiStatus === 'compatible') return 'Received'
    if (this.ad5xState.apiStatus === 'error') return 'Error'

    return 'Pending'
  }

  private apiClient (): Ad5xApiClient {
    const socket = (this as unknown as { $socket: Ad5xSocketTransport }).$socket
    return new Ad5xApiClient(socket)
  }

  private errorMessage (error: unknown): string {
    return error instanceof Error ? error.message : 'Unknown Z Calibration API error'
  }

  async loadZCalibration (): Promise<void> {
    if (!this.supportsZCalibration) {
      this.zCalibrationSnapshot = null
      this.zCalibrationStatus = 'unavailable'
      this.zCalibrationError = null
      return
    }

    this.zCalibrationLoading = true
    this.zCalibrationStatus = 'loading'
    this.zCalibrationError = null

    try {
      this.zCalibrationSnapshot = await this.apiClient().getZCalibrationSnapshot()
      this.zCalibrationStatus = 'compatible'
    } catch (error: unknown) {
      this.zCalibrationSnapshot = null
      this.zCalibrationStatus = 'error'
      this.zCalibrationError = this.errorMessage(error)
    } finally {
      this.zCalibrationLoading = false
    }
  }

  async reconcileZCalibration (): Promise<void> {
    if (!this.supportsZCalibration || this.zCalibrationLoading) return

    this.zCalibrationLoading = true
    this.zCalibrationError = null

    try {
      const api = this.apiClient()
      await api.reconcileZCalibration()
      this.zCalibrationSnapshot = await api.getZCalibrationSnapshot()
      this.zCalibrationStatus = 'compatible'
    } catch (error: unknown) {
      this.zCalibrationStatus = 'error'
      this.zCalibrationError = this.errorMessage(error)
    } finally {
      this.zCalibrationLoading = false
    }
  }

  async created (): Promise<void> {
    if (this.supportsSharedBackend) {
      await initializeAd5x(this.$store, true, this.apiClient())
    } else {
      await initializeAd5x(this.$store, false)
    }

    await this.loadZCalibration()
  }
}
</script>
