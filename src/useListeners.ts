import { watch, onMounted, ref, Ref, ComputedRef, onBeforeUnmount, computed, customRef } from 'vue';
import { isSSR } from './utils';

type UseListenersOptions = {
	isHTML: ComputedRef<boolean>;
	root: Ref<HTMLElement | null>;
	rootTop: Ref<number>;
	_setActive: (prevY: number, isCancel?: { isCancel: boolean }) => void;
	minWidth: number;
};

const ONCE = { once: true };

export function useListeners({ isHTML, root, rootTop, _setActive, minWidth }: UseListenersOptions) {
	const isClick = customRef<boolean>((track, trigger) => {
		let value = false;
		return {
			get() {
				track();
				return value;
			},
			set(newValue) {
				value = matchMedia.value ? newValue : false;
				trigger();
			},
		};
	});

	if (isSSR) {
		return isClick;
	}

	const media = `(min-width: ${minWidth}px)`;
	const matchMedia = ref(window.matchMedia(media).matches);
	const isIdle = ref(false);
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

	function onResize() {
		rootTop.value = isHTML.value ? 0 : root.value!.getBoundingClientRect().top;
		matchMedia.value = window.matchMedia(media).matches;
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

	// Restore main listener "updating" functionalities if scrolling again while scrolling from click...
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
		window.addEventListener('resize', onResize, { passive: true });
		if (matchMedia.value) {
			// Wait for any eventual scroll to hash triggered by browser to end
			setReady();
		} else {
			isIdle.value = true;
		}
	});

	onBeforeUnmount(() => {
		window.removeEventListener('resize', onResize);
	});

	watch(
		[isIdle, matchMedia, root],
		([_isIdle, _matchMedia, root], [], onCleanup) => {
			const rootEl = isHTML.value ? document : root;

			if (_isIdle && rootEl && _matchMedia) {
				console.log('Adding main listener...');
				rootEl.addEventListener('scroll', onScroll, {
					passive: true,
				});

				onCleanup(() => {
					console.log('Removing main listener...');
					rootEl.removeEventListener('scroll', onScroll);
				});
			}
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
