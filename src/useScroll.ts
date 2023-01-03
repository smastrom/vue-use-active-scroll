import { watch, onMounted, ref, onBeforeMount } from 'vue';
import { IDLE_TIME, isSSR } from './utils';

type UseScrollOptions = {
	onScroll: (prevPos: number) => void;
	minWidth: number;
};

export function useScroll({ onScroll: _onScroll, minWidth }: UseScrollOptions) {
	const isClick = ref(false);

	if (isSSR) {
		return isClick;
	}

	const media = `(min-width: ${minWidth}px)`;
	const matchMedia = ref(window.matchMedia(media).matches);
	const isIdle = ref(false);
	const restartCount = ref(0);

	let idleTimer: NodeJS.Timeout;
	let prevY: number | undefined;

	function onResize() {
		matchMedia.value = window.matchMedia(media).matches;
	}

	function onScroll() {
		// Do not update results if scrolling from click or on mount
		if (isIdle.value && !isClick.value) {
			if (!prevY) {
				prevY = window.scrollY;
			}
			_onScroll(prevY);
			prevY = window.scrollY;
		}
	}

	function onIdle() {
		clearTimeout(idleTimer);
		idleTimer = setTimeout(() => {
			console.log('Idle');
			isIdle.value = true;
		}, IDLE_TIME);
	}

	// Restart the main scroll listener if attempting to scroll while scrolling from click
	function onRestart() {
		isClick.value = false;
		restartCount.value++;
	}

	onMounted(() => {
		window.addEventListener('resize', onResize, { passive: true });
		if (window.scrollY > 0) {
			document.addEventListener('scroll', onIdle, { once: true, passive: true });
		} else {
			isIdle.value = true;
		}
	});

	watch(
		[isIdle, matchMedia, restartCount],
		([_isIdle, _matchMedia], [], onCleanup) => {
			if (_isIdle) {
				if (_matchMedia) {
					console.log('Attaching scroll...');
					document.addEventListener('scroll', onScroll, {
						passive: true,
					});
				}

				onCleanup(() => {
					console.log('Removing scroll...');
					document.removeEventListener('scroll', onScroll);
				});
			}
		},
		{ immediate: true, flush: 'sync' }
	);

	watch(
		isClick,
		(hasClicked, _, onCleanup) => {
			if (hasClicked) {
				if ('ontouchstart' in window) {
					document.addEventListener('touchstart', onRestart, { once: true });
				} else {
					document.addEventListener('wheel', onRestart, { once: true });
				}
			}

			onCleanup(() => {
				document.removeEventListener('touchstart', onRestart);
				document.removeEventListener('wheel', onRestart);
			});
		},
		{ flush: 'sync' }
	);

	onBeforeMount(() => {
		window.removeEventListener('resize', onResize);
	});

	return isClick;
}
