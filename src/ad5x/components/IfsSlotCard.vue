<template>
  <v-card
    outlined
    height="100%"
    class="ifs-slot-card"
    :class="{ 'ifs-slot-card--active': slotData.active }"
    :data-slot="slotData.slot"
  >
    <v-card-title class="d-flex align-center py-3">
      <span class="text-subtitle-1 font-weight-bold">Слот {{ slotData.slot }}</span>
      <v-spacer />
      <v-chip
        v-if="slotData.active"
        color="primary"
        small
        label
        data-test="slot-active"
      >
        Активен
      </v-chip>
      <v-chip
        v-else-if="slotData.stall"
        color="error"
        small
        label
        data-test="slot-stall"
      >
        Ошибка подачи
      </v-chip>
    </v-card-title>

    <v-card-text class="pt-0">
      <ifs-spool-graphic :slot-data="slotData" />

      <template v-if="slotData.present">
        <div
          class="text-h6 mt-2 text-center"
          data-test="slot-material"
        >
          {{ providerLabel }}
        </div>
        <div class="text-caption text-center text--secondary">
          IFS / Z-Mod
        </div>
        <div
          v-if="spoolName"
          class="text-body-2 text-center text--secondary mt-1"
          data-test="slot-name"
        >
          {{ spoolName }}
        </div>

        <div class="d-flex flex-wrap justify-center mt-3 ifs-slot-card__chips">
          <v-chip
            v-if="slotData.appearance.finish !== 'standard'"
            x-small
            outlined
          >
            {{ finishLabel }}
          </v-chip>
          <v-chip
            v-if="slotData.spool.spoolman_spool_id !== null"
            x-small
            outlined
            data-test="slot-spoolman"
          >
            Spoolman spool ID: {{ slotData.spool.spoolman_spool_id }}<span v-if="slotData.spool.spoolman_filament_id !== null"> · filament ID: {{ slotData.spool.spoolman_filament_id }}</span>
          </v-chip>
          <v-chip
            v-else-if="slotData.current_identity_status === 'unassigned'"
            x-small
            color="warning"
            outlined
            data-test="slot-unassigned"
          >
            Катушка не назначена
          </v-chip>
        </div>

        <div
          v-if="remainingLabel"
          class="text-body-2 text-center mt-3"
          data-test="slot-remaining"
        >
          Остаток: {{ remainingLabel }}
        </div>
        <v-progress-linear
          v-if="remainingPercent !== null"
          class="mt-2"
          height="8"
          rounded
          :value="remainingPercent"
          data-test="slot-inventory-progress"
        />
        <div
          v-if="mismatched"
          class="text-caption warning--text text-center mt-2"
          data-test="slot-provider-mismatch"
        >
          Данные IFS и катушки расходятся
        </div>
      </template>

      <div
        v-else
        class="text-body-1 text-center text--secondary mt-3"
        data-test="slot-empty"
      >
        Пусто
      </div>
    </v-card-text>

    <v-card-actions
      v-if="slotData.present"
      class="justify-center flex-wrap ifs-slot-card__actions"
    >
      <v-btn
        small
        text
        color="primary"
        data-test="slot-select"
        :disabled="isActionDisabled('select_slot')"
        :loading="isActionLoading('select_slot')"
        @click="requestAction('select_slot')"
      >
        Выбрать
      </v-btn>
      <v-btn
        small
        text
        data-test="slot-load"
        :disabled="isActionDisabled('load_slot')"
        :loading="isActionLoading('load_slot')"
        @click="requestAction('load_slot')"
      >
        Загрузить
      </v-btn>
      <v-btn
        small
        text
        data-test="slot-unload"
        :disabled="isActionDisabled('unload_slot')"
        :loading="isActionLoading('unload_slot')"
        @click="requestAction('unload_slot')"
      >
        Выгрузить
      </v-btn>
      <v-btn
        small
        text
        data-test="slot-provider-identity"
        :disabled="actionsLocked"
        @click="requestProviderIdentity"
      >
        Тип / цвет IFS
      </v-btn>
      <v-btn
        v-if="metadataAvailable"
        small
        text
        data-test="slot-metadata-manage"
        :disabled="actionsLocked"
        @click="requestMetadata"
      >
        Данные катушки
      </v-btn>
      <v-btn
        v-if="spoolmanAvailable"
        small
        text
        data-test="slot-spoolman-manage"
        :disabled="actionsLocked"
        @click="requestSpoolman"
      >
        Spoolman
      </v-btn>
    </v-card-actions>
  </v-card>
