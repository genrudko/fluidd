<template>
  <v-card
    data-test="z-calibration-card"
    outlined
  >
    <v-card-title class="d-flex align-center">
      <div>
        <div class="text-h6">
          Центр калибровки Z
        </div>
        <div class="text-caption text--secondary">
          Z-Mod выполняет физический Auto-Z. Plugins AD5X только объясняет и проверяет состояние.
        </div>
      </div>
      <v-spacer />
      <v-btn
        data-test="z-refresh"
        :loading="loading"
        outlined
        small
        @click="$emit('reconcile')"
      >
        Обновить
      </v-btn>
    </v-card-title>

    <v-card-text>
      <v-alert
        data-test="z-ready-state"
        :type="ready ? 'success' : 'warning'"
        text
      >
        <strong>{{ ready ? 'Калибровка готова к работе' : 'Калибровка требует внимания' }}</strong>
        <div class="mt-1">
          {{ readinessMessage }}
        </div>
      </v-alert>

      <v-alert
        v-if="hasExternalUnknown"
        data-test="external-unknown-warning"
        text
        type="warning"
      >
        В итоговом Klipper Z-offset остаётся необъяснённая составляющая
        <strong>{{ formatMm(module.state.offset.external_unknown) }}</strong>.
        Она намеренно не считается babystepping или иной известной поправкой.
      </v-alert>

      <v-alert
        v-if="module.state.safety.last_error"
        data-test="z-safety-error"
        text
        type="error"
      >
        {{ module.state.safety.last_error }}
      </v-alert>

      <v-row dense>
        <v-col cols="12" md="4">
          <v-card outlined class="fill-height">
            <v-card-subtitle>Итоговый Z-offset Klipper</v-card-subtitle>
            <v-card-text>
              <div
                class="text-h5"
                data-test="z-effective-offset"
              >
                {{ formatNullableMm(module.state.offset.effective) }}
              </div>
              <div class="text-caption text--secondary">
                Фактический `gcode_move.homing_origin.z`
              </div>
            </v-card-text>
          </v-card>
        </v-col>

        <v-col cols="12" md="4">
          <v-card outlined class="fill-height">
            <v-card-subtitle>Auto-Z текущего запуска</v-card-subtitle>
            <v-card-text>
              <div
                class="text-h5"
                data-test="z-auto-alignment"
              >
                {{ formatMm(module.state.offset.auto_alignment) }}
              </div>
              <div class="text-caption text--secondary">
                Read-only наблюдение значения Z-Mod
              </div>
            </v-card-text>
          </v-card>
        </v-col>

        <v-col cols="12" md="4">
          <v-card outlined class="fill-height">
            <v-card-subtitle>Пользовательская коррекция</v-card-subtitle>
            <v-card-text>
              <div
                class="text-h5"
                data-test="z-persistent-user"
              >
                {{ formatMm(module.state.offset.persistent_user) }}
              </div>
              <div class="text-caption text--secondary">
                Сохранённый persistent Z trim
              </div>
            </v-card-text>
          </v-card>
        </v-col>
      </v-row>

      <v-simple-table class="mt-4">
        <tbody>
          <tr>
            <th>Состояние принтера</th>
            <td data-test="z-klippy-state">
              {{ runtimeLabel }}
            </td>
          </tr>
          <tr>
            <th>Политика перед печатью</th>
            <td data-test="z-hook-state">
              {{ hookLabel }}
            </td>
          </tr>
          <tr>
            <th>Владелец физического Auto-Z</th>
            <td data-test="z-motion-owner">
              {{ module.state.calibration.motion_owner }}
            </td>
          </tr>
          <tr>
            <th>Запись Z из Plugins AD5X</th>
            <td data-test="z-write-gate">
              {{ module.state.calibration.offset_write_enabled ? 'разрешена' : 'запрещена' }}
            </td>
          </tr>
          <tr>
            <th>Движения из Plugins AD5X</th>
            <td data-test="z-motion-actions">
              {{ module.state.calibration.motion_actions_enabled ? 'разрешены' : 'запрещены' }}
            </td>
          </tr>
          <tr>
            <th>Provenance</th>
            <td data-test="z-provenance">
              {{ provenanceLabel }}
            </td>
          </tr>
          <tr>
            <th>Z-offset из слайсера</th>
            <td data-test="z-slicer-offset">
              {{ slicerOffsetLabel }}
            </td>
          </tr>
        </tbody>
      </v-simple-table>

      <v-expansion-panels
        class="mt-4"
        flat
      >
        <v-expansion-panel>
          <v-expansion-panel-header>
            Расширенная диагностика
          </v-expansion-panel-header>
          <v-expansion-panel-content>
            <v-simple-table dense>
              <tbody>
                <tr>
                  <th>Backend module</th>
                  <td data-test="z-module-health">
                    {{ snapshot.module_version }} / {{ module.schema_version }} / {{ module.health }}
                  </td>
                </tr>
                <tr>
                  <th>Revision</th>
                  <td>{{ snapshot.revision }}</td>
                </tr>
                <tr>
                  <th>Known total</th>
                  <td>{{ formatMm(module.state.offset.known_total) }}</td>
                </tr>
                <tr>
                  <th>Live adjustment</th>
                  <td>{{ formatMm(module.state.offset.live_adjustment) }}</td>
                </tr>
                <tr>
                  <th>External unknown</th>
                  <td>{{ formatMm(module.state.offset.external_unknown) }}</td>
                </tr>
                <tr>
                  <th>Policy ID</th>
                  <td data-test="z-policy-id">
                    {{ module.state.calibration.integration.policy_id || '—' }}
                  </td>
                </tr>
                <tr>
                  <th>Hook chain</th>
                  <td data-test="z-hook-commands">
                    {{ hookCommandsLabel }}
                  </td>
                </tr>
                <tr>
                  <th>Fail closed</th>
                  <td data-test="z-safety-state">
                    {{ module.state.safety.fail_closed ? 'да' : 'нет' }}; H7: {{ module.state.safety.h7_role }}
                  </td>
                </tr>
              </tbody>
            </v-simple-table>
          </v-expansion-panel-content>
        </v-expansion-panel>
      </v-expansion-panels>
    </v-card-text>
  </v-card>
