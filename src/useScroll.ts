import { watch, Ref } from 'vue';
import { isSSR } from './utils';

type UseScrollOptions = {
	onScroll: (isDown?: { isDown: boolean }) => void;
	userIds: string[] | Ref<string[]>;
	width: Ref<number>;
	minWidth: number;
};

export function useScroll({ userIds, onScroll, width, minWidth }: UseScrollOptions) {
	if (isSSR) {
		return null;
	}

	let scrollPos: number;

	function _onScroll() {
		if (!scrollPos) {
			scrollPos = window.scrollY;
		}

		if (window.scrollY < scrollPos) {
			onScroll();
		} else {
			onScroll({ isDown: true });
		}

		scrollPos = window.scrollY;
	}

	function addEvent() {
		document.addEventListener('scroll', _onScroll, { passive: true });
	}

	function removeEvent() {
		document.removeEventListener('scroll', _onScroll);
	}

	watch(
		() => width.value >= minWidth,
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

	return null;
}
