import App from './App.vue'
import { getRandomSequence } from '../cypress/support/utils'

it('Should jump to last target', () => {
   const targetsLength = 20

   cy.mount(App, {
      props: {
         jumpToLast: true,
      },
   })

   cy.scrollTo('bottom')

   cy.get('a')
      .eq(targetsLength - 1)
      .should('have.class', 'active')
})

it('Should not jump to last target', () => {
   const targetsLength = 20

   cy.mount(App, {
      props: {
         jumpToLast: false,
      },
   })

   cy.scrollTo('bottom')

   cy.get('a')
      .eq(targetsLength - 1)
      .should('not.have.class', 'active')
})

it('Should jump to first target', () => {
   cy.mount(App, {
      props: {
         jumpToFirst: true,
         marginTop: 300,
      },
   })

   cy.get('a').eq(0).should('have.class', 'active')
})

it('Should not jump to first target', () => {
   cy.mount(App, {
      props: {
         jumpToFirst: false,
         marginTop: 300,
      },
   })

   cy.get('a').eq(0).should('not.have.class', 'active')
})

it('Should set active links on click without scroll interferences', () => {
   cy.mount(App)

   getRandomSequence(20).forEach((randomIndex) => {
      cy.get('a').eq(randomIndex).click().should('have.class', 'active')
   })
})

// TODO: Add more tests
