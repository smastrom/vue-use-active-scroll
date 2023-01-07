import { watch, onMounted, ref, Ref, onBeforeMount, ComputedRef } from 'vue';
import { IDLE_TIME, isSSR, SCROLLBAR_WIDTH } from './utils';

type UseListenersOptions = {
	isHTML: ComputedRef<boolean>;
	root: Ref<HTMLElement | null>;
	rootTop: Ref<number>;
	onScroll: (prevY: number) => void;
	minWidth: number;
};

export function useListeners({
	isHTML,
	root,
	rootTop,
	onScroll: _onScroll,
	minWidth,
}: UseListenersOptions) {
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
			const _prevY = isHTML.value ? window.scrollY : root.value!.scrollTop;
			if (!prevY) {
				prevY = _prevY;
			}
			_onScroll(prevY);
			prevY = _prevY;
		}
	}

	function onReady() {
		clearTimeout(readyTimer);
		readyTimer = setTimeout(() => {
			console.log('Idle');
			isReady.value = true;
		}, IDLE_TIME);
	}

	// Restart listener if attempting to scroll while scrolling from click
	function reScroll() {
		isClick.value = false;
		restartCount.value++;
	}

	function onPointerDown(event: PointerEvent) {
		switch (event.pointerType) {
			case 'mouse':
				const isScrollbar = event.clientX > root.value!.offsetWidth - SCROLLBAR_WIDTH;
				if (isScrollbar) {
					reScroll();
				}
				break;
			case 'pen':
			case 'touch':
				return reScroll();
		}
	}

	onMounted(() => {
		window.addEventListener('resize', onResize, { passive: true });

		const container = isHTML.value ? document.documentElement : root.value!;
		const rootEl = isHTML.value ? document : root.value!;
		if (container.scrollTop > 0) {
			rootEl.addEventListener('scroll', onReady, { once: true, passive: true });
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
					console.log('Attaching scroll...');
					rootEl.addEventListener('scroll', onScroll, {
						passive: true,
					});
				}

				onCleanup(() => {
					console.log('Removing scroll...');
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
				rootEl.addEventListener(
					'pointerdown',
					onPointerDown as EventListenerOrEventListenerObject,
					{ once: true }
				);
			}

			onCleanup(() => {
				rootEl.removeEventListener('wheel', reScroll);
				rootEl.removeEventListener(
					'pointerdown',
					onPointerDown as EventListenerOrEventListenerObject
				);
			});
		},
		{ flush: 'sync' }
	);

	onBeforeMount(() => {
		window.removeEventListener('resize', onResize);
	});

	return isClick;
}
