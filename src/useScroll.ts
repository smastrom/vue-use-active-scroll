import { nextTick, onBeforeUnmount, onMounted, onUnmounted, ref } from 'vue';

export function useScroll(
	root: HTMLElement,
	{ onScrollUp = () => {}, onScrollDown = () => {}, onBottomReached = () => {}, debounce = 0 }
) {
	let scrollPos = window.pageYOffset;
	const isBottomReached = ref(false);

	const debouncedScroll = debounce > 0 ? useDebounceFn(onScroll, debounce) : onScroll;

	function onScroll() {
		if (window.pageYOffset < scrollPos) {
			onScrollUp();
		} else {
			onScrollDown();
		}

		scrollPos = window.pageYOffset;

		nextTick(() => {
			const scrollableArea = root.scrollHeight - root.clientHeight;
			const scrolledHeight = Math.round(root.scrollTop);
			if (scrolledHeight >= scrollableArea) {
				onBottomReached();
			}
			isBottomReached.value = scrolledHeight >= scrollableArea;
		});
	}

	onMounted(() => {
		document.addEventListener('scroll', debouncedScroll, { passive: true });
	});

	onBeforeUnmount(() => {
		document.removeEventListener('scroll', debouncedScroll);
	});

	return { isBottomReached };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export default function useDebounceFn<T extends (...args: any[]) => any>(fn: T, delay: number): T {
	let timerId: number | undefined;

	const debouncedFn = ((...args: Parameters<T>) => {
		clearTimeout(timerId);
		timerId = setTimeout(() => fn(...args), delay);
	}) as T;

	onUnmounted(() => {
		clearTimeout(timerId);
	});

	return debouncedFn;
}
