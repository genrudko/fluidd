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
      <v-btn-toggle
        v-model="viewMode"
        mandatory
        dense
        class="mr-2"
        data-test="ifs-view-mode"
      >
        <v-btn
          small
          value="auto"
        >
          Auto
        </v-btn>
        <v-btn
          small
          value="hybrid"
        >
          Hybrid
        </v-btn>
        <v-btn
          small
          value="expert"
        >
          Expert
        </v-btn>
      </v-btn-toggle>
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
            v-if="ifsModule.provider_mode"
            small
            label
            outlined
            data-test="ifs-provider-mode"
          >
            Z-Mod: {{ ifsModule.provider_mode }}
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

        <v-alert
          v-if="ifsSuspended"
          text
          type="info"
          data-test="ifs-maintenance-suspended"
        >
          Родной экран Flashforge сейчас владеет IFS. Plugins AD5X приостановил управление материалами, чтобы не конфликтовать с Z-Mod. После возврата в DISPLAY_OFF менеджер IFS снова станет доступен.
        </v-alert>

        <ifs-filament-path
          v-if="!ifsSuspended"
          :slots="slots"
        />

        <v-row v-if="!ifsSuspended">
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
              :metadata-available="metadataAvailableFor(slot)"
              :spoolman-available="spoolmanAvailableFor(slot)"
              @action="runSlotAction(slot, $event)"
              @metadata="openMetadata(slot)"
              @spoolman="openSpoolman(slot)"
            />
          </v-col>
        </v-row>

        <ifs-preprint-plan
          v-if="!ifsSuspended && showPreprintPlan"
          :plan="ifsModule.preprint_plan"
          :compact="preprintCompact"
          :slots="slots"
          :editable="canEditPreprint"
          :editing="mappingBusy"
          @edit="openMappingEditor"
        />

        <ifs-mapping-dialog
          v-if="!ifsSuspended && mappingDisplayPlan"
          v-model="mappingDialogOpen"
          :preview="mappingPreview"
          :preview-token="mappingPreviewToken"
          :plan="mappingDisplayPlan"
          :slots="slots"
          :busy="mappingBusy"
          :error="mappingError"
          :provider-leveling="providerPrintLeveling"
          @change="validateMappingDraft"
        />

        <ifs-metadata-dialog
          v-model="metadataDialogOpen"
          :slot-data="metadataSlot"
          :busy="metadataBusy"
          :locked="actionsLocked"
          :error="metadataError"
          @save="saveMetadata"
          @clear="clearMetadata"
        />

        <ifs-spoolman-dialog
          v-model="spoolmanDialogOpen"
          :slot-data="spoolmanSlot"
          :connected="spoolmanConnected"
          :items="spoolmanItems"
          :query.sync="spoolmanQuery"
          :loading="spoolmanLoading"
          :busy="spoolmanBusy"
          :locked="actionsLocked"
          :error="spoolmanError"
          @search="searchSpoolman"
          @bind="bindSpoolman"
          @unbind="unbindSpoolman"
          @refresh="refreshSpoolman"
        />

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
import type { Ad5xIfsAction, Ad5xIfsJobPreview, Ad5xIfsMetadataDraft, Ad5xIfsModule, Ad5xIfsPreprintPlan, Ad5xIfsSlot, Ad5xSpoolmanLibraryItem } from '@/ad5x/api/ifs'
import { getIfsModule } from '@/ad5x/api/ifs'
import IfsFilamentPath from '@/ad5x/components/IfsFilamentPath.vue'
import IfsSlotCard from '@/ad5x/components/IfsSlotCard.vue'
import IfsMetadataDialog from '@/ad5x/components/IfsMetadataDialog.vue'
import IfsMappingDialog from '@/ad5x/components/IfsMappingDialog.vue'
import IfsPreprintPlan from '@/ad5x/components/IfsPreprintPlan.vue'
import IfsSpoolmanDialog from '@/ad5x/components/IfsSpoolmanDialog.vue'
import { isSharedAd5xBackendAvailable } from '@/ad5x/integration'
import { applyAd5xSnapshot, getAd5xState, initializeAd5x, refreshAd5x } from '@/ad5x/store'
import type { Ad5xState } from '@/ad5x/store/types'

