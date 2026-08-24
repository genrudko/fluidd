<template>
  <v-dialog
    :value="value"
    max-width="760"
    @input="$emit('input', $event)"
  >
    <v-card>
      <v-card-title>
        Данные катушки без Spoolman<span v-if="slotData"> · Слот {{ slotData.slot }}</span>
      </v-card-title>

      <v-card-text>
        <v-alert
          v-if="slotData && slotData.spool.spoolman_spool_id !== null"
          text
          type="info"
          data-test="metadata-spoolman-owned"
        >
          Катушка привязана к Spoolman. Основные данные редактируются через Spoolman, чтобы не создавать два источника истины.
        </v-alert>

        <v-alert
          v-if="error"
          text
          type="error"
          data-test="metadata-error"
        >
          {{ error }}
        </v-alert>

        <template v-if="slotData">
          <v-row dense>
            <v-col
              cols="12"
              sm="6"
            >
              <v-text-field
                v-model="brand"
                dense
                outlined
                label="Производитель"
                :disabled="formLocked"
              />
            </v-col>
            <v-col
              cols="12"
              sm="6"
            >
              <v-text-field
                v-model="series"
                dense
                outlined
                label="Серия"
                :disabled="formLocked"
              />
            </v-col>
            <v-col
              cols="12"
              sm="6"
            >
              <v-text-field
                v-model="name"
                dense
                outlined
                label="Название катушки"
                :disabled="formLocked"
              />
            </v-col>
            <v-col
              cols="12"
              sm="3"
            >
              <v-text-field
                v-model="material"
                dense
                outlined
                label="Материал катушки"
                :disabled="formLocked"
              />
            </v-col>
            <v-col
              cols="12"
              sm="3"
            >
              <v-text-field
                v-model="variant"
                dense
                outlined
                label="Вариант"
                :disabled="formLocked"
              />
            </v-col>
          </v-row>

          <v-row dense>
            <v-col
              cols="12"
              sm="6"
            >
              <v-select
                v-model="colorMode"
                :items="colorModes"
                item-text="text"
                item-value="value"
                dense
                outlined
                label="Тип цвета"
                :disabled="formLocked"
                @change="ensureMinimumColors"
              />
            </v-col>
            <v-col
              cols="12"
              sm="6"
            >
              <v-select
                v-model="finish"
                :items="finishes"
                item-text="text"
                item-value="value"
                dense
                outlined
                label="Финиш"
                :disabled="formLocked"
              />
            </v-col>
          </v-row>

          <div class="text-subtitle-2 mb-2">
            Цвета
          </div>
          <div
            v-for="(color, index) in colors"
            :key="`metadata-color-${index}`"
            class="d-flex align-center mb-2 metadata-color-row"
          >
            <input
              class="metadata-color-picker"
              type="color"
              :value="safeColor(color)"
              :disabled="formLocked"
              :data-test="`metadata-color-picker-${index}`"
              @input="setColorFromPicker(index, $event)"
            >
            <v-text-field
              :value="color"
              dense
              outlined
              hide-details
              :label="`Цвет ${index + 1}`"
              :disabled="formLocked"
              :error="!isHexColor(color)"
              :data-test="`metadata-color-${index}`"
              @input="setColor(index, $event)"
            />
            <v-btn
              v-if="colors.length > minimumColors"
              icon
              small
              :disabled="formLocked"
              @click="removeColor(index)"
            >
              <v-icon small>
                mdi-close
              </v-icon>
            </v-btn>
          </div>
          <v-btn
            v-if="colors.length < 6"
            small
            text
            :disabled="formLocked"
            data-test="metadata-add-color"
            @click="addColor"
          >
            + цвет
          </v-btn>

          <v-row
            dense
            class="mt-3"
          >
            <v-col
              cols="12"
              sm="4"
            >
              <v-text-field
                v-model="remainingG"
                dense
                outlined
                type="number"
                min="0"
                label="Остаток, г"
                :disabled="formLocked"
              />
            </v-col>
            <v-col
              cols="12"
              sm="4"
            >
              <v-text-field
                v-model="nozzleTemp"
                dense
                outlined
                type="number"
                min="0"
                label="Сопло, °C"
                :disabled="formLocked"
              />
            </v-col>
            <v-col
              cols="12"
              sm="4"
            >
              <v-text-field
                v-model="bedTemp"
                dense
                outlined
                type="number"
                min="0"
                label="Стол, °C"
                :disabled="formLocked"
              />
            </v-col>
          </v-row>
        </template>
      </v-card-text>

      <v-card-actions>
        <v-btn
          v-if="canClear"
          text
          color="error"
          :disabled="formLocked"
          data-test="metadata-clear"
          @click="requestClear"
        >
          Очистить ручные данные
        </v-btn>
        <v-spacer />
        <v-btn
          text
          @click="$emit('input', false)"
        >
          Закрыть
        </v-btn>
        <v-btn
          color="primary"
          :loading="busy"
          :disabled="!canSave"
          data-test="metadata-save"
          @click="requestSave"
        >
          Сохранить
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script lang="ts">
import Vue from 'vue'
import { Component, Prop, Watch } from 'vue-property-decorator'
import type { Ad5xIfsAppearance, Ad5xIfsColorMode, Ad5xIfsMetadataDraft, Ad5xIfsSlot, Ad5xIfsSpool } from '@/ad5x/api/ifs'

