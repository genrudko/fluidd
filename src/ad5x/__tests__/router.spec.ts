import { ad5xRoutes } from '../router'

describe('AD5X routes', () => {
  it('registers native calibration and materials routes', () => {
    expect(ad5xRoutes).toHaveLength(2)
    expect(ad5xRoutes[0]).toMatchObject({
      path: '/ad5x',
      name: 'ad5x',
      component: expect.any(Function)
    })
    expect(ad5xRoutes[1]).toMatchObject({
      path: '/ad5x/materials',
      name: 'ad5x-materials',
      component: expect.any(Function)
    })
  })
})