type IfsViewMode = 'auto' | 'hybrid' | 'expert'
const IFS_VIEW_MODE_KEY = 'ad5x.ifs.viewMode'

@Component({ components: { IfsFilamentPath, IfsSlotCard, IfsMetadataDialog, IfsMappingDialog, IfsPreprintPlan, IfsSpoolmanDialog } })
export default class Ad5xMaterials extends Vue {
  refreshing = false
  actionInFlight: { action: Ad5xIfsAction; slot: number } | null = null
  actionError = ''
  metadataDialogOpen = false
  metadataSlotNumber = 0
  metadataBusy = false
  metadataError = ''
  spoolmanDialogOpen = false
  spoolmanSlotNumber = 0
  spoolmanQuery = ''
  spoolmanItems: readonly Ad5xSpoolmanLibraryItem[] = []
  spoolmanLoading = false
  spoolmanBusy = false
  spoolmanError = ''
  mappingDialogOpen = false
  mappingBusy = false
  mappingError = ''
  mappingPreview: Ad5xIfsJobPreview | null = null
  mappingPreviewToken = ''
  mappingPlan: Ad5xIfsPreprintPlan | null = null
  viewMode: IfsViewMode = 'hybrid'

  get showPreprintPlan (): boolean {
    const plan = this.ifsModule?.preprint_plan
    return Boolean(plan && (this.viewMode !== 'auto' || !plan.available || plan.status !== 'ready'))
  }

  get preprintCompact (): boolean { return this.viewMode !== 'expert' }

  @Watch('viewMode')
  onViewModeChanged (mode: IfsViewMode): void { localStorage.setItem(IFS_VIEW_MODE_KEY, mode) }

  restoreViewMode (): void {
    const saved = localStorage.getItem(IFS_VIEW_MODE_KEY)
    if (saved === 'auto' || saved === 'hybrid' || saved === 'expert') this.viewMode = saved
  }

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

  get ifsSuspended (): boolean {
    return Boolean(this.ifsModule?.maintenance_suspended || this.ifsModule?.provider_mode === 'native_display')
  }

  get providerPrintLeveling (): 0 | 1 | null {
    const value = this.ifsModule?.provider?.settings?.print_leveling
    return value === 0 || value === 1 ? value : null
  }

  get canEditPreprint (): boolean {
    return Boolean(
      !this.ifsSuspended &&
      this.ifsModule?.preprint_plan.available &&
      this.ifsModule.preprint_plan.filename &&
      this.ifsModule.operations?.preview_job !== false
    )
  }

  get mappingDisplayPlan (): Ad5xIfsPreprintPlan | null {
    return this.mappingPlan ?? this.ifsModule?.preprint_plan ?? null
  }

  get notifiedRevision (): number {
    return this.ad5xState.notifiedRevision
  }

  get actionsLocked (): boolean {
    return this.refreshing ||
      this.actionInFlight !== null ||
      this.metadataBusy ||
      this.spoolmanBusy ||
      this.ifsSuspended ||
      this.ad5xState.apiStatus !== 'compatible' ||
      (this.ifsModule?.operation.state ?? 'idle') !== 'idle'
  }

  actionBusyFor (slot: Ad5xIfsSlot): Ad5xIfsAction | null {
    return this.actionInFlight?.slot === slot.slot ? this.actionInFlight.action : null
  }

  get metadataSlot (): Ad5xIfsSlot | null {
    return this.slots.find(slot => slot.slot === this.metadataSlotNumber) ?? null
  }

  metadataAvailableFor (slot: Ad5xIfsSlot): boolean {
    return slot.present && slot.spool.spoolman_spool_id === null
  }