const DEFAULT_COLOR = '#78909C'

@Component({})
export default class IfsMetadataDialog extends Vue {
  @Prop({ type: Boolean, default: false })
  readonly value!: boolean

  @Prop({ type: Object, default: null })
  readonly slotData!: Ad5xIfsSlot | null

  @Prop({ type: Boolean, default: false })
  readonly busy!: boolean

  @Prop({ type: Boolean, default: false })
  readonly locked!: boolean

  @Prop({ type: String, default: '' })
  readonly error!: string

  brand = ''
  series = ''
  name = ''
  material = ''
  variant = ''
  remainingG = ''
  nozzleTemp = ''
  bedTemp = ''
  colorMode: Ad5xIfsColorMode = 'solid'
  colors: string[] = [DEFAULT_COLOR]
  finish = 'standard'

  readonly colorModes = [
    { text: 'Один цвет', value: 'solid' },
    { text: 'Два цвета', value: 'dual' },
    { text: 'Три цвета', value: 'tricolor' },
    { text: 'Градиент', value: 'gradient' },
    { text: 'Радуга', value: 'rainbow' },
    { text: 'Особый', value: 'special' }
  ]

  readonly finishes = [
    ['standard', 'Обычный'], ['matte', 'Матовый'], ['silk', 'Шёлк'], ['satin', 'Сатин'],
    ['metallic', 'Металлик'], ['transparent', 'Прозрачный'], ['translucent', 'Полупрозрачный'],
    ['glitter', 'Блёстки'], ['glow', 'Светящийся'], ['wood', 'Дерево'],
    ['carbon_fiber', 'Углеволокно'], ['other', 'Другой']
  ].map(([value, text]) => ({ value, text }))

  get formLocked (): boolean {
    return this.busy || this.locked || this.slotData?.spool.spoolman_spool_id !== null
  }

  get minimumColors (): number {
    if (this.colorMode === 'dual' || this.colorMode === 'gradient' || this.colorMode === 'rainbow') return 2
    if (this.colorMode === 'tricolor') return 3
    return 1
  }

  get canClear (): boolean {
    return this.slotData?.spool.source === 'manual' && this.slotData.spool.spoolman_spool_id === null
  }

