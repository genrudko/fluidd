<template>
  <v-card
    class="mb-4"
    data-test="z-calibration-actions"
    outlined
  >
    <v-card-subtitle class="pb-2">
      Перед печатью
    </v-card-subtitle>

    <v-card-text class="pt-0">
      <v-row dense>
        <v-col
          cols="12"
          md="5"
        >
          <v-switch
            :input-value="preprintEnabled"
            class="mt-0"
            data-test="z-preprint-toggle"
            dense
            :disabled="preprintToggleDisabled"
            hide-details="auto"
            label="Запуск калибровки перед печатью"
            @change="setPreprint"
          />
          <div
            class="text-caption text--secondary mt-1"
            data-test="z-preprint-mode"
          >
            {{ preprintModeLabel }}
          </div>
        </v-col>

        <v-col
          cols="12"
          md="7"
        >
          <div class="ad5x-preprint-context">
            <div>
              <span class="text-caption text--secondary">Материал задания</span>
              <div
                class="text-body-2 font-weight-medium"
                data-test="z-preprint-material"
              >
                {{ materialText }}
              </div>
            </div>
            <div>
              <span class="text-caption text--secondary">Температуры Auto-Z</span>
              <div
                class="text-body-2 font-weight-medium"
                data-test="z-preprint-temperature-source"
              >
                из текущего START_PRINT
              </div>
            </div>
            <div>
              <span class="text-caption text--secondary">Карта перед печатью</span>
              <div
                class="text-body-2 font-weight-medium"
                data-test="z-preprint-mesh-policy"
              >
                {{ meshPolicyLabel }}
              </div>
            </div>
          </div>
        </v-col>
      </v-row>

      <v-alert
        class="mt-3 mb-0"
        dense
        text
        type="info"
      >
        <strong>Порядок:</strong>
        1) учитывается штатный выбор новой карты перед печатью;
        2) определяется окончательная mesh;
        3) Z-коррекция выполняется уже относительно неё;
        4) начинается печать.
        Если свежая карта уже построена для задания, второй single-point probe не запускается.
      </v-alert>

      <div class="text-caption text--secondary mt-2">
        Тип материала берётся из metadata текущего G-code, когда она доступна. Температуры не подменяются таблицей PLA/PETG/ABS: для автоматического пути используются фактические температуры текущего START_PRINT, то есть выбранного filament-профиля.
      </div>

      <v-divider class="my-3" />

      <div class="text-subtitle-2 mb-2">
        Ручные действия
      </div>

      <v-row dense>
        <v-col
          cols="6"
          sm="3"
        >
          <v-text-field
            v-model.number="extruderTemp"
            data-test="z-action-nozzle-temp"
            dense
            hide-details="auto"
            label="Сопло, °C"
            min="1"
            step="1"
            type="number"
          />
        </v-col>
        <v-col
          cols="6"
          sm="3"
        >
          <v-text-field
            v-model.number="bedTemp"
            data-test="z-action-bed-temp"
            dense
            hide-details="auto"
            label="Стол, °C"
            min="1"
            step="1"
            type="number"
          />
        </v-col>
        <v-col
          class="d-flex align-center"
          cols="12"
          sm="6"
        >
          <div class="text-caption text--secondary">
            Эти температуры используются только при ручных «Проверить Z» и «Построить карту». Они не влияют на автоматическую pre-print калибровку.
          </div>
        </v-col>
      </v-row>

      <div class="d-flex flex-wrap align-center mt-2">
        <app-btn
          class="me-2 mb-2"
          color="primary"
          data-test="z-home-action"
          :disabled="homeDisabled"
          :loading="homeLoading"
          small
          @click="homeZ"
        >
          <v-icon
            left
            small
          >
            $home
          </v-icon>
          {{ zHomed ? 'Повторить homing Z' : 'Выполнить homing Z' }}
        </app-btn>

        <app-btn
          class="me-2 mb-2"
          color="primary"
          data-test="z-check-action"
          :disabled="checkActionDisabled"
          :loading="actionLoading === 'check'"
          small
          @click="checkZ"
        >
          Проверить Z
        </app-btn>

        <app-btn
          class="me-2 mb-2"
          color="primary"
          data-test="z-build-mesh-action"
          :disabled="semanticActionDisabled"
          :loading="actionLoading === 'mesh'"
          outlined
          small
          @click="buildRuntimeMesh"
        >
          Построить карту
        </app-btn>

        <app-btn
          class="me-2 mb-2"
          data-test="z-full-calibration-action"
          disabled
          outlined
          small
        >
          Полная калибровка
        </app-btn>

        <app-btn
          class="me-2 mb-2"
          data-test="z-refresh-action"
          :disabled="!klippyReady || anyActionLoading"
          :loading="refreshLoading"
          outlined
          small
          @click="$emit('refresh')"
        >
          Обновить состояние
        </app-btn>
      </div>

      <div class="text-caption text--secondary">
        «Проверить Z» и «Построить карту» вызывают только semantic macros Plugins AD5X; физический probe/contact/mesh выполняет Z-Mod. Полная калибровка будет включена после productization обновления trusted reference.
      </div>

      <v-alert
        v-if="preprintMode !== 3"
        class="mt-3 mb-0"
        data-test="z-check-mode-info"
        dense
        text
        type="info"
      >
        Ручная «Проверить Z» доступна в управляемом режиме MESH_TEST=3. Включите «Запуск калибровки перед печатью», если нужна ручная проверка сохранённой карты.
      </v-alert>

      <v-alert
        v-if="!temperatureValid"
        class="mt-3 mb-0"
        data-test="z-action-temperature-warning"
        dense
        text
        type="warning"
      >
        Укажите положительные температуры сопла и стола перед физической проверкой или построением карты.
      </v-alert>

      <v-alert
        v-if="actionSuccess"
        class="mt-3 mb-0"
        data-test="z-action-success"
        dense
        text
        type="success"
      >
        {{ actionSuccess }}
      </v-alert>

      <v-alert
        v-if="actionError || homeError"
        class="mt-3 mb-0"
        data-test="z-action-error"
        dense
        text
        type="warning"
      >
        <div>{{ actionError || homeError }}</div>
        <app-btn
          v-if="actionError"
          class="mt-2"
          data-test="z-restore-auto-action"
          :disabled="restoreDisabled"
          :loading="actionLoading === 'restore'"
          outlined
          small
          @click="restoreAuto"
        >
          Вернуть сохранённую auto
        </app-btn>
      </v-alert>
    </v-card-text>
  </v-card>
