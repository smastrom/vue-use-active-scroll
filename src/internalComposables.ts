import { nextTick, onBeforeUnmount, onMounted, watch, onUnmounted, ref, Ref } from 'vue';

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

export function useResize(setUnreachables: () => void, onScrollDown: () => void) {
	const debouncedCallback = useDebounceFn(() => {
		setUnreachables();
		nextTick(() => {
			onScrollDown();
		});
	}, 100);

	onMounted(() => {
		window.addEventListener('resize', debouncedCallback);
	});

	onBeforeUnmount(() => {
		window.removeEventListener('resize', debouncedCallback);
	});
}

export function useScroll(
	targets: Ref<HTMLElement[]>,
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

	watch(
		() => targets.value.length,
		(_, __, onCleanup) => {
			document.addEventListener('scroll', debouncedScroll, { passive: true });

			onCleanup(() => {
				document.removeEventListener('scroll', debouncedScroll);
			});
		},
		{ immediate: true, flush: 'post' }
	);

	return { isBottomReached };
}
