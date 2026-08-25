import { ad5xRoutes } from '../router'

describe('AD5X routes', () => {
  it('registers materials as the only AD5X page route', () => {
    expect(ad5xRoutes).toHaveLength(1)
    expect(ad5xRoutes[0]).toMatchObject({
      path: '/ad5x/materials',
      name: 'ad5x-materials',
      component: expect.any(Function)
    })
  })
})
