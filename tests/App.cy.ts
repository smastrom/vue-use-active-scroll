// @ts-ignore
import App from './App.vue';
import { getInt, getRandomSequence } from '../cypress/support/component';

it('Should give priority to URL hash on mount', () => {
	const targetsLength = 30;

	cy.mount(App, {
		props: {
			targetsLength,
		},
	});

	const randomIndex = getInt(targetsLength);

	cy.get('a')
		.eq(randomIndex)
		.click()
		.should('have.class', 'active')
		.invoke('attr', 'href')
		.then((href) => {
			cy.hash().should('eq', href);
		});
});

it.only('Should set active clicked links without scroll interferences', () => {
	const targetsLength = 30;

	cy.mount(App, {
		props: {
			targetsLength,
		},
	});

	const randomIndices = getRandomSequence(targetsLength);

	randomIndices.forEach((index) => {
		cy.wait(100); // Trigger smoothscroll
		cy.get('a').eq(index).click().should('have.class', 'active');
		cy.wait(100);
	});
});

/* it('Should update targets on cancel while scrolling from click', () => {});

it('Should jump to first target', () => {});

it('Should jump to last target', () => {});

it('Should toggle functionalities below minWidth', () => {}); */
