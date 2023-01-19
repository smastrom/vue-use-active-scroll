import { watch, onMounted, ref, computed, type Ref, type ComputedRef } from 'vue';
import { isChrome, isSSR, useMediaRef } from './utils';

type UseListenersOptions = {
	isWindow: ComputedRef<boolean>;
	root: Ref<HTMLElement | null>;
	matchMedia: Ref<boolean>;
	_setActive: (prevY: number, isCancel?: { isCancel: boolean }) => void;
};

const ONCE = { once: true };

export function useScroll({ isWindow, root, _setActive, matchMedia }: UseListenersOptions) {
	const isClick = useMediaRef(matchMedia, false);
	const isReady = ref(false);
	const clickY = computed(() => (isClick.value ? getNextY() : 0));

	let prevY: number;

	function getNextY() {
		return isWindow.value ? window.scrollY : root.value?.scrollTop || 0;
	}

	function setReady(maxFrames: number) {
		let rafId: DOMHighResTimeStamp | undefined = undefined;
		let rafPrevY: number;
		let frameCount = 0;

		function scrollEnd() {
			const rafNextY = getNextY();
			if (typeof rafPrevY === 'undefined' || rafPrevY !== rafNextY) {
				frameCount = 0;
				rafPrevY = rafNextY;
				return requestAnimationFrame(scrollEnd);
			}
			// When equal, wait for n frames after scroll to make sure is idle
			frameCount++;
			if (frameCount === maxFrames) {
				isReady.value = true;
				isClick.value = false;
				cancelAnimationFrame(rafId as DOMHighResTimeStamp);
			} else {
				requestAnimationFrame(scrollEnd);
			}
		}

		rafId = requestAnimationFrame(scrollEnd);
	}

	function onScroll() {
		// Do not "update" results if scrolling from click
		if (!isClick.value) {
			const nextY = getNextY();
			if (!prevY) {
				prevY = nextY;
			}
			_setActive(prevY);
			prevY = nextY;
		}
	}

	// Restore "highlighting" if scrolling again while already scrolling from click...
	function reScroll() {
		isClick.value = false;
	}

	function onSpaceBar(event: KeyboardEvent) {
		if (event.code === 'Space') {
			reScroll();
		}
	}

	function waitForIdle() {
		setReady(20);
	}

	function onPointerDown(event: PointerEvent) {
		const isLink = (event.target as HTMLElement).tagName === 'A';
		const hasLink = (event.target as HTMLElement).closest('a');

		if (!isChrome && !isLink && !hasLink) {
			reScroll();
			// ...and force set if canceling scroll
			_setActive(clickY.value, { isCancel: true });
		}
	}

	onMounted(() => {
		if (matchMedia.value && location.hash) {
			// Wait for any eventual scroll to hash triggered by browser to end
			setReady(10);
		} else {
			isReady.value = true;
		}
	});

	watch(
		[isReady, matchMedia, root],
		([_isReady, _matchMedia, _root], _, onCleanup) => {
			if (isSSR) {
				return;
			}

			const rootEl = isWindow.value ? document : _root;
			const isActive = rootEl && _isReady && _matchMedia;

			if (isActive) {
				rootEl.addEventListener('scroll', onScroll, {
					passive: true,
				});
			}

			onCleanup(() => {
				if (isActive) {
					rootEl.removeEventListener('scroll', onScroll);
				}
			});
		},
		{ immediate: true, flush: 'sync' }
	);

	watch(
		isClick,
		(_isClick, _, onCleanup) => {
			const rootEl = isWindow.value ? document : root.value;

			if (_isClick && rootEl) {
				rootEl.addEventListener('scroll', waitForIdle, ONCE);
				rootEl.addEventListener('wheel', reScroll, ONCE);
				rootEl.addEventListener('touchmove', reScroll, ONCE);
				rootEl.addEventListener('keydown', onSpaceBar as EventListener, ONCE);
				rootEl.addEventListener('pointerdown', onPointerDown as EventListener, ONCE);
			}

			onCleanup(() => {
				if (_isClick && rootEl) {
					rootEl.removeEventListener('scroll', waitForIdle);
					rootEl.removeEventListener('wheel', reScroll);
					rootEl.removeEventListener('touchmove', reScroll);
					rootEl.removeEventListener('keydown', onSpaceBar as EventListener);
					rootEl.removeEventListener('pointerdown', onPointerDown as EventListener);
				}
			});
		},
		{ flush: 'sync' }
	);

	return isClick;
}
