import { watch, ref, Ref } from 'vue';
import { isSSR, useDebouncedFn } from './utils';

type UseScrollOptions = {
	userIds: string[] | Ref<string[]>;
	viewportWidth: Ref<number>;
	debounce: number;
	minWidth: number;
	onScrollUp: () => void;
	onScrollDown: () => void;
	onBottomReached: () => void;
};

export function useScroll({
	userIds,
	onScrollUp,
	onScrollDown,
	onBottomReached,
	viewportWidth,
	debounce,
	minWidth,
}: UseScrollOptions) {
	const isBottomReached = ref(false);

	if (isSSR) {
		return {
			isBottomReached,
		};
	}

	const debouncedScroll = debounce > 0 ? useDebouncedFn(onScroll, debounce) : onScroll;
	let scrollPos = window.pageYOffset;

	function onScroll() {
		if (window.pageYOffset < scrollPos) {
			onScrollUp();
		} else {
			onScrollDown();
		}

		const root = document.documentElement;
		const _isBottomReached =
			// ScrollHeight - ViewportHeight - ScrolledArea
			Math.abs(root.scrollHeight - root.clientHeight - root.scrollTop) < 1;

		if (_isBottomReached) {
			onBottomReached();
		}

		scrollPos = window.pageYOffset;
		isBottomReached.value = _isBottomReached;
	}

	function addEvent() {
		document.addEventListener('scroll', debouncedScroll, { passive: true });
	}

	function removeEvent() {
		document.removeEventListener('scroll', debouncedScroll);
	}

	watch(
		() => viewportWidth.value >= minWidth,
		(isDesktop, __, onCleanup) => {
			if (isDesktop) {
				console.log('Adding scroll listener - viewportWidth');
				addEvent();
			}

			onCleanup(() => {
				console.log('Removing scroll listener - viewportWidth');
				removeEvent();
			});
		},
		{ immediate: true, flush: 'post' }
	);

	watch(
		userIds,
		(_, __, onCleanup) => {
			console.log('Adding scroll listener - userIds');
			removeEvent();
			addEvent();

			onCleanup(() => {
				console.log('Removing scroll listener - userIds');
				removeEvent();
			});
		},
		{ immediate: true, flush: 'post' }
	);

	return { isBottomReached };
}
