import { onBeforeUnmount } from 'vue';

export const isSSR = typeof window === 'undefined';

export function useDebouncedFn(fn: () => void, debounce: number) {
	let timerId: number;

	function debouncedFn() {
		clearTimeout(timerId);
		timerId = setTimeout(() => fn(), debounce);
	}

	onBeforeUnmount(() => {
		clearTimeout(timerId);
	});

	return debouncedFn;
}
