<template>
  <v-dialog
    :value="value"
    max-width="760"
    @input="$emit('input', $event)"
  >
    <v-card>
      <v-card-title class="d-flex align-center">
        <span>Spoolman<span v-if="slotData"> · Слот {{ slotData.slot }}</span></span>
        <v-spacer />
        <v-chip
          v-if="slotData && currentSpoolId !== null"
          small
          outlined
          data-test="spoolman-current-id"
        >
          #{{ currentSpoolId }}
        </v-chip>
      </v-card-title>

      <v-card-text>
        <v-alert
          v-if="!slotData"
          text
          type="info"
        >
          Слот не выбран.
        </v-alert>

        <template v-else>
          <div
            v-if="currentSpoolId !== null"
            class="d-flex flex-wrap align-center mb-4 spoolman-current"
          >
            <div>
              <div class="text-subtitle-1 font-weight-medium">
                {{ currentLabel }}
              </div>
              <div class="text-body-2 text--secondary">
                Текущая привязка Spoolman #{{ currentSpoolId }}
              </div>
            </div>
            <v-spacer />
            <v-btn
              small
              text
              :disabled="!connected || busy || locked"
              :loading="busy"
              data-test="spoolman-refresh"
              @click="requestRefresh"
            >
              Обновить остаток
            </v-btn>
            <v-btn
              small
              text
              color="error"
              :disabled="busy || locked"
              data-test="spoolman-unbind"
              @click="requestUnbind"
            >
              Отвязать
            </v-btn>
          </div>

          <v-alert
            v-if="!connected"
            text
            type="warning"
            data-test="spoolman-offline"
          >
            Spoolman сейчас недоступен. Поиск и новая привязка отключены; существующую локальную привязку можно снять.
          </v-alert>

          <v-alert
            v-if="error"
            text
            type="error"
            data-test="spoolman-error"
          >
            {{ error }}
          </v-alert>

          <div class="d-flex align-center mb-3 spoolman-search">
            <v-text-field
              :value="query"
              dense
              outlined
              hide-details
              clearable
              label="Найти катушку в Spoolman"
              :disabled="!connected || busy || locked"
              :loading="loading"
              data-test="spoolman-query"
              @input="updateQuery"
              @keyup.enter="requestSearch"
            />
            <v-btn
              class="ml-2"
              color="primary"
              :disabled="!connected || busy || locked"
              :loading="loading"
              data-test="spoolman-search"
              @click="requestSearch"
            >
              Найти
            </v-btn>
          </div>

          <v-list
            v-if="items.length"
            two-line
            class="spoolman-results"
            data-test="spoolman-results"
          >
            <v-list-item
              v-for="item in items"
              :key="item.spoolman_spool_id"
            >
              <v-list-item-content>
                <v-list-item-title class="d-flex align-center flex-wrap spoolman-item-title">
                  <span class="font-weight-medium">{{ itemTitle(item) }}</span>
                  <span class="text--secondary ml-2">#{{ item.spoolman_spool_id }}</span>
                  <span class="d-inline-flex ml-2 spoolman-colors">
                    <span
                      v-for="color in itemColors(item)"
                      :key="`${item.spoolman_spool_id}-${color}`"
                      class="spoolman-color"
                      :style="{ backgroundColor: color }"
                    />
                  </span>
                </v-list-item-title>
                <v-list-item-subtitle>
                  {{ itemDetails(item) }}
                </v-list-item-subtitle>
              </v-list-item-content>
              <v-list-item-action>
                <v-btn
                  small
                  :text="isCurrent(item)"
                  :color="isCurrent(item) ? undefined : 'primary'"
                  :disabled="busy || !connected || isCurrent(item)"
                  data-test="spoolman-bind"
                  @click="requestBind(item)"
                >
                  {{ isCurrent(item) ? 'Назначено' : 'Привязать' }}
                </v-btn>
              </v-list-item-action>
            </v-list-item>
          </v-list>

          <div
            v-else-if="connected && !loading"
            class="text-body-2 text--secondary py-4 text-center"
            data-test="spoolman-empty-results"
          >
            Катушки не найдены.
          </div>
        </template>
      </v-card-text>

      <v-card-actions>
        <v-spacer />
        <v-btn
          text
          @click="$emit('input', false)"
        >
          Закрыть
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script lang="ts">
import Vue from 'vue'
import { Component, Prop } from 'vue-property-decorator'
import type { Ad5xIfsSlot, Ad5xSpoolmanLibraryItem } from '@/ad5x/api/ifs'

