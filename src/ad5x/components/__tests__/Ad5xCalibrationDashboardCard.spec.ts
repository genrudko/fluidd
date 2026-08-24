import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const source = readFileSync(
  resolve(process.cwd(), 'src/ad5x/components/Ad5xCalibrationDashboardCard.vue'),
  'utf8'
)

describe('Ad5xCalibrationDashboardCard integration contract', () => {
  it('uses the exact registered dashboard layout id and native draggable mode', () => {
    expect(source).toContain('layout-path="dashboard.ad5x-calibration-dashboard-card"')
    expect(source).toMatch(/<collapsable-card[\s\S]*?\sdraggable(?:\s|>)/)
  })

  it('uses the parser-safe ADZ pre-print macro and filters material metadata by positive filament weight', () => {
    expect(source).toContain('ADZ_SET_PREPRINT ENABLED=')
    expect(source).not.toContain('AD5X_Z_SET_PREPRINT')
    expect(source).toContain('filament_weights')
    expect(source).toContain('Number(weights[index]) > 0')
  })
})
