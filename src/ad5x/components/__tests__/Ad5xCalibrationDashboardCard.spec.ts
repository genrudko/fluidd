import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const source = readFileSync(
  resolve(process.cwd(), 'src/ad5x/components/Ad5xCalibrationDashboardCard.vue'),
  'utf8'
)

describe('Ad5xCalibrationDashboardCard layout contract', () => {
  it('uses the exact registered dashboard layout id and native draggable mode', () => {
    expect(source).toContain('layout-path="dashboard.ad5x-calibration-dashboard-card"')
    expect(source).toMatch(/<collapsable-card[\s\S]*?\sdraggable(?:\s|>)/)
  })
})
