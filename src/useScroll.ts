import { nextTick, watch, ref, ComputedRef } from 'vue';
import { useDebouncedFn } from './useDebounceFn';

export function useScroll(
	userIds: ComputedRef<string[]>,
	{ onScrollUp = () => {}, onScrollDown = () => {}, onBottomReached = () => {}, debounce = 0 }
) {
	let scrollPos = window.pageYOffset;
	const isBottomReached = ref(false);

	const debouncedScroll = debounce > 0 ? useDebouncedFn(onScroll, debounce) : onScroll;

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
				Math.abs(root.scrollHeight - root.clientHeight - root.scrollTop) < 1;

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
