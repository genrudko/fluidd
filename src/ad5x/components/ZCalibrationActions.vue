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
        :loading="hasWait($waits.onHomeZ)"
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
        Homing выполняется штатным механизмом Fluidd/Klipper. Физический Auto-Z остаётся под управлением Z-Mod.
      </div>
    </v-card-text>
  </v-card>
</template>

<script lang="ts">
import { Component, Mixins, Prop } from 'vue-property-decorator'
import StateMixin from '@/mixins/state'
import ToolheadMixin from '@/mixins/toolhead'

@Component({})
export default class ZCalibrationActions extends Mixins(StateMixin, ToolheadMixin) {
  @Prop({ default: false }) readonly refreshLoading!: boolean

  get homeDisabled (): boolean {
    return !this.klippyReady || this.printerBusy
  }

  homeZ (): void {
    this.sendGcode('G28 Z', this.$waits.onHomeZ)
  }
}
</script>
