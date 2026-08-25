<template>
  <v-card
    data-test="z-calibration-card"
    outlined
  >
    <v-card-title>
      <div>
        <div class="text-h6">
          Центр калибровки Z
        </div>
        <div class="text-caption text--secondary">
          Z-Mod выполняет физический Auto-Z. Plugins AD5X объясняет состояние, даёт безопасные действия и следит за границами.
        </div>
      </div>
    </v-card-title>

    <v-card-text>
      <z-calibration-actions
        :preprint-mode="preprintMode"
        :refresh-loading="loading"
        @refresh="$emit('reconcile')"
      />

      <v-alert
        data-test="z-ready-state"
        :type="readyAlertType"
        text
      >
        <strong>{{ readyTitle }}</strong>
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
        В итоговом Z-offset есть необъяснённая составляющая
        <strong>{{ formatMm(module.state.offset.external_unknown) }}</strong>.
        Она намеренно не считается babystepping или другой известной поправкой.
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
        <v-col
          cols="12"
          sm="4"
        >
          <v-card
            class="fill-height"
            outlined
          >
            <v-card-subtitle class="pb-1">
              Текущий Z-offset
            </v-card-subtitle>
            <v-card-text class="pt-1">
              <div
                class="text-h5"
                data-test="z-effective-offset"
              >
                {{ formatNullableMm(module.state.offset.effective) }}
              </div>
              <div class="text-caption text--secondary">
                {{ effectiveCaption }}
              </div>
            </v-card-text>
          </v-card>
        </v-col>

        <v-col
          cols="12"
          sm="4"
        >
          <v-card
            class="fill-height"
            outlined
          >
            <v-card-subtitle class="pb-1">
              {{ machineAnchorTitle }}
            </v-card-subtitle>
            <v-card-text class="pt-1">
              <div
                class="text-h5"
                data-test="z-machine-anchor"
              >
                {{ formatMm(machineAnchorValue) }}
              </div>
              <div class="text-caption text--secondary">
                {{ machineAnchorCaption }}
              </div>
            </v-card-text>
          </v-card>
        </v-col>

        <v-col
          cols="12"
          sm="4"
        >
          <v-card
            class="fill-height"
            outlined
          >
            <v-card-subtitle class="pb-1">
              Пользовательская поправка
            </v-card-subtitle>
            <v-card-text class="pt-1">
              <div
                class="text-h5"
                data-test="z-persistent-user"
              >
                {{ formatMm(module.state.offset.persistent_user) }}
              </div>
              <div class="text-caption text--secondary">
                Сохранённый Z trim
              </div>
            </v-card-text>
          </v-card>
        </v-col>
      </v-row>

      <z-calibration-mesh-preview />

      <v-simple-table
        class="mt-3"
        dense
      >
        <tbody>
          <tr>
            <th>Состояние принтера</th>
            <td data-test="z-klippy-state">
              {{ runtimeLabel }}
            </td>
          </tr>
          <tr>
            <th>Автокалибровка перед печатью</th>
            <td data-test="z-preprint-state">
              {{ preprintModeLabel }}
            </td>
          </tr>
          <tr>
            <th>Защитный hook перед печатью</th>
            <td data-test="z-hook-state">
              {{ hookLabel }}
            </td>
          </tr>
          <tr>
            <th>Физический Auto-Z выполняет</th>
            <td data-test="z-motion-owner">
              {{ motionOwnerLabel }}
            </td>
          </tr>
          <tr>
            <th>Запись Z из Plugins AD5X</th>
            <td data-test="z-write-gate">
              {{ module.state.calibration.offset_write_enabled ? 'разрешена' : 'запрещена (безопасный режим)' }}
            </td>
          </tr>
          <tr>
            <th>Движения из Plugins AD5X</th>
            <td data-test="z-motion-actions">
              {{ module.state.calibration.motion_actions_enabled ? 'разрешены' : 'запрещены (безопасный режим)' }}
            </td>
          </tr>
          <tr>
            <th>Состав итогового Z</th>
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
        class="mt-3"
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
                  <th>Effective valid</th>
                  <td>{{ effectiveValid ? 'yes' : 'no' }}</td>
                </tr>
                <tr>
                  <th>Raw homing_origin.z</th>
                  <td>{{ formatNullableMm(reportedHomingOriginZ) }}</td>
                </tr>
                <tr v-if="machineAnchor">
                  <th>Machine anchor status</th>
                  <td data-test="z-machine-anchor-status">
                    {{ machineAnchorStatus }}
                  </td>
                </tr>
                <tr v-if="machineAnchor">
                  <th>Machine anchor shift</th>
                  <td>{{ formatMm(machineAnchorValue) }}</td>
                </tr>
                <tr v-if="machineAnchor && machineAnchor.measured_delta !== undefined">
                  <th>Measured native delta</th>
                  <td>{{ formatNullableMm(machineAnchor.measured_delta ?? null) }}</td>
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
                  <th>Provenance model</th>
                  <td>{{ module.state.provenance.model }}</td>
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
import type { Ad5xZCalibrationMachineAnchor, Ad5xZCalibrationSnapshot } from '@/ad5x/api/types'
import ZCalibrationActions from '@/ad5x/components/ZCalibrationActions.vue'
import ZCalibrationMeshPreview from '@/ad5x/components/ZCalibrationMeshPreview.vue'

