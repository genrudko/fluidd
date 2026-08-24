<template>
  <app-dialog
    v-model="open"
    max-width="560"
  >
    <template #title>
      {{ $t('app.ad5x.ifs.providerIdentity.title') }}<span v-if="slotData"> · {{ $t('app.ad5x.ifs.providerIdentity.slot', { slot: slotData.slot }) }}</span>
    </template>

    <template v-if="slotData && slotData.present">
      <v-alert
        v-if="!hardwareAccepted"
        text
        dense
        type="warning"
        data-test="provider-hardware-gate"
      >
        {{ $t('app.ad5x.ifs.providerIdentity.hardwareGate') }}
      </v-alert>
      <v-alert
        v-else-if="!providerTypesKnown"
        text
        dense
        type="warning"
        data-test="provider-types-unknown"
      >
        {{ $t('app.ad5x.ifs.providerIdentity.typesUnknown') }}
      </v-alert>
      <v-alert
        v-else-if="desired && !writeReady"
        text
        dense
        type="info"
        data-test="provider-write-blocked"
      >
        {{ $t('app.ad5x.ifs.providerIdentity.projectionBlocked') }}<span v-if="blockerLabel">: {{ blockerLabel }}</span>.
      </v-alert>

      <div class="text-caption text--secondary">
        {{ $t('app.ad5x.ifs.providerIdentity.current') }}
      </div>
      <div
        class="text-body-1 mb-4"
        data-test="provider-current"
      >
        {{ currentLabel }}
      </div>

      <v-select
        v-model="material"
        :items="supportedMaterialTypes"
        :label="$t('app.ad5x.ifs.providerIdentity.material').toString()"
        :error-messages="materialError ? [materialError] : []"
        :disabled="controlsDisabled"
        data-test="provider-material"
      />
      <v-text-field
        v-model="color"
        :label="$t('app.ad5x.ifs.providerIdentity.color').toString()"
        :disabled="controlsDisabled"
        :error-messages="colorError ? [colorError] : []"
        data-test="provider-color"
      />

      <v-sheet
        v-if="desired"
        outlined
        rounded
        class="pa-3 mt-2"
        data-test="provider-desired"
      >
        <div class="text-caption text--secondary">
          {{ $t('app.ad5x.ifs.providerIdentity.richSpool') }}
        </div>
        <div>{{ desired.material || $t('app.ad5x.ifs.providerIdentity.materialUnknown') }} · {{ desired.color || $t('app.ad5x.ifs.providerIdentity.colorUnknown') }}</div>
        <div
          v-if="spoolIds"
          class="text-caption text--secondary mt-1"
        >
          {{ spoolIds }}
        </div>
        <v-chip
          x-small
          outlined
          class="mt-2"
          :color="mismatched ? 'warning' : 'success'"
          data-test="provider-sync-state"
        >
          {{ mismatched ? $t('app.ad5x.ifs.providerIdentity.diverged') : $t('app.ad5x.ifs.providerIdentity.inSync') }}
        </v-chip>
      </v-sheet>

      <v-alert
        v-if="error"
        dense
        text
        type="error"
        class="mt-3"
      >
        {{ error }}
      </v-alert>
    </template>

    <template #actions>
      <v-btn
        text
        @click="open = false"
      >
        {{ $t('app.ad5x.ifs.providerIdentity.close') }}
      </v-btn>
      <v-spacer />
      <v-btn
        v-if="desired"
        text
        color="primary"
        :disabled="controlsDisabled || !writeReady || !desiredSupported"
        :loading="busy"
        data-test="provider-apply-spool"
        @click="applySpool"
      >
        {{ $t('app.ad5x.ifs.providerIdentity.applySpool') }}
      </v-btn>
      <v-btn
        color="primary"
        :disabled="controlsDisabled || Boolean(materialError) || Boolean(colorError)"
        :loading="busy"
        data-test="provider-save"
        @click="save"
      >
        {{ $t('app.ad5x.ifs.providerIdentity.save') }}
      </v-btn>
    </template>
  </app-dialog>
</template>

<script lang="ts">
import Vue from 'vue'
import { Component, Prop, VModel, Watch } from 'vue-property-decorator'
import type { Ad5xIfsSlot, Ad5xIfsZmodIdentity } from '@/ad5x/api/ifs'

