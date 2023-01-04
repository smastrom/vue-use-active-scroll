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

	// Restart the listener if attempting to scroll again while scrolling from click
	function onRestart() {
		isClick.value = false;
		restartCount.value++;
	}

	function onPointerDown(event: PointerEvent) {
		switch (event.pointerType) {
			case 'pen':
			case 'touch':
				return onRestart();
		}
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
				document.addEventListener('wheel', onRestart, { once: true });
				document.addEventListener('pointerdown', onPointerDown, { once: true });
			}

			onCleanup(() => {
				document.removeEventListener('wheel', onRestart);
				document.removeEventListener('pointerdown', onPointerDown);
			});
		},
		{ flush: 'sync' }
	);

	onBeforeMount(() => {
		window.removeEventListener('resize', onResize);
	});

	return isClick;
}
