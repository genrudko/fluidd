<template>
  <v-container class="py-6">
    <div class="d-flex flex-wrap align-center mb-4 materials-header">
      <div>
        <div class="text-h5 font-weight-medium">
          IFS / Материалы
        </div>
        <div class="text-body-2 text--secondary mt-1">
          Четыре физических слота AD5X. Состояние и катушки приходят из Plugins AD5X.
        </div>
      </div>
      <v-spacer />
      <v-btn
        text
        :to="{ name: 'ad5x' }"
      >
        Калибровка Z
      </v-btn>
      <v-btn
        outlined
        small
        :loading="refreshing"
        :disabled="!supportsSharedBackend"
        @click="refreshSnapshot"
      >
        Обновить
      </v-btn>
    </div>

    <v-alert
      v-if="!supportsSharedBackend"
      text
      type="info"
      data-test="ifs-backend-unavailable"
    >
      Shared Plugins AD5X backend не обнаружен. Менеджер материалов недоступен.
    </v-alert>

    <template v-else>
      <v-alert
        v-if="ad5xState.apiStatus === 'error'"
        text
        type="warning"
        data-test="ifs-api-error"
      >
        {{ ad5xState.error }}
      </v-alert>

      <v-alert
        v-if="actionError"
        text
        type="error"
        data-test="ifs-action-error"
      >
        {{ actionError }}
      </v-alert>

      <v-card
        v-if="ad5xState.apiStatus === 'loading' && !ifsModule"
        outlined
      >
        <v-card-text><v-progress-linear indeterminate /></v-card-text>
      </v-card>

      <v-alert
        v-else-if="ad5xState.apiStatus === 'compatible' && !ifsModule"
        text
        type="warning"
        data-test="ifs-module-incompatible"
      >
        IFS module отсутствует или его контракт несовместим с текущим Fluidd.
      </v-alert>

      <template v-else-if="ifsModule">
        <div class="d-flex flex-wrap align-center mb-3 materials-status">
          <v-chip
            small
            label
            :color="ifsModule.state === 'ready' ? 'success' : undefined"
          >
            IFS: {{ ifsModule.state }}
          </v-chip>
          <v-chip
            small
            label
            outlined
          >
            Печать: {{ ifsModule.print_state }}
          </v-chip>
          <v-chip
            v-if="ifsModule.spoolman"
            small
            label
            outlined
            :color="ifsModule.spoolman.connected ? 'success' : undefined"
            data-test="ifs-spoolman-status"
          >
            {{ spoolmanLabel }}
          </v-chip>
          <v-chip
            small
            label
            outlined
          >
            Backend {{ ad5xState.snapshot?.backend_version }}
          </v-chip>
        </div>

        <ifs-filament-path :slots="slots" />

        <v-row>
          <v-col
            v-for="slot in slots"
            :key="`ifs-slot-${slot.slot}`"
            cols="12"
            sm="6"
            lg="3"
          >
            <ifs-slot-card
              :slot-data="slot"
              :actions-locked="actionsLocked"
              :action-busy="actionBusyFor(slot)"
              @action="runSlotAction(slot, $event)"
            />
          </v-col>
        </v-row>

        <v-alert
          v-if="ifsModule.operation.state !== 'idle'"
          class="mt-4"
          text
          type="info"
          data-test="ifs-operation"
        >
          Операция IFS: {{ ifsModule.operation.action || ifsModule.operation.state }}
          <span v-if="ifsModule.operation.slot"> · слот {{ ifsModule.operation.slot }}</span>
        </v-alert>
      </template>
    </template>
  </v-container>
</template>

<script lang="ts">
import Vue from 'vue'
import { Component, Watch } from 'vue-property-decorator'
import { Ad5xApiClient, resolveAd5xSocketTransport } from '@/ad5x/api/client'
import type { Ad5xIfsAction, Ad5xIfsModule, Ad5xIfsSlot } from '@/ad5x/api/ifs'
import { getIfsModule } from '@/ad5x/api/ifs'
import IfsFilamentPath from '@/ad5x/components/IfsFilamentPath.vue'
import IfsSlotCard from '@/ad5x/components/IfsSlotCard.vue'
import { isSharedAd5xBackendAvailable } from '@/ad5x/integration'
import { applyAd5xSnapshot, getAd5xState, initializeAd5x, refreshAd5x } from '@/ad5x/store'
import type { Ad5xState } from '@/ad5x/store/types'

@Component({ components: { IfsFilamentPath, IfsSlotCard } })
export default class Ad5xMaterials extends Vue {
  refreshing = false
  actionInFlight: { action: Ad5xIfsAction; slot: number } | null = null
  actionError = ''

  get ad5xState (): Ad5xState {
    return getAd5xState(this.$store)
  }

  get componentSupport () {
    return this.$store.getters['server/componentSupport']
  }

  get supportsSharedBackend (): boolean {
    return isSharedAd5xBackendAvailable(this.componentSupport)
  }

  get ifsModule (): Ad5xIfsModule | null {
    return getIfsModule(this.ad5xState.snapshot)
  }

  get slots (): readonly Ad5xIfsSlot[] {
    return [...(this.ifsModule?.slots ?? [])].sort((a, b) => a.slot - b.slot)
  }

  get notifiedRevision (): number {
    return this.ad5xState.notifiedRevision
  }

  get actionsLocked (): boolean {
    return this.refreshing ||
      this.actionInFlight !== null ||
      this.ad5xState.apiStatus !== 'compatible' ||
      (this.ifsModule?.operation.state ?? 'idle') !== 'idle'
  }

  actionBusyFor (slot: Ad5xIfsSlot): Ad5xIfsAction | null {
    return this.actionInFlight?.slot === slot.slot ? this.actionInFlight.action : null
  }

  async runSlotAction (slot: Ad5xIfsSlot, action: Ad5xIfsAction): Promise<void> {
    if (this.actionsLocked || !slot.permissions[action]) return

    this.actionInFlight = { action, slot: slot.slot }
    this.actionError = ''
    try {
      const result = await this.apiClient().performIfsAction(action, slot.slot)
      applyAd5xSnapshot(this.$store, result.snapshot)
      if (!result.ok) {
        this.actionError = result.error || 'Действие IFS отклонено backend'
      }
    } catch (error: unknown) {
      this.actionError = error instanceof Error
        ? error.message
        : 'Не удалось выполнить действие IFS'
    } finally {
      this.actionInFlight = null
    }
  }

  get spoolmanLabel (): string {
    const spoolman = this.ifsModule?.spoolman
    if (!spoolman?.configured) return 'Spoolman не настроен'
    return spoolman.connected ? 'Spoolman подключен' : 'Spoolman недоступен'
  }

  private apiClient (): Ad5xApiClient {
    return new Ad5xApiClient(resolveAd5xSocketTransport(this))
  }

  async refreshSnapshot (): Promise<void> {
    if (!this.supportsSharedBackend || this.refreshing) return

    this.refreshing = true
    try {
      await refreshAd5x(this.$store, this.apiClient())
    } finally {
      this.refreshing = false
    }
  }

  @Watch('notifiedRevision')
  async onNotifiedRevision (revision: number): Promise<void> {
    const currentRevision = this.ad5xState.snapshot?.revision ?? 0
    if (revision <= currentRevision) return
    await this.refreshSnapshot()
  }

  async created (): Promise<void> {
    if (!this.supportsSharedBackend) {
      await initializeAd5x(this.$store, false)
      return
    }

    await initializeAd5x(this.$store, true, this.apiClient())
  }
}
</script>

<style scoped lang="scss">
.materials-header,
.materials-status {
  gap: 10px;
}
</style>
