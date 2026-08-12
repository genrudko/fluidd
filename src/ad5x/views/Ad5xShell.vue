<template>
  <v-container class="py-6">
    <v-card>
      <v-card-title>Plugins AD5X</v-card-title>
      <v-card-text>
        <v-alert
          v-if="!backendAvailable"
          data-test="backend-unavailable"
          text
          type="info"
        >
          Plugins AD5X backend unavailable
        </v-alert>

        <v-simple-table>
          <tbody>
            <tr>
              <th>Backend</th>
              <td data-test="backend-status">
                {{ backendStatus }}
              </td>
            </tr>
            <tr>
              <th>API</th>
              <td data-test="api-status">
                {{ ad5xState.apiStatus }}
              </td>
            </tr>
            <tr>
              <th>Capabilities</th>
              <td data-test="capabilities-status">
                {{ capabilitiesStatus }}
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
      </v-card-text>
    </v-card>
  </v-container>
</template>

<script lang="ts">
import Vue from 'vue'
import { Component } from 'vue-property-decorator'
import { Ad5xApiClient } from '@/ad5x/api/client'
import { isAd5xBackendAvailable } from '@/ad5x/integration'
import { getAd5xState, initializeAd5x } from '@/ad5x/store'
import type { Ad5xState } from '@/ad5x/store/types'

@Component({})
export default class Ad5xShell extends Vue {
  get ad5xState (): Ad5xState {
    return getAd5xState(this.$store)
  }

  get backendAvailable (): boolean {
    return this.ad5xState.backendAvailable
  }

  get backendStatus (): string {
    return this.backendAvailable ? 'Available' : 'Unavailable'
  }

  get capabilitiesStatus (): string {
    if (!this.backendAvailable) return 'Unavailable'
    if (this.ad5xState.apiStatus === 'compatible') return 'Received'
    if (this.ad5xState.apiStatus === 'error') return 'Error'

    return 'Pending'
  }

  async created (): Promise<void> {
    const backendAvailable = isAd5xBackendAvailable(
      this.$store.getters['server/componentSupport']
    )

    if (!backendAvailable) {
      await initializeAd5x(this.$store, false)
      return
    }

    const api = new Ad5xApiClient(this.$socket)
    await initializeAd5x(this.$store, true, api)
  }
}
</script>
