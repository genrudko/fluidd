import type { Ad5xIfsSlot } from '@/ad5x/api/ifs'
import { getIfsRemainingPercent } from '@/ad5x/api/ifs'

const EMPTY_COLOR = '#78909C'

export interface Ad5xIfsDashboardSlot {
  slot: number
  present: boolean
  active: boolean
  stall: boolean
  material: string
  color: string
  name: string
  remainingG: number | null
  remainingPercent: number | null
}

function validColor (value: string | undefined): string {
  return value && /^#[0-9A-F]{6}$/i.test(value) ? value.toUpperCase() : ''
}

export function getIfsDashboardSlots (slots: readonly Ad5xIfsSlot[]): Ad5xIfsDashboardSlot[] {
  return [1, 2, 3, 4].map(slotNumber => {
    const source = slots.find(slot => slot.slot === slotNumber)
    if (!source?.present) {
      return {
        slot: slotNumber,
        present: false,
        active: false,
        stall: false,
        material: '',
        color: EMPTY_COLOR,
        name: '',
        remainingG: null,
        remainingPercent: null
      }
    }

    const providerIdentity = source.compatibility?.zmod.current
    const material = providerIdentity?.material || source.material || source.spool.material || ''
    const color = validColor(providerIdentity?.color) ||
      validColor(source.color) ||
      validColor(source.appearance.colors[0]) ||
      EMPTY_COLOR

    return {
      slot: slotNumber,
      present: true,
      active: source.active,
      stall: source.stall,
      material,
      color,
      name: source.spool.name,
      remainingG: source.spool.remaining_g,
      remainingPercent: getIfsRemainingPercent(source)
    }
  })
}
