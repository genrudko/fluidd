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

  it('is the compact print-preparation surface rather than a manual calibration console', () => {
    expect(source).toContain('title="Подготовка печати"')
    expect(source).toContain('data-test="ad5x-dashboard-anchor"')
    expect(source).toContain('data-test="ad5x-dashboard-bed-target"')
    expect(source).toContain('data-test="ad5x-dashboard-purge"')
    expect(source).not.toContain('data-test="ad5x-dashboard-home-z"')
    expect(source).not.toContain("runGcode('G28 Z')")
  })

  it('uses semantic pre-print and the supported Z-Mod purge algorithm selector', () => {
    expect(source).toContain('ADZ_SET_PREPRINT ENABLED=')
    expect(source).toMatch(/ADZ_SET_PURGE ALGORITHM=\$\{algorithm\.toUpperCase\(\)\}/)
    expect(source).not.toContain('AD5X_Z_SET_PREPRINT')
    expect(source).toContain('data-test="ad5x-dashboard-purge-select"')
    for (const algorithm of ['orca', 'ff', 'ff2', 'schreider', 'line']) {
      expect(source).toContain(`value: '${algorithm}'`)
    }
    expect(source).not.toContain('CLEAR_TRAP')
    expect(source).toContain('purge_policy_provenance')
  })

  it('shows a KAMP override without rewriting the selected purge algorithm', () => {
    expect(source).toContain("this.purge.reason === 'kamp_line'")
    expect(source).toMatch(/\$\{selected\} → KAMP Line/)
    expect(source).toContain('this.purge.selected_algorithm')
    expect(source).toContain('this.purge.effective_macro')
  })

  it('keeps material and thermal provenance tied to the current print job', () => {
    expect(source).toContain('filament_weights')
    expect(source).toContain('Number(weights[index]) > 0')
    expect(source).toContain('module.state.job.thermal')
    expect(source).toContain('first_layer_bed_temp')
    expect(source).toContain('START_PRINT')
  })
})
