import { ad5xRoutes } from '../router'

describe('AD5X routes', () => {
  it('registers a static /ad5x shell route', () => {
    expect(ad5xRoutes).toHaveLength(1)
    expect(ad5xRoutes[0]).toMatchObject({
      path: '/ad5x',
      name: 'ad5x',
      component: expect.any(Function)
    })
  })
})