</template>

<script lang="ts">
import Vue from 'vue'
import { Component, Prop } from 'vue-property-decorator'
import type { Ad5xZCalibrationSnapshot } from '@/ad5x/api/types'

@Component({})
export default class ZCalibrationStatusCard extends Vue {
  @Prop({ required: true }) readonly snapshot!: Ad5xZCalibrationSnapshot
  @Prop({ default: false }) readonly loading!: boolean

  get module () {
    return this.snapshot.module
  }

  get ready (): boolean {
    const calibration = this.module.state.calibration

    return this.module.available &&
      this.module.health === 'ok' &&
      calibration.motion_owner === 'zmod' &&
      calibration.motion_actions_enabled === false &&
      calibration.offset_write_enabled === false &&
      calibration.offset_hook_status === 'loaded' &&
      calibration.integration.policy_status === 'loaded' &&
      this.module.state.safety.fail_closed
  }

  get readinessMessage (): string {
    if (this.ready) {
      return 'Z-Mod владеет движением и контактом; защитная политика загружена; frontend не может писать Z.'
    }

    const problems: string[] = []
    const calibration = this.module.state.calibration

    if (!this.module.available) problems.push('runtime недоступен')
    if (this.module.health !== 'ok') problems.push(`health=${this.module.health}`)
    if (calibration.motion_owner !== 'zmod') problems.push(`motion owner=${calibration.motion_owner}`)
    if (calibration.motion_actions_enabled) problems.push('разрешены motion actions')
    if (calibration.offset_write_enabled) problems.push('разрешена запись Z')
    if (calibration.offset_hook_status !== 'loaded') problems.push(`hook=${calibration.offset_hook_status}`)
    if (calibration.integration.policy_status !== 'loaded') problems.push(`policy=${calibration.integration.policy_status}`)
    if (!this.module.state.safety.fail_closed) problems.push('fail-closed выключен')

    return problems.join('; ') || 'Backend не подтвердил полностью безопасное состояние.'
  }

  get hasExternalUnknown (): boolean {
    return Math.abs(this.module.state.offset.external_unknown) > 0.000001
  }

  get runtimeLabel (): string {
    const runtime = this.module.state.runtime
    const homed = runtime.homed_axes || 'не выполнен homing'
    return `${runtime.klippy}; ${runtime.print_state}; ${homed}`
  }

  get hookLabel (): string {
    const calibration = this.module.state.calibration
    const policy = calibration.integration.policy_id || 'policy неизвестна'
    return `${calibration.offset_hook_status}; ${policy}`
  }

  get provenanceLabel (): string {
    return `${this.module.state.provenance.status} (${this.module.state.provenance.model})`
  }

  get slicerOffsetLabel (): string {
    const job = this.module.state.job
    if (job.requested_slicer_z_offset === null) return 'не задан'

    const requested = this.formatMm(job.requested_slicer_z_offset)
    const effect = job.slicer_z_offset_effect === 'ignored_by_zmod_global_offset_path'
      ? 'игнорируется текущим global-offset путём Z-Mod'
      : job.slicer_z_offset_effect

    return `${requested}; ${effect}`
  }

  get hookCommandsLabel (): string {
    const commands = this.module.state.calibration.integration.hook_commands
    return commands && commands.length > 0 ? commands.join(' → ') : '—'
  }

  formatNullableMm (value: number | null): string {
    return value === null ? '—' : this.formatMm(value)
  }

  formatMm (value: number): string {
    const sign = value > 0 ? '+' : ''
    return `${sign}${value.toFixed(3)} mm`
  }
}
</script>
