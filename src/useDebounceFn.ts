import { onBeforeUnmount } from 'vue';

export function useDebouncedFn<T extends (...args: any[]) => any>(fn: T, delay: number): T {
	let timerId: number | undefined;

	const debouncedFn = ((...args: Parameters<T>) => {
		clearTimeout(timerId);
		timerId = setTimeout(() => fn(...args), delay);
	}) as T;

	onBeforeUnmount(() => {
		clearTimeout(timerId);
	});

	return debouncedFn;
}