</template>

<script lang="ts">
import Vue from 'vue'
import { Component, Prop } from 'vue-property-decorator'
import type { AppFileWithMeta } from '@/store/files/types'

type FluiddSocket = {
  emit: (
    method: string,
    options?: {
      dispatch?: string
      params?: Record<string, unknown>
    }
  ) => Promise<unknown>
}

type SemanticAction = 'check' | 'mesh' | 'restore'
type AppFileWithFilamentWeights = AppFileWithMeta & { filament_weights?: number[] }

@Component({})
export default class ZCalibrationActions extends Vue {
  @Prop({ default: false }) readonly refreshLoading!: boolean
  @Prop({ default: null }) readonly preprintMode!: number | null
  @Prop({ default: () => ({}) }) readonly rcPath!: Record<string, unknown>

  extruderTemp = 220
  bedTemp = 60
  preprintLoading = false
  homeLoading = false
  homeError: string | null = null
  actionLoading: SemanticAction | null = null
  actionError: string | null = null
  actionSuccess: string | null = null

  get klippyReady (): boolean {
    return Boolean(this.$store.getters['printer/getKlippyReady'])
  }

  get printerBusy (): boolean {
    const state = String(this.$store.getters['printer/getPrinterState'] || '')
    return state === 'printing' || state === 'paused' || state === 'busy'
  }

  get zHomed (): boolean {
    const getHomedAxes = this.$store.getters['printer/getHomedAxes'] as ((axes: string) => boolean) | undefined
    return typeof getHomedAxes === 'function' && getHomedAxes('z')
  }

  get currentFile (): AppFileWithMeta | undefined {
    const filename = String(this.$store.state.printer?.printer?.print_stats?.filename || '')
    if (!filename) return undefined

    const parts = filename.split('/')
    const name = parts.pop() || ''
    const path = `gcodes/${parts.join('/')}`.replace(/\/$/, '')
    return this.$store.getters['files/getFile'](path, name) as AppFileWithMeta | undefined
  }

  get materialText (): string {
    const file = this.currentFile as AppFileWithFilamentWeights | undefined
    const types = file?.filament_type
    if (Array.isArray(types) && types.length > 0) {
      const weights = file?.filament_weights
      if (Array.isArray(weights) && weights.length === types.length) {
        const used = types.filter((type, index) => Boolean(type) && Number(weights[index]) > 0)
        if (used.length > 0) return [...new Set(used)].join(' + ')
      }
      return [...new Set(types.filter(Boolean))].join(' + ')
    }
    return this.currentFile ? 'тип не указан в metadata' : 'задание ещё не выбрано'
  }

  get meshPolicyLabel (): string {
    const forceLeveling = this.rcPath.force_leveling === true
    const forceKamp = this.rcPath.force_kamp === true
    const printLeveling = Number(this.rcPath.print_leveling || 0)

    if (forceLeveling) return 'для задания принудительно строится новая карта'
    if (forceKamp) return 'для задания строится новая KAMP-карта'
    if (printLeveling !== 0) return 'для задания выбрана новая карта'
    return 'следовать штатному выбору при запуске печати'
  }

  get preprintEnabled (): boolean {
    return this.preprintMode === 3
  }

  get preprintModeLabel (): string {
    if (this.preprintLoading) return 'Сохраняю настройку…'
    if (this.preprintMode === 3) return 'Включено · Z-Mod MESH_TEST=3 · saved mesh + Z-check'
    if (this.preprintMode === 0) return 'Выключено · Z-Mod MESH_TEST=0'
    if (this.preprintMode === null) return 'Текущее состояние MESH_TEST не определено'
    return `Текущий режим Z-Mod MESH_TEST=${this.preprintMode}; переключатель приведёт его к управляемому 3/0`
  }