@Component({})
export default class IfsSpoolmanDialog extends Vue {
  @Prop({ type: Boolean, default: false })
  readonly value!: boolean

  @Prop({ type: Object, default: null })
  readonly slotData!: Ad5xIfsSlot | null

  @Prop({ type: Boolean, default: false })
  readonly connected!: boolean

  @Prop({ type: Array, default: () => [] })
  readonly items!: readonly Ad5xSpoolmanLibraryItem[]

  @Prop({ type: String, default: '' })
  readonly query!: string

  @Prop({ type: Boolean, default: false })
  readonly loading!: boolean

  @Prop({ type: Boolean, default: false })
  readonly busy!: boolean

  @Prop({ type: Boolean, default: false })
  readonly locked!: boolean

  @Prop({ type: String, default: '' })
  readonly error!: string

  get currentSpoolId (): number | null {
    return this.slotData?.spool.spoolman_spool_id ?? null
  }

  get currentLabel (): string {
    if (!this.slotData) return ''
    return [this.slotData.spool.brand, this.slotData.spool.name, this.slotData.spool.material]
      .filter(Boolean)
      .join(' · ') || 'Привязанная катушка'
  }

  updateQuery (value: string | null): void {
    this.$emit('update:query', value ?? '')
  }

  requestSearch (): void {
    if (!this.connected || this.busy || this.locked) return
    this.$emit('search')
  }

  requestBind (item: Ad5xSpoolmanLibraryItem): void {
    if (!this.connected || this.busy || this.locked || this.isCurrent(item)) return
    this.$emit('bind', item)
  }

  requestRefresh (): void {
    if (!this.connected || this.busy || this.locked) return
    this.$emit('refresh')
  }

  requestUnbind (): void {
    if (this.busy || this.locked || this.currentSpoolId === null) return
    this.$emit('unbind')
  }

  itemTitle (item: Ad5xSpoolmanLibraryItem): string {
    return [item.spool.brand, item.spool.name]
      .filter(Boolean)
      .join(' · ') || item.spool.material || 'Катушка Spoolman'
  }

  itemDetails (item: Ad5xSpoolmanLibraryItem): string {
    const details = [item.spool.material]
    if (item.inventory.remaining_g !== null) details.push(`${Math.round(item.inventory.remaining_g)} г`)
    else if (item.inventory.remaining_length_mm !== null) details.push(`${Math.round(item.inventory.remaining_length_mm / 1000)} м`)
    if (item.inventory.location) details.push(item.inventory.location)
    return details.filter(Boolean).join(' · ')
  }

  itemColors (item: Ad5xSpoolmanLibraryItem): readonly string[] {
    return item.appearance.colors.length ? item.appearance.colors : ['#78909C']
  }

  isCurrent (item: Ad5xSpoolmanLibraryItem): boolean {
    return this.currentSpoolId === item.spoolman_spool_id
  }
}
</script>

<style scoped lang="scss">
.spoolman-current,
.spoolman-search,
.spoolman-item-title,
.spoolman-colors {
  gap: 8px;
}

.spoolman-results {
  max-height: 390px;
  overflow-y: auto;
}

.spoolman-color {
  width: 14px;
  height: 14px;
  border-radius: 50%;
  border: 1px solid rgba(128, 128, 128, 0.55);
}
</style>
