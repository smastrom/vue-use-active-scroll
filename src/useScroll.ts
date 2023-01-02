import { watch, ref, Ref } from 'vue';
import { isSSR, useDebouncedFn } from './utils';

type UseScrollOptions = {
	userIds: string[] | Ref<string[]>;
	viewportWidth: Ref<number>;
	debounce: number;
	minWidth: number;
	onScrollUp: () => void;
	onScrollDown: () => void;
};

export function useScroll({
	userIds,
	onScrollUp,
	onScrollDown,
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
	let scrollPos: number;

	function onScroll() {
		if (!scrollPos) {
			scrollPos = window.scrollY;
		}

		if (window.scrollY < scrollPos) {
			onScrollUp();
		} else {
			onScrollDown();
		}

		scrollPos = window.scrollY;

		const root = document.documentElement;
		isBottomReached.value = Math.abs(root.scrollHeight - root.clientHeight - root.scrollTop) < 1;
	}

	function addEvent() {
		document.addEventListener('scroll', debouncedScroll, { passive: true });
	}

	function removeEvent() {
		document.removeEventListener('scroll', debouncedScroll);
	}

	watch(
		() => viewportWidth.value >= minWidth,
		(isAboveMin, _, onCleanup) => {
			if (isAboveMin) {
				addEvent();
			}

			onCleanup(() => {
				removeEvent();
			});
		},
		{ immediate: true, flush: 'post' }
	);

	watch(
		userIds,
		(_, __, onCleanup) => {
			removeEvent();
			addEvent();

			onCleanup(() => {
				removeEvent();
			});
		},
		{ immediate: true, flush: 'post' }
	);

	return { isBottomReached };
}
