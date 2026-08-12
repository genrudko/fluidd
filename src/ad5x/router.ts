import type { RouteConfig } from 'vue-router'

export const ad5xRoutes: RouteConfig[] = [
  {
    path: '/ad5x',
    name: 'ad5x',
    component: () => import('@/ad5x/views/Ad5xShell.vue')
  }
]