@Component({})
export default class IfsProviderIdentityDialog extends Vue {
  @VModel({ type: Boolean }) open!: boolean
  @Prop({ type: Object, default: null }) readonly slotData!: Ad5xIfsSlot | null
  @Prop({ type: Array, default: () => [] }) readonly materialTypes!: readonly string[]
  @Prop({ type: Boolean, default: false }) readonly hardwareAccepted!: boolean
  @Prop({ type: Boolean, default: false }) readonly busy!: boolean
  @Prop({ type: Boolean, default: false }) readonly locked!: boolean
  @Prop({ type: String, default: '' }) readonly error!: string

  material = ''
  color = ''

  @Watch('open')
  @Watch('slotData')
  reset (): void {
    if (!this.slotData?.present) return
    this.material = this.current.material
    this.color = this.current.color
  }

  get compatibility () { return this.slotData?.compatibility?.zmod ?? null }
  get current (): Ad5xIfsZmodIdentity {
    return this.compatibility?.current ?? {
      material: this.slotData?.material ?? '',
      color: this.slotData?.color ?? ''
    }
  }

  get desired (): Ad5xIfsZmodIdentity | null {
    const desired = this.compatibility?.desired
    return desired && (desired.material || desired.color) ? desired : null
  }

  get writeReady (): boolean { return this.compatibility?.write_ready ?? false }
  get mismatched (): boolean { return Boolean(this.desired && this.compatibility?.sync_state === 'diverged') }
  get supportedMaterialTypes (): readonly string[] {
    return [...new Set(this.materialTypes.map(value => value.trim().toUpperCase()).filter(value => value && value !== '?'))]
  }

  get providerTypesKnown (): boolean { return this.supportedMaterialTypes.length > 0 }
  get controlsDisabled (): boolean { return this.busy || this.locked || !this.hardwareAccepted || !this.providerTypesKnown }
  get blockerLabel (): string { return this.compatibility?.write_blockers.join(' · ') ?? '' }
  get materialError (): string {
    const material = this.material.trim().toUpperCase()
    if (!material) return this.$t('app.ad5x.ifs.providerIdentity.selectMaterial').toString()
    if (this.providerTypesKnown && !this.supportedMaterialTypes.includes(material)) return this.$t('app.ad5x.ifs.providerIdentity.unsupportedMaterial').toString()
    return ''
  }

  get desiredSupported (): boolean {
    if (!this.desired) return false
    return this.supportedMaterialTypes.includes(this.desired.material.trim().toUpperCase()) && /^#[0-9A-F]{6}$/i.test(this.desired.color)
  }

  get currentLabel (): string { return `${this.current.material || this.$t('app.ad5x.ifs.providerIdentity.materialUnknown')} · ${this.current.color || this.$t('app.ad5x.ifs.providerIdentity.colorUnknown')}` }
  get colorError (): string { return /^#[0-9A-F]{6}$/i.test(this.color.trim()) ? '' : this.$t('app.ad5x.ifs.providerIdentity.invalidColor').toString() }
  get spoolIds (): string {
    if (!this.slotData) return ''
    const ids = []
    if (this.slotData.spool.spoolman_spool_id !== null) ids.push(this.$t('app.ad5x.ifs.providerIdentity.spoolmanSpoolId', { id: this.slotData.spool.spoolman_spool_id }).toString())
    if (this.slotData.spool.spoolman_filament_id !== null) ids.push(this.$t('app.ad5x.ifs.providerIdentity.filamentId', { id: this.slotData.spool.spoolman_filament_id }).toString())
    return ids.join(' · ')
  }

  save (): void {
    if (this.controlsDisabled || this.materialError || this.colorError) return
    this.$emit('save', { material: this.material.trim().toUpperCase(), color: this.color.trim().toUpperCase(), applySpoolProjection: false })
  }

  applySpool (): void {
    if (this.controlsDisabled || !this.writeReady || !this.desired || !this.desiredSupported) return
    this.$emit('save', { material: this.desired.material.trim().toUpperCase(), color: this.desired.color.trim().toUpperCase(), applySpoolProjection: true })
  }
}
</script>
