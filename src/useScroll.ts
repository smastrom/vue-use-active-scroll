import { watch, onMounted, ref, Ref, ComputedRef, computed } from 'vue';
import { isSSR, useRestrictedRef } from './utils';

type UseListenersOptions = {
	isHTML: ComputedRef<boolean>;
	root: Ref<HTMLElement | null>;
	matchMedia: Ref<boolean>;
	_setActive: (prevY: number, isCancel?: { isCancel: boolean }) => void;
};

const ONCE = { once: true };

export function useScroll({ isHTML, root, _setActive, matchMedia }: UseListenersOptions) {
	const isClick = useRestrictedRef(matchMedia, false);
	const isReady = ref(false);
	const clickY = computed(() => (isClick.value ? getNextY() : 0));

	let prevY: number;

	function getNextY() {
		return isHTML.value ? window.scrollY : root.value!.scrollTop;
	}

	function setReady() {
		let rafPrevY: number;
		let rafId: DOMHighResTimeStamp;
		let frameCount = 0;

		function scrollEnd() {
			const rafNextY = getNextY();
			if (typeof rafPrevY === 'undefined' || rafPrevY !== rafNextY) {
				frameCount = 0;
				rafPrevY = rafNextY;
				// console.log('Scrolling...');
				return requestAnimationFrame(scrollEnd);
			}
			// When equal, wait for 20 frames to be sure is idle
			frameCount++;
			if (frameCount === 20) {
				isReady.value = true;
				isClick.value = false;
				console.log('Scroll end.');
				cancelAnimationFrame(rafId);
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

	// Restore "updating" functionalities if scrolling again while scrolling from click...
	function reScroll() {
		isClick.value = false;
	}

	function onSpaceBar(event: KeyboardEvent) {
		if (event.code === 'Space') {
			reScroll();
		}
	}

	function onPointerDown(event: PointerEvent) {
		const isLink = (event.target as HTMLElement).tagName === 'A';
		const hasLink = (event.target as HTMLElement).closest('a');
		if (!isLink && !hasLink) {
			reScroll();
			// ...and force set if canceling scroll
			_setActive(clickY.value!, { isCancel: true });
		}
	}

	onMounted(() => {
		if (matchMedia.value && location.hash) {
			// Wait for any eventual scroll to hash triggered by browser to end
			setReady();
		} else {
			isReady.value = true;
		}
	});

	watch(
		[isReady, matchMedia, root],
		([_isReady, _matchMedia, _root], [], onCleanup) => {
			if (isSSR) {
				return;
			}

			const rootEl = isHTML.value ? document : _root;
			const isActive = rootEl && _isReady && _matchMedia;

			if (isActive) {
				console.log('Adding main listener...');
				rootEl.addEventListener('scroll', onScroll, {
					passive: true,
				});
			}

			onCleanup(() => {
				if (isActive) {
					console.log('Removing main listener...');
					rootEl.removeEventListener('scroll', onScroll);
				}
			});
		},
		{ immediate: true, flush: 'sync' }
	);

	watch(
		isClick,
		(_isClick, _, onCleanup) => {
			const rootEl = isHTML.value ? document : root.value!;

			if (_isClick) {
				console.log('Adding additional listeners...');
				rootEl.addEventListener('scroll', setReady, ONCE);
				rootEl.addEventListener('wheel', reScroll, ONCE);
				rootEl.addEventListener('keydown', onSpaceBar as EventListener, ONCE);
				rootEl.addEventListener('pointerdown', onPointerDown as EventListener, ONCE);
			}

			onCleanup(() => {
				if (_isClick) {
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