@Component({
  components: {
    ZCalibrationActions,
    ZCalibrationMeshPreview
  }
})
export default class ZCalibrationStatusCard extends Vue {
  @Prop({ required: true }) readonly snapshot!: Ad5xZCalibrationSnapshot
  @Prop({ default: false }) readonly loading!: boolean

  get module () {
    return this.snapshot.module
  }

  get effectiveValid (): boolean {
    const runtimeValue = this.module.state.runtime.effective_valid
    return typeof runtimeValue === 'boolean'
      ? runtimeValue
      : this.module.state.offset.effective !== null
  }

  get reportedHomingOriginZ (): number | null {
    return this.module.state.provenance.reported_homing_origin_z ?? null
  }

  get machineAnchor (): Ad5xZCalibrationMachineAnchor | null {
    return this.module.state.machine_anchor ??
      this.module.state.provenance.machine_anchor ??
      null
  }

  get isV6MachineAnchor (): boolean {
    return this.module.capabilities.includes('transient_machine_anchor_provenance') ||
      this.machineAnchor?.offset_component === false
  }

  get machineAnchorValue (): number {
    if (this.machineAnchorPending && this.machineAnchor?.measured_delta !== undefined && this.machineAnchor.measured_delta !== null) {
      return this.machineAnchor.measured_delta
    }
    return this.machineAnchor?.shift ?? this.module.state.offset.auto_alignment
  }

  get machineAnchorTitle (): string {
    return this.isV6MachineAnchor ? 'Привязка Auto-Z' : 'Auto-Z поправка'
  }

  get machineAnchorCaption (): string {
    if (!this.isV6MachineAnchor) return 'Значение Z-Mod, только для наблюдения'
    if (this.machineAnchorPending) return 'Измерено; перенос в runtime mesh ещё выполняется. Пользовательский Z-offset не изменяется'
    return 'Служебный machine anchor: сдвиг runtime mesh, не пользовательский Z-offset'
  }

  get machineAnchorStatus (): string {
    return this.machineAnchor?.status ?? 'legacy_gcode_offset'
  }

  get machineAnchorPending (): boolean {
    return this.isV6MachineAnchor && this.machineAnchorStatus === 'pending_transfer'
  }

  get machineAnchorRequiresAttention (): boolean {
    if (!this.isV6MachineAnchor) return false
    return !['active', 'idle', 'pending_transfer'].includes(this.machineAnchorStatus)
  }

  get preprintMode (): number | null {
    const value = this.module.state.provenance.rc_path?.mesh_test
    return typeof value === 'number' ? value : null
  }

  get preprintModeLabel (): string {
    if (this.preprintMode === 3) return 'включена · saved mesh + Z-check'
    if (this.preprintMode === 0) return 'выключена'
    if (this.preprintMode === null) return 'состояние не определено'
    return `нестандартный режим Z-Mod MESH_TEST=${this.preprintMode}`
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
      this.module.state.safety.fail_closed &&
      !this.machineAnchorRequiresAttention
  }

  get readyAlertType (): 'success' | 'info' | 'warning' {
    if (this.machineAnchorPending) return 'info'
    return this.ready ? 'success' : 'warning'
  }

  get readyTitle (): string {
    if (this.machineAnchorPending) return 'Auto-Z выполняется'
    return this.ready
      ? 'Система Z-калибровки готова'
      : 'Система Z-калибровки требует внимания'
  }

