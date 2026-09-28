<template>
  <collapsable-card
    :title="$t('app.ad5x.ifs.dashboard.title')"
    icon="$filament"
    draggable
    layout-path="dashboard.ad5x-ifs-dashboard-card"
  >
    <template #menu>
      <app-btn
        icon
        data-test="ifs-dashboard-refresh"
        :disabled="refreshing || !supportsSharedBackend"
        @click="refreshSnapshot"
      >
        <v-icon dense>
          $refresh
        </v-icon>
      </app-btn>
      <app-btn
        icon
        data-test="ifs-dashboard-open"
        @click="$router.push({ name: 'ad5x-materials' })"
      >
        <v-icon dense>
          $fullScreen
        </v-icon>
      </app-btn>
    </template>

    <v-card-text class="pt-2">
      <div
        v-if="loading && !ifsModule"
        class="d-flex justify-center py-4"
        data-test="ifs-dashboard-loading"
      >
        <v-progress-circular
          indeterminate
          size="24"
        />
      </div>

      <v-alert
        v-else-if="!ifsModule"
        dense
        text
        type="info"
        class="mb-0"
        data-test="ifs-dashboard-unavailable"
      >
        {{ $t('app.ad5x.ifs.dashboard.unavailable') }}
      </v-alert>

      <template v-else>
        <div class="d-flex align-center justify-space-between mb-3 ifs-dashboard-status">
          <div>
            <div
              class="text-subtitle-2 font-weight-medium"
              data-test="ifs-dashboard-status"
            >
              {{ statusLabel }}
            </div>
            <div
              class="text-caption text--secondary"
              data-test="ifs-dashboard-status-detail"
            >
              {{ statusDetail }}
            </div>
          </div>
          <v-icon :color="statusColor">
            {{ statusIcon }}
          </v-icon>
        </div>

        <div
          class="ifs-dashboard-slots"
          :class="{ 'ifs-dashboard-slots--suspended': ifsSuspended }"
          data-test="ifs-dashboard-slots"
        >
          <div
            v-for="slot in dashboardSlots"
            :key="slot.slot"
            class="ifs-dashboard-slot"
            :class="{
              'ifs-dashboard-slot--active': slot.active,
              'ifs-dashboard-slot--empty': !slot.present,
              'ifs-dashboard-slot--stall': slot.stall
            }"
            :data-test="`ifs-dashboard-slot-${slot.slot}`"
          >
            <div class="d-flex align-center justify-space-between ifs-dashboard-slot__heading">
              <span class="text-caption font-weight-bold">IFS {{ slot.slot }}</span>
              <span
                v-if="slot.active"
                class="ifs-dashboard-active-dot"
                :title="$t('app.ad5x.ifs.dashboard.active').toString()"
                data-test="ifs-dashboard-active"
              />
            </div>

            <div
              class="ifs-dashboard-spool"
              :class="{ 'ifs-dashboard-spool--empty': !slot.present }"
              aria-hidden="true"
            >
              <div
                v-if="slot.present"
                class="ifs-dashboard-spool__filament"
                :style="{ backgroundColor: slot.color }"
              />
              <div class="ifs-dashboard-spool__hub">
                <span
                  v-if="slot.present && slot.remainingPercent !== null"
                  class="ifs-dashboard-spool__percent"
                >
                  {{ Math.round(slot.remainingPercent) }}%
                </span>
              </div>
            </div>

            <div
              class="text-body-2 font-weight-medium text-truncate mt-1"
              :data-test="`ifs-dashboard-material-${slot.slot}`"
            >
              {{ slot.present ? (slot.material || $t('app.ad5x.ifs.dashboard.materialUnknown')) : $t('app.ad5x.ifs.dashboard.empty') }}
            </div>
            <div
              v-if="slot.present"
              class="text-caption text--secondary text-truncate"
              :data-test="`ifs-dashboard-secondary-${slot.slot}`"
            >
              {{ secondaryLabel(slot) }}
            </div>
          </div>
        </div>

        <div class="d-flex justify-end mt-3">
          <app-btn
            small
            outlined
            data-test="ifs-dashboard-open-manager"
            @click="$router.push({ name: 'ad5x-materials' })"
          >
            {{ $t('app.ad5x.ifs.dashboard.openManager') }}
          </app-btn>
        </div>
      </template>
    </v-card-text>
  </collapsable-card>
</template>

<script lang="ts">
import Vue from 'vue'
import { Component, Watch } from 'vue-property-decorator'
import { Ad5xApiClient, resolveAd5xSocketTransport } from '@/ad5x/api/client'
import type { Ad5xIfsModule } from '@/ad5x/api/ifs'
import { getIfsModule } from '@/ad5x/api/ifs'
import { isSharedAd5xBackendAvailable } from '@/ad5x/integration'
import { getAd5xState, refreshAd5x } from '@/ad5x/store'
import type { Ad5xState } from '@/ad5x/store/types'
import { getIfsDashboardSlots, type Ad5xIfsDashboardSlot } from './ifsDashboard'

@Component({})
export default class Ad5xIfsDashboardCard extends Vue {
  refreshing = false

  get componentSupport () {
    return this.$store.getters['server/componentSupport']
  }

