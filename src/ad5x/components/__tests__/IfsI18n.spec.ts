import en from '@/locales/en.yaml'
import ru from '@/locales/ru.yaml'

function keys (value: unknown, prefix = ''): string[] {
  if (!value || typeof value !== 'object') return [prefix]
  return Object.entries(value as Record<string, unknown>)
    .flatMap(([key, child]) => keys(child, prefix ? `${prefix}.${key}` : key))
    .sort()
}

describe('AD5X IFS locales', () => {
  const enAd5x = (en as any).app.ad5x
  const ruAd5x = (ru as any).app.ad5x

  it('keeps English and Russian AD5X keysets aligned', () => {
    expect(keys(ruAd5x)).toEqual(keys(enAd5x))
  })

  it('ships localized core IFS labels in both languages', () => {
    expect(enAd5x.ifs.materials.title).toBe('IFS / Materials')
    expect(ruAd5x.ifs.materials.title).toBe('IFS / Материалы')
    expect(enAd5x.ifs.equivalent.statusReady).toBe('Reserve ready')
    expect(ruAd5x.ifs.equivalent.statusReady).toBe('Резерв готов')
  })
})
