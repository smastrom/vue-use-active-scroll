import { watch, onMounted, ref, unref, computed, type Ref, type ComputedRef } from 'vue';
import { getEdges, isSSR, useMediaRef } from './utils';

type UseScrollOptions = {
	userIds: string[] | Ref<string[]>;
	root: ComputedRef<HTMLElement>;
	isWindow: ComputedRef<boolean>;
	matchMedia: Ref<boolean>;
	onScrollUp: () => void;
	onScrollDown: ({ isCancel }: { isCancel: boolean }) => void;
	onEdgeReached: () => void | boolean;
};

const ONCE = { once: true };

export function useScroll({
	userIds,
	isWindow,
	root,
	matchMedia,
	onScrollUp,
	onScrollDown,
	onEdgeReached,
}: UseScrollOptions) {
	const isFromClick = useMediaRef(matchMedia, false);
	const isIdle = ref(false);
	const clickStartY = computed(() => (isFromClick.value ? getY() : 0));

	let prevY = isSSR ? 0 : getY();

	function getY() {
		return isWindow.value ? window.scrollY : root.value.scrollTop ?? 0;
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

			// Wait for n frames after scroll to make sure is idle
			if (frameCount === maxFrames) {
				isIdle.value = true;
				isFromClick.value = false;
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
		// Do not "highlight" intermediate targets if scrolling from click
		if (!isFromClick.value) {
			prevY = setActive({ prevY });
			onEdgeReached();
		}
	}

	// Restore "highlighting" if scrolling again while already scrolling from click...
	function restoreHighlight() {
		isFromClick.value = false;
	}

	function onSpaceBar(event: KeyboardEvent) {
		if (event.code === 'Space') {
			restoreHighlight();
		}
	}

	function onFirefoxCancel(event: PointerEvent) {
		const isAnchor = (event.target as HTMLElement).tagName === 'A';

		// ...and force set if canceling scroll on Firefox
		if (CSS.supports('-moz-appearance', 'none') && !isAnchor) {
			const { isBottom, isTop } = getEdges(root.value);

			if (!isTop && !isBottom) {
				restoreHighlight();
				setActive({ prevY: clickStartY.value, isCancel: true });
			}
		}
	}

	onMounted(() => {
		if (matchMedia.value && location.hash) {
			// Wait for any eventual scroll to hash triggered by the router to end
			setIdle(10);
		} else {
			isIdle.value = true;
		}
	});

	watch(
		[isIdle, matchMedia, root, userIds],
		([_isIdle, _matchMedia, _root, _userIds], _, onCleanup) => {
			const rootEl = isWindow.value ? document : _root;
			const isActive = rootEl && _isIdle && _matchMedia && unref(_userIds)?.length > 0;

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
		{ deep: true }
	);

	watch(
		isFromClick,
		(_isFromClick, _, onCleanup) => {
			const rootEl = isWindow.value ? document : root.value;
			const hasTargets = unref(userIds)?.length > 0;

			if (_isFromClick && hasTargets) {
				rootEl.addEventListener('wheel', restoreHighlight, ONCE);
				rootEl.addEventListener('touchmove', restoreHighlight, ONCE);
				rootEl.addEventListener('scroll', setIdle as unknown as EventListener, ONCE);
				rootEl.addEventListener('keydown', onSpaceBar as EventListener, ONCE);
				rootEl.addEventListener('pointerdown', onFirefoxCancel as EventListener); // Must persist until next scroll
			}

			onCleanup(() => {
				if (_isFromClick && hasTargets) {
					rootEl.removeEventListener('wheel', restoreHighlight);
					rootEl.removeEventListener('touchmove', restoreHighlight);
					rootEl.removeEventListener('scroll', setIdle as unknown as EventListener);
					rootEl.removeEventListener('keydown', onSpaceBar as EventListener);
					rootEl.removeEventListener('pointerdown', onFirefoxCancel as EventListener);
				}
			});
		},
		{ flush: 'sync' }
	);

	return () => (isFromClick.value = true);
}
