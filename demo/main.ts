import { createApp } from 'vue'
import App from './App.vue'
import { createRouter, createWebHistory } from 'vue-router'

const router = createRouter({
   history: createWebHistory(import.meta.env.BASE_URL),
   routes: [
      {
         path: '/',
         name: 'Index',
         component: () => import('./pages/Window.vue'),
      },
      {
         path: '/container',
         name: 'Container',
         component: () => import('./pages/Container.vue'),
      },
      {
         path: '/fixedheader',
         name: 'FixedHeader',
         component: () => import('./pages/FixedHeader.vue'),
      },
      {
         path: '/sections',
         name: 'Sections',
         component: () => import('./pages/Sections.vue'),
      },
   ],
   scrollBehavior(to, from) {
      if (from.hash && !to.hash) {
         if (to.name === 'Container' && from.name === 'Container') {
            return document.querySelector('#ScrollingContainer')?.scroll(0, 0)
         }

         return { top: 0 }
      }

      if (to.hash) {
         if (to.name === 'Container') {
            return document.querySelector(to.hash)?.scrollIntoView()
         }

         return {
            el: to.hash,
            top: to.name === 'FixedHeader' || to.name === 'Sections' ? 60 : 0,
         }
      }
   },
})

createApp(App).use(router).mount('#app')