  get temperatureValid (): boolean {
    return Number.isFinite(Number(this.extruderTemp)) &&
      Number.isFinite(Number(this.bedTemp)) &&
      Number(this.extruderTemp) > 0 &&
      Number(this.bedTemp) > 0
  }

  get anyActionLoading (): boolean {
    return this.preprintLoading || this.homeLoading || this.actionLoading !== null
  }

  get preprintToggleDisabled (): boolean {
    return !this.klippyReady || this.printerBusy || this.anyActionLoading
  }

  get homeDisabled (): boolean {
    return !this.klippyReady || this.printerBusy || this.anyActionLoading
  }

  get semanticActionDisabled (): boolean {
    return !this.klippyReady ||
      this.printerBusy ||
      this.anyActionLoading ||
      !this.temperatureValid
  }

  get checkActionDisabled (): boolean {
    return this.semanticActionDisabled || this.preprintMode !== 3
  }

  get restoreDisabled (): boolean {
    return !this.klippyReady || this.printerBusy || this.anyActionLoading
  }

  private socket (): FluiddSocket {
    return (this as unknown as { $socket: FluiddSocket }).$socket
  }

  private formatTemperature (value: number): string {
    return Number(value).toFixed(1)
  }

  private async runGcode (script: string): Promise<void> {
    await this.socket().emit('printer.gcode.script', {
      dispatch: 'console/onGcodeScript',
      params: { script }
    })
  }

  private semanticScript (macro: string): string {
    return `${macro} EXTRUDER_TEMP=${this.formatTemperature(this.extruderTemp)} BED_TEMP=${this.formatTemperature(this.bedTemp)}`
  }

  private errorMessage (label: string, error: unknown): string {
    return error instanceof Error
      ? `${label} не выполнено: ${error.message}`
      : `${label} не выполнено.`
  }

  async setPreprint (enabled: boolean): Promise<void> {
    if (this.preprintToggleDisabled) return

    this.preprintLoading = true
    this.homeError = null
    this.actionError = null
    this.actionSuccess = null

    try {
      await this.runGcode(`ADZ_SET_PREPRINT ENABLED=${enabled ? 1 : 0}`)
      this.actionSuccess = enabled
        ? 'Автоматическая Z-калибровка перед печатью включена.'
        : 'Автоматическая Z-калибровка перед печатью выключена.'
      this.$emit('refresh')
    } catch (error: unknown) {
      this.actionError = this.errorMessage('Изменение pre-print калибровки', error)
    } finally {
      this.preprintLoading = false
    }
  }

  async homeZ (): Promise<void> {
    if (this.homeDisabled) return

    this.homeLoading = true
    this.homeError = null
    this.actionError = null
    this.actionSuccess = null

    try {
      await this.runGcode('G28 Z')
      this.actionSuccess = 'Homing Z выполнен.'
      this.$emit('refresh')
    } catch (error: unknown) {
      this.homeError = this.errorMessage('Homing Z', error)
    } finally {
      this.homeLoading = false
    }
  }

  async checkZ (): Promise<void> {
    if (this.checkActionDisabled) return

    this.actionLoading = 'check'
    this.actionError = null
    this.homeError = null
    this.actionSuccess = null

    try {
      await this.runGcode(this.semanticScript('ADZ_CHECK'))
      this.actionSuccess = 'Проверка Z завершена. Состояние обновлено.'
      this.$emit('refresh')
    } catch (error: unknown) {
      this.actionError = this.errorMessage('Проверка Z', error)
    } finally {
      this.actionLoading = null
    }
  }

  async buildRuntimeMesh (): Promise<void> {
    if (this.semanticActionDisabled) return

    this.actionLoading = 'mesh'
    this.actionError = null
    this.homeError = null
    this.actionSuccess = null

    try {
      await this.runGcode(this.semanticScript('ADZ_BUILD_RUNTIME_MESH'))
      this.actionSuccess = 'Временная карта построена. Для печати активной снова оставлена сохранённая auto.'
      this.$emit('refresh')
    } catch (error: unknown) {
      this.actionError = this.errorMessage('Построение карты', error)
    } finally {
      this.actionLoading = null
    }
  }

  async restoreAuto (): Promise<void> {
    if (this.restoreDisabled) return

    this.actionLoading = 'restore'
    this.actionError = null
    this.actionSuccess = null

    try {
      await this.runGcode('ADZ_RESTORE_AUTO')
      this.actionSuccess = 'Сохранённая карта auto восстановлена и проверена.'
      this.$emit('refresh')
    } catch (error: unknown) {
      this.actionError = this.errorMessage('Восстановление auto', error)
    } finally {
      this.actionLoading = null
    }
  }
}
</script>

<style scoped>
.ad5x-preprint-context {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 8px 16px;
}

@media (max-width: 959px) {
  .ad5x-preprint-context {
    grid-template-columns: 1fr;
  }
}
</style>
