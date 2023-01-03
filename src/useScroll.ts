import { watch, ComputedRef, onMounted, ref } from 'vue';
import { IDLE_TIME, isSSR } from './utils';

type UseScrollOptions = {
	onScroll: (prevPos: number) => void;
	isAbove: ComputedRef<boolean>;
};

export function useScroll({ onScroll, isAbove }: UseScrollOptions) {
	const isClick = ref(false);

	if (isSSR) {
		return isClick;
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

	function onClickIdle() {
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

			onClickIdle();
		}
	}

	onMounted(() => {
		if (window.scrollY > 0) {
			document.addEventListener('scroll', onIdle, { once: true, passive: true });
		} else {
			isIdle = true;
		}
	});

	watch(
		isAbove,
		(_isAbove, _, onCleanup) => {
			if (_isAbove) {
				console.log('Attaching scroll...');
				document.addEventListener('scroll', _onScroll, { passive: true });
			}

			onCleanup(() => {
				console.log('Removing scroll...');
				document.removeEventListener('scroll', _onScroll);
			});
		},
		{ immediate: true }
	);

	return isClick;
}
