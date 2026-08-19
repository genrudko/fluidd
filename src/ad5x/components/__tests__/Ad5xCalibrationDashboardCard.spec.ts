import { readFileSync } from 'node:fs'

const source = readFileSync(
  new URL('../Ad5xCalibrationDashboardCard.vue', import.meta.url),
  'utf8'
)

describe('Ad5xCalibrationDashboardCard layout contract', () => {
  it('uses the exact registered dashboard layout id and native draggable mode', () => {
    expect(source).toContain('layout-path="dashboard.ad5x-calibration-dashboard-card"')
    expect(source).toMatch(/<collapsable-card[\s\S]*?\sdraggable(?:\s|>)/)
  })
})
