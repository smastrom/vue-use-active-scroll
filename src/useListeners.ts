import { watch, onMounted, ref, Ref, ComputedRef, onBeforeUnmount, computed, nextTick } from 'vue';
import { isSSR } from './utils';

type UseListenersOptions = {
	isHTML: ComputedRef<boolean>;
	root: Ref<HTMLElement | null>;
	rootTop: Ref<number>;
	_setActive: (prevY: number, isCancel?: { isCancel: boolean }) => void;
	minWidth: number;
};

export function useListeners({ isHTML, root, rootTop, _setActive, minWidth }: UseListenersOptions) {
	const isClick = ref(false);

	if (isSSR) {
		return isClick;
	}

	const media = `(min-width: ${minWidth}px)`;

	const matchMedia = ref(window.matchMedia(media).matches);
	const isIdle = ref(false);

	const clickY = computed(() => {
		if (isClick.value) {
			return getNextY();
		}
	});

	let prevY: number;

	function getNextY() {
		return isHTML.value ? window.scrollY : root.value!.scrollTop;
	}

	function onResize() {
		rootTop.value = isHTML.value ? 0 : root.value!.getBoundingClientRect().top;
		matchMedia.value = window.matchMedia(media).matches;
	}

	function onScroll() {
		// Do not update results if scrolling from click
		if (!isClick.value) {
			console.log('onScroll');
			const nextY = getNextY();
			if (!prevY) {
				prevY = nextY;
			}
			_setActive(prevY);
			prevY = nextY;
		}
	}

	function setReady() {
		let prevY: number;
		let rafId: DOMHighResTimeStamp;
		let frameCount = 0;

		function scrollEnd() {
			const nextY = getNextY();
			if (typeof prevY === 'undefined' || prevY !== nextY) {
				frameCount = 0;
				prevY = nextY;
				console.log('Scrolling...');
				return requestAnimationFrame(scrollEnd);
			}
			// When equal, wait at least 20 frames to be sure is idle
			frameCount++;
			if (frameCount === 20) {
				isIdle.value = true;
				isClick.value = false;
				console.log('Scroll end.');
				cancelAnimationFrame(rafId);
			} else {
				requestAnimationFrame(scrollEnd);
			}
		}

		rafId = requestAnimationFrame(scrollEnd);
	}

	// Restore main listener "highlighting" if attempting to scroll again while scrolling from click...
	function reScroll() {
		isClick.value = false;
	}

	function onSpaceBar(event: KeyboardEvent) {
		if (event.code === 'Space') {
			reScroll();
		}
	}

	function onPointerDown(event: PointerEvent) {
		reScroll();
		const { tagName } = event.target as HTMLElement;
		const isLink = tagName === 'A' || tagName === 'BUTTON';
		if (!isLink) {
			// ...and force set if canceling scroll
			_setActive(clickY.value!, { isCancel: true });
		}
	}

	onMounted(() => {
		window.addEventListener('resize', onResize, { passive: true });
		// Wait for any eventual scroll to hash triggered by browser to end
		setReady();
	});

	onBeforeUnmount(() => {
		window.removeEventListener('resize', onResize);
	});

	watch(
		[isIdle, matchMedia, root],
		([isIdle, matchMedia, root], [], onCleanup) => {
			const rootEl = isHTML.value ? document : root;
			if (isIdle && rootEl) {
				if (matchMedia) {
					console.log('Adding main listener...');
					rootEl.addEventListener('scroll', onScroll, {
						passive: true,
					});
				}

				onCleanup(() => {
					if (matchMedia) {
						console.log('Removing main listener...');
						rootEl.removeEventListener('scroll', onScroll);
					}
				});
			}
		},
		{ immediate: true, flush: 'sync' }
	);

	watch(
		isClick,
		(isClick, _, onCleanup) => {
			const rootEl = isHTML.value ? document : root.value!;

			if (isClick) {
				console.log('Adding additional listeners...');
				rootEl.addEventListener('scroll', setReady, { once: true });
				rootEl.addEventListener('wheel', reScroll, { once: true });
				rootEl.addEventListener('keydown', onSpaceBar as EventListener, {
					once: true,
				});
				rootEl.addEventListener('pointerdown', onPointerDown as EventListener, {
					once: true,
				});
			}

			onCleanup(() => {
				if (isClick) {
					console.log('Removing additional listeners...');
					rootEl.removeEventListener('scroll', setReady);
					rootEl.removeEventListener('wheel', reScroll);
					rootEl.removeEventListener('keydown', onSpaceBar as EventListener);
					rootEl.removeEventListener('pointerdown', onPointerDown as EventListener);
				}
			});
		},
		{ flush: 'sync' }
	);

	return isClick;
}