  get canSave (): boolean {
    if (!this.slotData || this.formLocked) return false
    if (this.colors.length < this.minimumColors || !this.colors.every(this.isHexColor)) return false
    if ([this.remainingG, this.nozzleTemp, this.bedTemp].some(value => !this.isOptionalNonNegative(value))) return false
    return Boolean(
      this.brand.trim() || this.series.trim() || this.name.trim() || this.material.trim() || this.variant.trim() ||
      this.colors.length || this.finish !== 'standard' || this.remainingG.trim()
    )
  }

  @Watch('value')
  onValueChanged (value: boolean): void {
    if (value) this.resetFromSlot()
  }

  @Watch('slotData')
  onSlotChanged (): void {
    if (this.value) this.resetFromSlot()
  }

  resetFromSlot (): void {
    const slot = this.slotData
    if (!slot) return
    this.brand = slot.spool.brand
    this.series = slot.spool.series
    this.name = slot.spool.name
    this.material = slot.spool.material || slot.material || ''
    this.variant = slot.spool.variant
    this.remainingG = this.numberText(slot.spool.remaining_g)
    this.nozzleTemp = this.numberText(slot.spool.nozzle_temp)
    this.bedTemp = this.numberText(slot.spool.bed_temp)
    this.colorMode = slot.appearance.color_mode
    this.colors = slot.appearance.colors.length ? [...slot.appearance.colors] : [DEFAULT_COLOR]
    this.finish = slot.appearance.finish || 'standard'
    this.ensureMinimumColors()
  }

  numberText (value: number | null): string {
    return value === null ? '' : String(value)
  }

  numberValue (value: string): number | null {
    if (!value.trim()) return null
    const parsed = Number(value)
    return Number.isFinite(parsed) && parsed >= 0 ? parsed : null
  }

  isOptionalNonNegative (value: string): boolean {
    return !value.trim() || this.numberValue(value) !== null
  }

  isHexColor (color: string): boolean {
    return /^#[0-9A-F]{6}$/i.test(color.trim())
  }

  safeColor (color: string): string {
    return this.isHexColor(color) ? color : DEFAULT_COLOR
  }

  ensureMinimumColors (): void {
    while (this.colors.length < this.minimumColors) this.colors.push(DEFAULT_COLOR)
  }

  addColor (): void {
    if (this.formLocked || this.colors.length >= 6) return
    this.colors.push(DEFAULT_COLOR)
  }

  removeColor (index: number): void {
    if (this.formLocked || this.colors.length <= this.minimumColors) return
    this.colors.splice(index, 1)
  }

  setColor (index: number, value: string): void {
    if (this.formLocked || index < 0 || index >= this.colors.length) return
    this.$set(this.colors, index, String(value).trim().toUpperCase())
  }

  setColorFromPicker (index: number, event: Event): void {
    const target = event.target
    if (!(target instanceof HTMLInputElement)) return
    this.setColor(index, target.value)
  }

  requestSave (): void {
    if (!this.canSave || !this.slotData) return
    const spool: Ad5xIfsSpool = {
      ...this.slotData.spool,
      source: 'manual',
      brand: this.brand.trim(),
      series: this.series.trim(),
      name: this.name.trim(),
      material: this.material.trim(),
      variant: this.variant.trim(),
      remaining_g: this.numberValue(this.remainingG),
      nozzle_temp: this.numberValue(this.nozzleTemp),
      bed_temp: this.numberValue(this.bedTemp)
    }
    const appearance: Ad5xIfsAppearance = {
      color_mode: this.colorMode,
      colors: this.colors.map(color => color.trim().toUpperCase()),
      finish: this.finish
    }
    this.$emit('save', { spool, appearance } as Ad5xIfsMetadataDraft)
  }

  requestClear (): void {
    if (!this.canClear || this.formLocked) return
    this.$emit('clear')
  }
}
</script>

<style scoped lang="scss">
.metadata-color-row {
  gap: 10px;
}

.metadata-color-picker {
  width: 42px;
  height: 36px;
  padding: 0;
  border: 0;
  background: transparent;
  cursor: pointer;
}
</style>