  openMetadata (slot: Ad5xIfsSlot): void {
    if (!this.metadataAvailableFor(slot) || this.actionsLocked) return
    this.spoolmanDialogOpen = false
    this.metadataSlotNumber = slot.slot
    this.metadataError = ''
    this.metadataDialogOpen = true
  }

  async saveMetadata (draft: Ad5xIfsMetadataDraft): Promise<void> {
    const slot = this.metadataSlot
    if (!slot || !this.metadataAvailableFor(slot) || this.actionsLocked) return
    this.metadataBusy = true
    this.metadataError = ''
    try {
      const result = await this.apiClient().updateIfsMetadata(slot.slot, draft.spool, draft.appearance)
      applyAd5xSnapshot(this.$store, result.snapshot)
      if (!result.ok) this.metadataError = result.error || 'Backend отклонил данные материала'
      else this.metadataDialogOpen = false
    } catch (error: unknown) {
      this.metadataError = error instanceof Error ? error.message : 'Не удалось сохранить данные материала'
    } finally {
      this.metadataBusy = false
    }
  }

  async clearMetadata (): Promise<void> {
    const slot = this.metadataSlot
    if (!slot || slot.spool.source !== 'manual' || slot.spool.spoolman_spool_id !== null || this.actionsLocked) return
    this.metadataBusy = true
    this.metadataError = ''
    try {
      const result = await this.apiClient().clearIfsMetadata(slot.slot)
      applyAd5xSnapshot(this.$store, result.snapshot)
      if (!result.ok) this.metadataError = result.error || 'Backend отклонил очистку данных материала'
      else this.metadataDialogOpen = false
    } catch (error: unknown) {
      this.metadataError = error instanceof Error ? error.message : 'Не удалось очистить данные материала'
    } finally {
      this.metadataBusy = false
    }
  }

  get spoolmanConnected (): boolean {
    return this.ifsModule?.spoolman?.connected ?? false
  }

  get spoolmanSlot (): Ad5xIfsSlot | null {
    return this.slots.find(slot => slot.slot === this.spoolmanSlotNumber) ?? null
  }

  spoolmanAvailableFor (slot: Ad5xIfsSlot): boolean {
    return Boolean(this.ifsModule?.spoolman?.configured || slot.spool.spoolman_spool_id !== null)
  }

  async openSpoolman (slot: Ad5xIfsSlot): Promise<void> {
    if (!this.spoolmanAvailableFor(slot) || this.actionsLocked) return
    this.metadataDialogOpen = false
    this.spoolmanSlotNumber = slot.slot
    this.spoolmanQuery = ''
    this.spoolmanItems = []
    this.spoolmanError = ''
    this.spoolmanDialogOpen = true
    if (this.spoolmanConnected) await this.searchSpoolman()
  }

  async searchSpoolman (): Promise<void> {
    if (!this.spoolmanConnected || this.spoolmanLoading || this.actionsLocked) return
    this.spoolmanLoading = true
    this.spoolmanError = ''
    try {
      const result = await this.apiClient().getSpoolmanLibrary(this.spoolmanQuery)
      this.spoolmanItems = result.items
      if (!result.ok) this.spoolmanError = result.error || 'Не удалось загрузить библиотеку Spoolman'
    } catch (error: unknown) {
      this.spoolmanItems = []
      this.spoolmanError = error instanceof Error ? error.message : 'Не удалось загрузить библиотеку Spoolman'
    } finally {
      this.spoolmanLoading = false
    }
  }

  async bindSpoolman (item: Ad5xSpoolmanLibraryItem): Promise<void> {
    const slot = this.spoolmanSlot
    if (!slot || !this.spoolmanConnected || this.actionsLocked) return
    this.spoolmanBusy = true
    this.spoolmanError = ''
    try {
      const result = await this.apiClient().bindSpoolman(slot.slot, item.spoolman_spool_id)
      applyAd5xSnapshot(this.$store, result.snapshot)
      if (!result.ok) this.spoolmanError = result.error || 'Spoolman отклонил привязку катушки'
    } catch (error: unknown) {
      this.spoolmanError = error instanceof Error ? error.message : 'Не удалось привязать катушку Spoolman'
    } finally { this.spoolmanBusy = false }
  }

