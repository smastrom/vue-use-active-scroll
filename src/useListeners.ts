import { watch, onMounted, ref, Ref, onBeforeMount, ComputedRef } from 'vue';
import { IDLE_TIME, isSSR } from './utils';

type UseListenersOptions = {
	isHTML: ComputedRef<boolean>;
	root: Ref<HTMLElement | null>;
	rootTop: Ref<number>;
	_setActive: (prevY: number, { isCancel }?: { isCancel: boolean }) => void;
	minWidth: number;
};

export function useListeners({ isHTML, root, rootTop, _setActive, minWidth }: UseListenersOptions) {
	const isClick = ref(false);

	if (isSSR) {
		return isClick;
	}

	const media = `(min-width: ${minWidth}px)`;
	const matchMedia = ref(window.matchMedia(media).matches);
	const isReady = ref(false);
	const restartCount = ref(0);

	let readyTimer: NodeJS.Timeout;
	let prevY: number;

	function onResize() {
		rootTop.value = isHTML.value ? 0 : root.value!.getBoundingClientRect().top;
		matchMedia.value = window.matchMedia(media).matches;
	}

	function onScroll() {
		// Do not update results on mount or if scrolling from click
		if (isReady.value && !isClick.value) {
			const nextY = isHTML.value ? window.scrollY : root.value!.scrollTop;
			if (!prevY) {
				prevY = nextY;
			}
			_setActive(prevY);
			prevY = nextY;
		}
	}

	// If onMount client auto smooth-scrolls to hash, wait for scroll to finish
	function onReady() {
		clearTimeout(readyTimer);
		readyTimer = setTimeout(() => {
			isReady.value = true;
			const rootEl = isHTML.value ? document : root.value!;
			rootEl.removeEventListener('scroll', onReady);
		}, IDLE_TIME);
	}

	// Restart listener if attempting to scroll again...
	function reScroll() {
		isClick.value = false;
		restartCount.value++;
	}

	// ... And force set if canceling scroll
	function onPointerDown() {
		reScroll();
		const prevY = isHTML.value ? window.scrollY : root.value!.scrollTop;
		_setActive(prevY, { isCancel: true });
	}

	onMounted(() => {
		window.addEventListener('resize', onResize, { passive: true });

		const container = isHTML.value ? document.documentElement : root.value!;
		const rootEl = isHTML.value ? document : root.value!;
		const hasSmooth = getComputedStyle(container).scrollBehavior === 'smooth';

		if (hasSmooth && container.scrollTop > 0) {
			rootEl.addEventListener('scroll', onReady, { passive: true });
		} else {
			isReady.value = true;
		}
	});

	watch(
		[isReady, matchMedia, root, restartCount],
		([hasAutoScrolled, matchesMedia, _root], [], onCleanup) => {
			const rootEl = isHTML.value ? document : _root;
			if (hasAutoScrolled && rootEl) {
				if (matchesMedia) {
					rootEl.addEventListener('scroll', onScroll, {
						passive: true,
					});
				}

				onCleanup(() => {
					rootEl.removeEventListener('scroll', onScroll);
				});
			}
		},
		{ immediate: true, flush: 'sync' }
	);

	watch(
		isClick,
		(hasClicked, _, onCleanup) => {
			const rootEl = isHTML.value ? document : root.value!;
			if (hasClicked) {
				rootEl.addEventListener('wheel', reScroll, { once: true });
				rootEl.addEventListener('pointerdown', onPointerDown, { once: true });
			}

			onCleanup(() => {
				rootEl.removeEventListener('wheel', reScroll);
				rootEl.removeEventListener('pointerdown', onPointerDown);
			});
		},
		{ flush: 'sync' }
	);

	onBeforeMount(() => {
		window.removeEventListener('resize', onResize);
	});

	return isClick;
}
