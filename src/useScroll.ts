import { watch, onMounted, ref, computed, type Ref, type ComputedRef } from 'vue';
import { isFirefox, useMediaRef } from './utils';

type UseScrollOptions = {
	isWindow: ComputedRef<boolean>;
	root: Ref<HTMLElement | null>;
	matchMedia: Ref<boolean>;
	onScrollUp: () => void;
	onScrollDown: ({ isCancel }: { isCancel: boolean }) => void;
	onEdgeReached: () => void;
};

const ONCE = { once: true };

export function useScroll({
	isWindow,
	root,
	matchMedia,
	onScrollUp,
	onScrollDown,
	onEdgeReached,
}: UseScrollOptions) {
	const isClick = useMediaRef(matchMedia, false);
	const isIdle = ref(false);
	const clickY = computed(() => (isClick.value ? getY() : 0));

	let prevY = getY();

	function getY() {
		return isWindow.value ? window.scrollY : root.value?.scrollTop || 0; // SSR safe
	}

	function setIdle(maxFrames = 20) {
		let rafId: DOMHighResTimeStamp | undefined = undefined;
		let rafPrevY = getY();
		let frameCount = 0;

		function scrollEnd() {
			frameCount++;

			const rafNextY = getY();

			if (rafPrevY !== rafNextY) {
				frameCount = 0;
				rafPrevY = rafNextY;
				return requestAnimationFrame(scrollEnd);
			}

			// When equal, wait for n frames after scroll to make sure is idle
			if (frameCount === maxFrames) {
				isIdle.value = true;
				isClick.value = false;
				cancelAnimationFrame(rafId as DOMHighResTimeStamp);
			} else {
				requestAnimationFrame(scrollEnd);
			}
		}

		rafId = requestAnimationFrame(scrollEnd);
	}

	function setActive({ prevY, isCancel = false }: { prevY: number; isCancel?: boolean }) {
		const nextY = getY();

		if (nextY < prevY) {
			onScrollUp();
		} else {
			onScrollDown({ isCancel });
		}

		return nextY;
	}

	function onScroll() {
		// Do not "update" results if scrolling from click
		if (!isClick.value) {
			prevY = setActive({ prevY });
			onEdgeReached();
		}
	}

	// Restore "highlighting" if scrolling again while already scrolling from click...
	function reScroll() {
		isClick.value = false;
	}

	function onPointerDown(event: PointerEvent) {
		const isLink = (event.target as HTMLElement).tagName === 'A';

		if (!isLink && isFirefox()) {
			reScroll();
			// ...and force set if canceling scroll
			setActive({ prevY: clickY.value, isCancel: true });
		}
	}

	function onSpaceBar(event: KeyboardEvent) {
		if (event.code === 'Space') {
			reScroll();
		}
	}

	onMounted(() => {
		if (matchMedia.value && location.hash) {
			// Wait for any eventual scroll to hash triggered by browser to end
			setIdle(10);
		} else {
			isIdle.value = true;
		}
	});

	watch(
		[isIdle, matchMedia, root],
		([_isIdle, _matchMedia, _root], _, onCleanup) => {
			const rootEl = isWindow.value ? document : _root;
			const isActive = rootEl && _isIdle && _matchMedia;

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
		{ flush: 'sync' }
	);

	watch(
		isClick,
		(_isClick, _, onCleanup) => {
			const rootEl = isWindow.value ? document : root.value;

			if (_isClick && rootEl) {
				rootEl.addEventListener('wheel', reScroll, ONCE);
				rootEl.addEventListener('touchmove', reScroll, ONCE);
				rootEl.addEventListener('scroll', setIdle as unknown as EventListener, ONCE);
				rootEl.addEventListener('keydown', onSpaceBar as EventListener, ONCE);
				rootEl.addEventListener('pointerdown', onPointerDown as EventListener, ONCE);
			}

			onCleanup(() => {
				if (_isClick && rootEl) {
					rootEl.removeEventListener('wheel', reScroll);
					rootEl.removeEventListener('touchmove', reScroll);
					rootEl.removeEventListener('scroll', setIdle as unknown as EventListener);
					rootEl.removeEventListener('keydown', onSpaceBar as EventListener);
					rootEl.removeEventListener('pointerdown', onPointerDown as EventListener);
				}
			});
		},
		{ flush: 'sync' }
	);

	return () => (isClick.value = true);
}
