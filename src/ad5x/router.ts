import type { RouteConfig } from 'vue-router'

export const ad5xRoutes: RouteConfig[] = [
  {
    path: '/ad5x/materials',
    name: 'ad5x-materials',
    component: () => import('@/ad5x/views/Ad5xMaterials.vue')
  }
]