  get readinessMessage (): string {
    if (this.machineAnchorPending) {
      return 'Точная точка Auto-Z уже снята; служебная привязка переносится в runtime mesh. Пользовательский Z-offset не изменяется.'
    }

    if (this.ready && this.preprintMode === 0) {
      return 'Защитный контур активен. Автоматическая Z-калибровка перед печатью выключена пользователем.'
    }

    if (this.ready && !this.effectiveValid) {
      return 'Защитный контур активен. Итоговый Z-offset станет доступен после homing Z.'
    }

    if (this.ready) {
      return 'Z-Mod владеет движением и контактом; защитная политика загружена; Plugins AD5X не может писать Z.'
    }

    const problems: string[] = []
    const calibration = this.module.state.calibration

    if (!this.module.available) problems.push('runtime недоступен')
    if (this.module.health !== 'ok') problems.push(`health=${this.module.health}`)
    if (calibration.motion_owner !== 'zmod') problems.push(`владелец движения=${calibration.motion_owner}`)
    if (calibration.motion_actions_enabled) problems.push('разрешены движения')
    if (calibration.offset_write_enabled) problems.push('разрешена запись Z')
    if (calibration.offset_hook_status !== 'loaded') problems.push(`hook=${calibration.offset_hook_status}`)
    if (calibration.integration.policy_status !== 'loaded') problems.push(`policy=${calibration.integration.policy_status}`)
    if (!this.module.state.safety.fail_closed) problems.push('fail-closed выключен')
    if (this.machineAnchorRequiresAttention) problems.push(`machine anchor=${this.machineAnchorStatus}`)

    return problems.join('; ') || 'Backend не подтвердил безопасное состояние.'
  }

  get hasExternalUnknown (): boolean {
    return this.effectiveValid &&
      this.module.state.provenance.status === 'external_unknown' &&
      Math.abs(this.module.state.offset.external_unknown) > 0.000001
  }

  get effectiveCaption (): string {
    if (!this.effectiveValid) return 'Появится после homing Z'
    return this.isV6MachineAnchor
      ? 'Реальный пользовательский Z-offset Klipper; Auto-Z anchor хранится в mesh'
      : 'Фактический итоговый offset Klipper'
  }

  get runtimeLabel (): string {
    const runtime = this.module.state.runtime
    const printStates: Record<string, string> = {
      standby: 'ожидание',
      printing: 'печать',
      paused: 'пауза',
      complete: 'печать завершена',
      cancelled: 'печать отменена',
      error: 'ошибка'
    }
    const klippy = runtime.klippy === 'ready' ? 'Klipper готов' : `Klipper: ${runtime.klippy}`
    const printState = printStates[runtime.print_state] || runtime.print_state
    const homed = (runtime.homed_axes || '').toLowerCase()
    const homing = homed.includes('z')
      ? `homing: ${runtime.homed_axes.toUpperCase()}`
      : 'homing Z не выполнен'

    return `${klippy}; ${printState}; ${homing}`
  }

  get hookLabel (): string {
    const calibration = this.module.state.calibration

    if (calibration.offset_hook_status === 'loaded' && calibration.integration.policy_status === 'loaded') {
      return 'активен'
    }

    return `не подтверждён (hook=${calibration.offset_hook_status}; policy=${calibration.integration.policy_status})`
  }

  get motionOwnerLabel (): string {
    return this.module.state.calibration.motion_owner === 'zmod'
      ? 'Z-Mod'
      : this.module.state.calibration.motion_owner
  }

  get provenanceLabel (): string {
    const labels: Record<string, string> = {
      reconciled: 'все известные составляющие согласованы',
      not_homed: 'станет доступен после homing Z',
      external_unknown: 'есть необъяснённая составляющая',
      machine_anchor_pending: 'Auto-Z измерен; привязка runtime mesh завершается',
      machine_anchor_runtime_unavailable: 'runtime machine anchor недоступен',
      machine_anchor_runtime_malformed: 'runtime machine anchor повреждён',
      machine_anchor_persistence_violation: 'machine anchor ошибочно помечен как persistent',
      machine_anchor_state_mismatch: 'состояние machine anchor не согласовано',
      machine_anchor_shift_mismatch: 'измеренный Auto-Z и machine anchor не совпадают',
      partial: 'данные доступны частично',
      unsupported_zmod_offset_path: 'текущий offset-путь Z-Mod не поддержан',
      unavailable: 'недоступно'
    }

    return labels[this.module.state.provenance.status] || 'состояние требует диагностики'
  }

  get slicerOffsetLabel (): string {
    const job = this.module.state.job
    if (job.requested_slicer_z_offset === null) return 'не задан'

    const requested = this.formatMm(job.requested_slicer_z_offset)
    if (job.slicer_z_offset_effect === 'ignored_by_zmod_global_offset_path') {
      return `${requested}; текущий режим Z-Mod его не применяет`
    }

    return `${requested}; эффект не подтверждён`
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
