<template>
  <v-card
    class="mb-4"
    data-test="z-calibration-actions"
    outlined
  >
    <v-card-subtitle class="pb-2">
      Действия
    </v-card-subtitle>

    <v-card-text class="pt-0">
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
            Температуры видимы и редактируются перед запуском. Backend дополнительно проверяет их по конфигурации принтера; скрытые 245/80 не используются.
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
          :disabled="semanticActionDisabled"
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
        `Проверить Z` и `Построить карту` вызывают только semantic macros Plugins AD5X; физический probe/contact/mesh выполняет Z-Mod. Полная калибровка будет включена после productization обновления trusted reference.
      </div>

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

@Component({})
export default class ZCalibrationActions extends Vue {
  @Prop({ default: false }) readonly refreshLoading!: boolean

  extruderTemp = 220
  bedTemp = 60
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

  get temperatureValid (): boolean {
    return Number.isFinite(Number(this.extruderTemp)) &&
      Number.isFinite(Number(this.bedTemp)) &&
      Number(this.extruderTemp) > 0 &&
      Number(this.bedTemp) > 0
  }

  get anyActionLoading (): boolean {
    return this.homeLoading || this.actionLoading !== null
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
    if (this.semanticActionDisabled) return

    this.actionLoading = 'check'
    this.actionError = null
    this.homeError = null
    this.actionSuccess = null

    try {
      await this.runGcode(this.semanticScript('AD5X_Z_CHECK'))
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
      await this.runGcode(this.semanticScript('AD5X_Z_BUILD_RUNTIME_MESH'))
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
      await this.runGcode('AD5X_Z_RESTORE_AUTO')
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
