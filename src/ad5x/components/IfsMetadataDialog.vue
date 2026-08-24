<template>
  <v-dialog
    :value="value"
    max-width="760"
    @input="$emit('input', $event)"
  >
    <v-card>
      <v-card-title>
        {{ $t('app.ad5x.ifs.metadata.title') }}<span v-if="slotData"> · {{ $t('app.ad5x.ifs.metadata.slot', { slot: slotData.slot }) }}</span>
      </v-card-title>

      <v-card-text>
        <v-alert
          v-if="slotData && slotData.spool.spoolman_spool_id !== null"
          text
          type="info"
          data-test="metadata-spoolman-owned"
        >
          {{ $t('app.ad5x.ifs.metadata.spoolmanOwned') }}
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
                :label="$t('app.ad5x.ifs.metadata.brand').toString()"
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
                :label="$t('app.ad5x.ifs.metadata.series').toString()"
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
                :label="$t('app.ad5x.ifs.metadata.name').toString()"
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
                :label="$t('app.ad5x.ifs.metadata.material').toString()"
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
                :label="$t('app.ad5x.ifs.metadata.variant').toString()"
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
                :label="$t('app.ad5x.ifs.metadata.colorMode').toString()"
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
                :label="$t('app.ad5x.ifs.metadata.finish').toString()"
                :disabled="formLocked"
              />
            </v-col>
          </v-row>

          <div class="text-subtitle-2 mb-2">
            {{ $t('app.ad5x.ifs.metadata.colors') }}
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
              :label="$t('app.ad5x.ifs.metadata.colorNumber', { index: index + 1 }).toString()"
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
            {{ $t('app.ad5x.ifs.metadata.addColor') }}
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
                :label="$t('app.ad5x.ifs.metadata.remainingG').toString()"
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
                :label="$t('app.ad5x.ifs.metadata.nozzleTemp').toString()"
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
                :label="$t('app.ad5x.ifs.metadata.bedTemp').toString()"
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
          {{ $t('app.ad5x.ifs.metadata.clearManual') }}
        </v-btn>
        <v-spacer />
        <v-btn
          text
          @click="$emit('input', false)"
        >
          {{ $t('app.ad5x.ifs.metadata.close') }}
        </v-btn>
        <v-btn
          color="primary"
          :loading="busy"
          :disabled="!canSave"
          data-test="metadata-save"
          @click="requestSave"
        >
          {{ $t('app.ad5x.ifs.metadata.save') }}
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

  get colorModes () {
    return ['solid', 'dual', 'tricolor', 'gradient', 'rainbow', 'special'].map(value => ({
      value,
      text: this.$t(`app.ad5x.ifs.metadata.colorModes.${value}`).toString()
    }))
  }

  get finishes () {
    return ['standard', 'matte', 'silk', 'satin', 'metallic', 'transparent', 'translucent', 'glitter', 'glow', 'wood', 'carbon_fiber', 'other'].map(value => ({
      value,
      text: this.$t(`app.ad5x.ifs.metadata.finishes.${value}`).toString()
    }))
  }

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