</template>

<script lang="ts">
import Vue from 'vue'
import { Component, Prop } from 'vue-property-decorator'
import type { Ad5xIfsAction, Ad5xIfsSlot } from '@/ad5x/api/ifs'
import IfsSpoolGraphic from './IfsSpoolGraphic.vue'

@Component({ components: { IfsSpoolGraphic } })
export default class IfsSlotCard extends Vue {
  @Prop({ type: Object, required: true })
  readonly slotData!: Ad5xIfsSlot

  @Prop({ type: Boolean, default: false })
  readonly actionsLocked!: boolean

  @Prop({ type: String, default: null })
  readonly actionBusy!: Ad5xIfsAction | null

  @Prop({ type: Boolean, default: false })
  readonly spoolmanAvailable!: boolean

  @Prop({ type: Boolean, default: false })
  readonly metadataAvailable!: boolean

  isActionLoading (action: Ad5xIfsAction): boolean {
    return this.actionBusy === action
  }

  isActionDisabled (action: Ad5xIfsAction): boolean {
    return this.actionsLocked || !this.slotData.permissions[action]
  }

  requestAction (action: Ad5xIfsAction): void {
    if (this.isActionDisabled(action)) return
    this.$emit('action', action)
  }

  requestMetadata (): void {
    if (this.actionsLocked || !this.metadataAvailable) return
    this.$emit('metadata')
  }

  requestProviderIdentity (): void {
    if (this.actionsLocked) return
    this.$emit('provider-identity')
  }

  requestSpoolman (): void {
    if (this.actionsLocked || !this.spoolmanAvailable) return
    this.$emit('spoolman')
  }

  get providerLabel (): string {
    const current = this.slotData.compatibility?.zmod.current
    const material = current?.material || this.slotData.material || 'Материал не определён'
    const color = current?.color || this.slotData.color || 'Цвет не определён'
    return `${material} · ${color}`
  }

  get spoolName (): string {
    return [this.slotData.spool.brand, this.slotData.spool.series, this.slotData.spool.name]
      .filter(Boolean)
      .join(' · ')
  }

  get finishLabel (): string {
    return this.slotData.appearance.finish.replace(/_/g, ' ')
  }

  get remainingLabel (): string {
    if (this.slotData.spool.remaining_g !== null) {
      const percent = this.remainingPercent
      return `${Math.round(this.slotData.spool.remaining_g)} г${percent === null ? '' : ` · ${Math.round(percent)}%`}`
    }
    if (this.slotData.spool.remaining_length_mm !== null) {
      return `${Math.round(this.slotData.spool.remaining_length_mm / 1000)} м`
    }
    return ''
  }

  get remainingPercent (): number | null {
    const { remaining_g: remaining, initial_g: initial } = this.slotData.spool
    if (remaining === null || initial === null || initial <= 0) return null
    return Math.max(0, Math.min(100, (remaining / initial) * 100))
  }

  get mismatched (): boolean {
    const compatibility = this.slotData.compatibility?.zmod
    return Boolean(compatibility && compatibility.sync_state === 'diverged' && (compatibility.desired.material || compatibility.desired.color))
  }
}
</script>

<style scoped lang="scss">
.ifs-slot-card {
  transition: border-color 160ms ease, box-shadow 160ms ease;

  &--active {
    border-color: var(--v-primary-base) !important;
    border-width: 2px;
    box-shadow: 0 0 0 2px var(--v-primary-base), 0 8px 24px rgba(0, 0, 0, 0.18);
  }

  &__chips,
  &__actions {
    gap: 6px;
  }
}
</style>