  get supportsSharedBackend (): boolean {
    return isSharedAd5xBackendAvailable(this.componentSupport)
  }

  get ad5xState (): Ad5xState {
    return getAd5xState(this.$store)
  }

  get ifsModule (): Ad5xIfsModule | null {
    return getIfsModule(this.ad5xState.snapshot)
  }

  get loading (): boolean {
    return this.refreshing || this.ad5xState.apiStatus === 'loading'
  }

  get notifiedRevision (): number {
    return this.ad5xState.notifiedRevision
  }

  get ifsSuspended (): boolean {
    return Boolean(this.ifsModule?.maintenance_suspended || this.ifsModule?.provider_mode === 'native_display')
  }

  get dashboardSlots (): Ad5xIfsDashboardSlot[] {
    return getIfsDashboardSlots(this.ifsModule?.slots ?? [])
  }

  get statusLabel (): string {
    if (this.ifsSuspended) return this.$t('app.ad5x.ifs.dashboard.statusSuspended').toString()
    if (this.ifsModule?.operation.state && this.ifsModule.operation.state !== 'idle') {
      return this.$t('app.ad5x.ifs.dashboard.statusBusy').toString()
    }
    if (this.ifsModule?.state === 'ready') return this.$t('app.ad5x.ifs.dashboard.statusReady').toString()
    return this.$t('app.ad5x.ifs.dashboard.statusAttention').toString()
  }

  get statusDetail (): string {
    const module = this.ifsModule
    if (!module) return ''
    if (this.ifsSuspended) return this.$t('app.ad5x.ifs.dashboard.suspendedDetail').toString()
    if (module.operation.state !== 'idle') {
      const action = module.operation.action || module.operation.state
      return module.operation.slot > 0
        ? this.$t('app.ad5x.ifs.dashboard.operationSlot', { action, slot: module.operation.slot }).toString()
        : this.$t('app.ad5x.ifs.dashboard.operation', { action }).toString()
    }
    if (module.active_slot > 0) return this.$t('app.ad5x.ifs.dashboard.activeSlot', { slot: module.active_slot }).toString()
    if (module.state === 'ready') return this.$t('app.ad5x.ifs.dashboard.noActiveSlot').toString()
    return this.$t('app.ad5x.ifs.dashboard.stateDetail', { state: module.state }).toString()
  }

  get statusColor (): string | undefined {
    if (this.ifsSuspended) return 'info'
    if (this.ifsModule?.operation.state && this.ifsModule.operation.state !== 'idle') return 'info'
    if (this.ifsModule?.state === 'ready') return 'success'
    return 'warning'
  }

  get statusIcon (): string {
    return this.ifsModule?.state === 'ready' && !this.ifsSuspended ? '$check' : '$warning'
  }

  secondaryLabel (slot: Ad5xIfsDashboardSlot): string {
    if (slot.remainingG !== null) {
      const grams = this.$t('app.ad5x.common.grams', { value: Math.round(slot.remainingG) }).toString()
      return slot.remainingPercent === null
        ? grams
        : this.$t('app.ad5x.ifs.dashboard.remaining', { grams, percent: Math.round(slot.remainingPercent) }).toString()
    }
    return slot.name || this.$t('app.ad5x.ifs.dashboard.inventoryUnknown').toString()
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
    if (!this.supportsSharedBackend || this.ifsModule || this.ad5xState.apiStatus === 'loading') return
    await this.refreshSnapshot()
  }
}
</script>

<style scoped lang="scss">
.ifs-dashboard-status {
  min-height: 36px;
}

.ifs-dashboard-slots {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 8px;

  &--suspended {
    opacity: 0.72;
  }
}

.ifs-dashboard-slot {
  min-width: 0;
  padding: 8px 6px;
  border: 1px solid rgba(128, 128, 128, 0.22);
  border-radius: 8px;
  text-align: center;

  &--active {
    border-color: var(--v-primary-base);
    box-shadow: inset 0 0 0 1px var(--v-primary-base);
  }

  &--stall {
    border-color: var(--v-error-base);
  }

  &--empty {
    opacity: 0.58;
  }

  &__heading {
    min-height: 18px;
  }
}

.ifs-dashboard-active-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--v-primary-base);
  box-shadow: 0 0 0 3px rgba(33, 150, 243, 0.14);
}

.ifs-dashboard-spool {
  position: relative;
  width: 52px;
  height: 52px;
  margin: 4px auto 2px;
  border: 5px solid rgba(128, 128, 128, 0.58);
  border-radius: 50%;
  background: rgba(128, 128, 128, 0.12);

  &__filament {
    position: absolute;
    inset: 4px;
    border-radius: 50%;
  }

  &__hub {
    position: absolute;
    inset: 14px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 50%;
    background: rgba(45, 45, 45, 0.9);
    border: 2px solid rgba(210, 210, 210, 0.55);
  }

  &__percent {
    color: white;
    font-size: 8px;
    font-weight: 700;
  }

  &--empty &__hub {
    background: rgba(128, 128, 128, 0.25);
  }
}

@media (max-width: 430px) {
  .ifs-dashboard-slots {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
</style>
