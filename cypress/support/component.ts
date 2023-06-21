/// <reference types="cypress" />

import { mount } from 'cypress/vue'
import { createMemoryHistory, createRouter, type Router } from 'vue-router'

type MountParams = Parameters<typeof mount>
type OptionsParam = MountParams[1] & { router?: Router }

export interface Props {
   jumpToLast?: boolean
   jumpToFirst?: boolean
   marginTop?: number
}

export type MountOptions = Omit<OptionsParam, 'props'> & {
   props?: Props
}

declare global {
   namespace Cypress {
      interface Chainable {
         mount(component: any, options?: MountOptions): Chainable<any>
      }
   }
}

Cypress.Commands.add('mount', (component, options = {} as MountOptions) => {
   options.global = options.global || {}
   options.global.plugins = options.global.plugins || []

   if (!options.router) {
      options.router = createRouter({
         history: createMemoryHistory(),
         routes: [
            {
               path: '/',
               name: 'Index',
               component: () => import('../../tests/Page.vue'),
            },
         ],
      })
   }

   options.global.plugins.push({
      install(app) {
         app.use(options.router as Router)
      },
   })

   return mount(component, options)
})
