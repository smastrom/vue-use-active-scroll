import { watch, Ref, ComputedRef, onMounted, ref } from 'vue';
import { IDLE_TIME, isSSR } from './utils';

type UseScrollOptions = {
	onScroll: (prevPos: number) => void;
	userIds: string[] | Ref<string[]>;
	isAbove: ComputedRef<boolean>;
};

export function useScroll({ userIds, onScroll, isAbove }: UseScrollOptions) {
	const isClick = ref(false);

	if (isSSR) {
		return { isClick };
	}

	let isIdle = false;
	let idleTimer: NodeJS.Timeout;
	let clickTimer: NodeJS.Timeout;
	let prevY: number | undefined;

	function onIdle() {
		clearTimeout(idleTimer);
		idleTimer = setTimeout(() => {
			console.log('Idle');
			isIdle = true;
		}, IDLE_TIME);
	}

	function onClickEnd() {
		clickTimer = setTimeout(() => {
			console.log('Reset click timer');
			isClick.value = false;
		}, IDLE_TIME);
	}

	function _onScroll() {
		if (isIdle) {
			clearTimeout(clickTimer);

			if (!isClick.value) {
				if (!prevY) {
					prevY = window.scrollY;
				}
				onScroll(prevY);
				prevY = window.scrollY;
			}

			onClickEnd();
		}
	}

	onMounted(() => {
		if (window.scrollY > 0) {
			document.addEventListener('scroll', onIdle, { once: true, passive: true });
		} else {
			isIdle = true;
		}
	});

	function addScroll() {
		document.addEventListener('scroll', _onScroll, { passive: true });
	}

	function removeScroll() {
		document.removeEventListener('scroll', _onScroll);
	}

	watch(
		isAbove,
		(_isAbove, _, onCleanup) => {
			if (_isAbove) {
				addScroll();
			}

			onCleanup(() => {
				removeScroll();
			});
		},
		{ immediate: true, flush: 'post' }
	);

	watch(
		userIds,
		(_, __, onCleanup) => {
			removeScroll();
			addScroll();

			onCleanup(() => {
				removeScroll();
			});
		},
		{ immediate: true, flush: 'post' }
	);

	return { isClick };
}
