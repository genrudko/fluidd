<template>
  <v-card
    class="mb-4"
    data-test="z-calibration-actions"
    outlined
  >
    <v-card-subtitle class="pb-2">
      Действия
    </v-card-subtitle>

    <v-card-text class="pt-0 d-flex flex-wrap align-center">
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
        data-test="z-refresh-action"
        :disabled="!klippyReady"
        :loading="refreshLoading"
        outlined
        small
        @click="$emit('refresh')"
      >
        Обновить состояние
      </app-btn>

      <div class="text-caption text--secondary mb-2">
        Homing использует тот же `printer.gcode.script`, что штатный Toolhead Fluidd. Физический Auto-Z остаётся под управлением Z-Mod.
      </div>

      <v-alert
        v-if="homeError"
        class="mt-2 mb-0 flex-grow-1"
        data-test="z-home-error"
        dense
        text
        type="warning"
      >
        {{ homeError }}
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

@Component({})
export default class ZCalibrationActions extends Vue {
  @Prop({ default: false }) readonly refreshLoading!: boolean

  homeLoading = false
  homeError: string | null = null

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

  get homeDisabled (): boolean {
    return !this.klippyReady || this.printerBusy || this.homeLoading
  }

  private socket (): FluiddSocket {
    return (this as unknown as { $socket: FluiddSocket }).$socket
  }

  async homeZ (): Promise<void> {
    if (this.homeDisabled) return

    this.homeLoading = true
    this.homeError = null

    try {
      await this.socket().emit('printer.gcode.script', {
        dispatch: 'console/onGcodeScript',
        params: {
          script: 'G28 Z'
        }
      })
      this.$emit('refresh')
    } catch (error: unknown) {
      this.homeError = error instanceof Error
        ? `Homing Z не выполнен: ${error.message}`
        : 'Homing Z не выполнен.'
    } finally {
      this.homeLoading = false
    }
  }
}
</script>
