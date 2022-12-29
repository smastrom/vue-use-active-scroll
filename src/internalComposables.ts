import { nextTick, onBeforeUnmount, onMounted, watch, onUnmounted, ref, ComputedRef } from 'vue';

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
		onScrollDown();
	}, 75);

	onMounted(() => {
		window.addEventListener('resize', debouncedCallback);
	});

	onBeforeUnmount(() => {
		window.removeEventListener('resize', debouncedCallback);
	});
}

export function useScroll(
	userIds: ComputedRef<string[]>,
	{
		onScrollUp = () => {},
		onScrollDown = () => {},
		onBottomReached = () => {},
		bottomOffset = 0,
		debounce = 0,
	}
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
			const root = document.documentElement;
			const _isBottomReached =
				// ScrollHeight - ViewportHeight - ScrolledArea
				Math.abs(root.scrollHeight - root.clientHeight - root.scrollTop) < 1 + bottomOffset;

			if (_isBottomReached) {
				onBottomReached();
			}

			isBottomReached.value = _isBottomReached;
		});
	}

	watch(
		() => userIds.value,
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
