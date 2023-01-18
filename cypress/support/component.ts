// ***********************************************************
// This example support/component.ts is processed and
// loaded automatically before your test files.
//
// This is a great place to put global configuration and
// behavior that modifies Cypress.
//
// You can change the location of this file or turn off
// automatically serving support files with the
// 'supportFile' configuration option.
//
// You can read more here:
// https://on.cypress.io/configuration
// ***********************************************************

// Import commands.js using ES2015 syntax:
import './commands';

// Alternatively you can use CommonJS syntax:
// require('./commands')

import { mount } from 'cypress/vue';

// Augment the Cypress namespace to include type definitions for
// your custom command.
// Alternatively, can be defined in cypress/support/component.d.ts
// with a <reference path="./component" /> at the top of your spec.
declare global {
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

export function getIntRange(min: number, max: number) {
	min = Math.ceil(min);
	max = Math.floor(max);
	return Math.floor(Math.random() * (max - min + 1) + min);
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
