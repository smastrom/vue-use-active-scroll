// @ts-ignore
import App from './App.vue';
import { getIntRange, getRandomSequence } from '../cypress/support/component';

it('Should jump to last target', () => {
	const targetsLength = 20;

	cy.mount(App, {
		props: {
			jumpToLast: true,
			targetsLength,
		},
	});

	cy.scrollTo('bottom');
	cy.wait(2000);

	cy.get('a')
		.eq(targetsLength - 1)
		.should('have.class', 'active');
});

it('Should not jump to last target', () => {
	const targetsLength = 20;

	cy.mount(App, {
		props: {
			jumpToLast: false,
			targetsLength,
		},
	});

	cy.scrollTo('bottom');
	cy.wait(2000);

	cy.get('a')
		.eq(targetsLength - 1)
		.should('not.have.class', 'active');
});

it('Should set active clicked links without scroll interferences', () => {
	const targetsLength = 20;

	cy.mount(App, {
		props: {
			targetsLength,
		},
	});

	const randomIndices = getRandomSequence(targetsLength);

	randomIndices.forEach((index) => {
		cy.get('a').eq(index).click().should('have.class', 'active');
		cy.wait(200); // Wait for some smoothscrolling
		cy.get('a').eq(index).should('have.class', 'active');
	});
});

it('Should update targets on cancel while scrolling from click', () => {
	const targetsLength = 20;

	cy.mount(App, {
		props: {
			jumpToLast: true,
			targetsLength,
		},
	});

	for (let i = 0; i < 10; i++) {
		const randomIndex = getIntRange(10, 19);
		cy.get('a').eq(randomIndex).click().should('have.class', 'active');

		cy.get('.Content').trigger('pointerdown', { force: true });
		cy.get('a').eq(randomIndex).should('not.have.class', 'active');

		// Back to top
		cy.get('a').eq(0).click();
		cy.wait(1000);
	}
});

/* it('Should jump to first target', () => {});

it('Should jump to last target', () => {});

it('Should toggle functionalities below minWidth', () => {}); */
