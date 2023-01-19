/// <reference types="cypress" />

import { mount } from 'cypress/vue';

declare global {
	// eslint-disable-next-line @typescript-eslint/no-namespace
	namespace Cypress {
		interface Chainable {
			mount: typeof mount;
		}
	}
}

Cypress.Commands.add('mount', mount);

export function getInt(max: number) {
	return Math.floor(Math.random() * max);
}

export function getRandomSequence(maxLength: number) {
	const sequence: number[] = [];

	let newLength = maxLength;
	let prev: number | undefined = undefined;

	for (let i = 0; i < newLength; i++) {
		const next = getInt(maxLength);

		if (typeof prev === 'undefined') {
			prev = next;
			continue;
		}
		if (prev === next) {
			newLength++;
			continue;
		}

		prev = next;
		sequence.push(next);
	}

	return sequence;
}