  async unbindSpoolman (): Promise<void> {
    const slot = this.spoolmanSlot
    if (!slot || slot.spool.spoolman_spool_id === null || this.actionsLocked) return
    this.spoolmanBusy = true
    this.spoolmanError = ''
    try {
      const result = await this.apiClient().unbindSpoolman(slot.slot)
      applyAd5xSnapshot(this.$store, result.snapshot)
      if (!result.ok) this.spoolmanError = result.error || 'Spoolman отклонил снятие привязки'
    } catch (error: unknown) {
      this.spoolmanError = error instanceof Error ? error.message : 'Не удалось снять привязку Spoolman'
    } finally { this.spoolmanBusy = false }
  }

  async refreshSpoolman (): Promise<void> {
    const slot = this.spoolmanSlot
    if (!slot || !this.spoolmanConnected || this.actionsLocked) return
    this.spoolmanBusy = true
    this.spoolmanError = ''
    try {
      const result = await this.apiClient().refreshSpoolman(slot.slot)
      applyAd5xSnapshot(this.$store, result.snapshot)
      if (!result.ok) this.spoolmanError = result.error || 'Не удалось обновить данные Spoolman'
    } catch (error: unknown) {
      this.spoolmanError = error instanceof Error ? error.message : 'Не удалось обновить данные Spoolman'
    } finally { this.spoolmanBusy = false }
  }

  async openMappingEditor (): Promise<void> {
    const filename = this.ifsModule?.preprint_plan.filename ?? ''
    if (!this.canEditPreprint || !filename || this.mappingBusy) return

    this.mappingBusy = true
    this.mappingError = ''
    this.actionError = ''
    try {
      const result = await this.apiClient().previewIfsJob(filename)
      if (!result.ok || !result.job_preview || !result.preview_token || !result.snapshot) {
        this.actionError = result.error || 'Backend отклонил предварительный анализ IFS'
        return
      }
      this.mappingPreview = result.job_preview
      this.mappingPreviewToken = result.preview_token
      this.mappingPlan = getIfsModule(result.snapshot)?.preprint_plan ?? this.ifsModule?.preprint_plan ?? null
      applyAd5xSnapshot(this.$store, result.snapshot)
      this.mappingDialogOpen = true
    } catch (error: unknown) {
      this.actionError = error instanceof Error ? error.message : 'Не удалось получить предварительное назначение IFS'
    } finally {
      this.mappingBusy = false
    }
  }

  async validateMappingDraft (resolvedToolMap: readonly number[], leveling: 0 | 1 | null = null): Promise<void> {
    if (!this.mappingPreview || !this.mappingPreviewToken || this.mappingBusy) return

    this.mappingBusy = true
    this.mappingError = ''
    try {
      const result = await this.apiClient().draftIfsJobMapping(
        this.mappingPreviewToken,
        resolvedToolMap,
        leveling === 0 || leveling === 1 ? leveling : undefined
      )
      if (!result.ok || !result.mapping_draft || !result.preprint_plan) {
        const stale = result.mapping_draft?.blockers.includes('stale_preview') ?? false
        if (stale) {
          this.mappingDialogOpen = false
          this.mappingPreviewToken = ''
          this.actionError = 'Данные файла изменились. Откройте назначение IFS снова для свежего анализа.'
          return
        }
        this.mappingError = result.error || 'Backend отклонил черновик назначения IFS'
        return
      }
      this.mappingPreview = {
        ...this.mappingPreview,
        resolved_tool_map: [...result.mapping_draft.resolved_tool_map]
      }
      this.mappingPlan = result.preprint_plan
      // Draft validation is intentionally stateless: its snapshot still carries
      // the provider plan, so applying it here would visually revert the manual map.
    } catch (error: unknown) {
      this.mappingError = error instanceof Error ? error.message : 'Не удалось проверить назначение IFS'
    } finally {
      this.mappingBusy = false
    }
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
    this.restoreViewMode()
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
