import {
	ref,
	onMounted,
	computed,
	unref,
	watch,
	isRef,
	isReactive,
	onBeforeUnmount,
	reactive,
	type Ref,
} from 'vue';
import { useScroll } from './useScroll';
import { getEdges, useMediaRef, isSSR, FIXED_OFFSET, type DeepNonNullable } from './utils';

type UseActiveOptions = {
	jumpToFirst?: boolean;
	jumpToLast?: boolean;
	overlayHeight?: number;
	minWidth?: number;
	replaceHash?: boolean;
	rootId?: string | null;
	boundaryOffset?: {
		toTop?: number;
		toBottom?: number;
	};
};

type UseActiveReturn = {
	isActive: (id: string) => boolean;
	setActive: (id: string) => void;
	activeId: Ref<string>;
	activeIndex: Ref<number>;
};

const defaultOpts: DeepNonNullable<UseActiveOptions> = {
	jumpToFirst: true,
	jumpToLast: true,
	overlayHeight: 0,
	minWidth: 0,
	replaceHash: false,
	boundaryOffset: {
		toTop: 0,
		toBottom: 0,
	},
	// @ts-ignore - Internal
	rootId: null,
};

export function useActive(
	userIds: string[] | Ref<string[]>,
	{
		jumpToFirst = defaultOpts.jumpToFirst,
		jumpToLast = defaultOpts.jumpToLast,
		overlayHeight = defaultOpts.overlayHeight,
		minWidth = defaultOpts.minWidth,
		replaceHash = defaultOpts.replaceHash,
		rootId = defaultOpts.rootId,
		boundaryOffset: {
			toTop = defaultOpts.boundaryOffset.toTop,
			toBottom = defaultOpts.boundaryOffset.toTop,
		} = defaultOpts.boundaryOffset,
	}: UseActiveOptions = defaultOpts
): UseActiveReturn {
	const media = `(min-width: ${minWidth}px)`;

	// Reactivity

	// Internal
	const matchMedia = ref(isSSR || window.matchMedia(media).matches);
	const root = ref<HTMLElement | null>(null);
	const targets = reactive({
		elements: [] as HTMLElement[],
		top: new Map<string, number>(),
		bottom: new Map<string, number>(),
	});

	const isWindow = computed(() => root.value === document.documentElement);
	const ids = computed(() => targets.elements.map(({ id }) => id));

	// Returned
	const activeId = useMediaRef(matchMedia, '');
	const activeIndex = computed(() => ids.value.indexOf(activeId.value));

	// Functions

	function getTop() {
		if (root.value) {
			return root.value.getBoundingClientRect().top - (isWindow.value ? 0 : root.value.scrollTop);
		}
		return 0;
	}

	// Runs onMount, onResize and whenever the user array changes
	function setTargets() {
		const _targets = <HTMLElement[]>[];

		unref(userIds).forEach((id) => {
			const target = document.getElementById(id);
			if (target) {
				_targets.push(target);
			}
		});

		_targets.sort((a, b) => a.getBoundingClientRect().top - b.getBoundingClientRect().top);
		targets.elements = _targets;

		const rootTop = getTop();
		targets.elements.forEach((target) => {
			const { top, bottom } = target.getBoundingClientRect();
			targets.top.set(target.id, top - rootTop);
			targets.bottom.set(target.id, bottom - rootTop);
		});
	}

	function onEdgeReached() {
		const { isBottom, isTop } = getEdges(root.value as HTMLElement);

		if (jumpToFirst && isTop) {
			return (activeId.value = ids.value[0]), true;
		}
		if (jumpToLast && isBottom) {
			return (activeId.value = ids.value[ids.value.length - 1]), true;
		}
	}

	function getSentinel() {
		return isWindow.value ? getTop() : -(root.value as HTMLElement).scrollTop;
	}

	// Sets first target top that LEFT the viewport
	function onScrollDown({ isCancel } = { isCancel: false }) {
		let firstOut = jumpToFirst ? ids.value[0] : '';

		const sentinel = getSentinel();
		const offset = FIXED_OFFSET + overlayHeight + toBottom;

		Array.from(targets.top).some(([id, top]) => {
			if (sentinel + top < offset) {
				return (firstOut = id), false;
			}
			return true; // Return last
		});

		// Prevent innatural highlighting with smoothscroll/custom easings...
		if (ids.value.indexOf(firstOut) > ids.value.indexOf(activeId.value)) {
			return (activeId.value = firstOut);
		}

		// ...but not on scroll cancel
		if (isCancel) {
			activeId.value = firstOut;
		}
	}

	// Sets first target bottom that ENTERED the viewport
	function onScrollUp() {
		let firstIn = '';

		const sentinel = getSentinel();
		const offset = FIXED_OFFSET + overlayHeight + toTop;

		Array.from(targets.bottom).some(([id, bottom]) => {
			if (sentinel + bottom > offset) {
				return (firstIn = id), true; // Return first
			}
		});

		if (!jumpToFirst && firstIn === ids.value[0]) {
			if (sentinel + targets.top.values().next().value > offset) {
				return (activeId.value = '');
			}
		}

		if (ids.value.indexOf(firstIn) < ids.value.indexOf(activeId.value)) {
			activeId.value = firstIn;
		}
	}

	function onResize() {
		matchMedia.value = window.matchMedia(media).matches;
		setTargets();
	}

	function getHashId() {
		return targets.elements.find(({ id }) => id === location.hash.slice(1))?.id;
	}

	function onHashChange(event: HashChangeEvent) {
		if (matchMedia.value) {
			// If hash is not in the URL
			if (!event.newURL.includes('#') && activeId.value) {
				const prevY = getSentinel();

				requestAnimationFrame(() => {
					// If scrolled on its own reset activeId, if not keep current
					const newY = getSentinel();
					if (prevY !== newY) {
						return (activeId.value = jumpToFirst ? ids.value[0] : '');
					}
				});
			}

			// Else set it as active
			const hashId = getHashId();
			if (hashId) {
				activeId.value = hashId;
			}
		}
	}

	// Lifecycle

	onMounted(async () => {
		root.value = rootId
			? document.getElementById(rootId) ?? document.documentElement
			: document.documentElement;

		// https://github.com/nuxt/content/issues/1799
		await new Promise((resolve) => setTimeout(resolve));

		setTargets();

		window.addEventListener('resize', onResize, { passive: true });
		window.addEventListener('hashchange', onHashChange);

		if (matchMedia.value) {
			const hashId = getHashId();
			if (hashId) {
				return (activeId.value = hashId);
			}

			if (!onEdgeReached()) {
				onScrollDown();
			}
		}
	});

	onBeforeUnmount(() => {
		window.removeEventListener('resize', onResize);
		window.removeEventListener('hashchange', onHashChange);
	});

	// Watchers

	watch(isRef(userIds) || isReactive(userIds) ? userIds : () => null, setTargets, {
		flush: 'post',
	});

	watch(activeId, (newId) => {
		if (replaceHash) {
			const start = jumpToFirst ? 0 : -1;
			const newHash = `${location.pathname}${activeIndex.value > start ? `#${newId}` : ''}`;
			history.replaceState(history.state, '', newHash);
		}
	});

	watch(matchMedia, (_matchMedia) => {
		if (_matchMedia) {
			onScrollDown();
		} else {
			activeId.value = '';
		}
	});

	// Composables

	const setClick = useScroll({
		isWindow,
		root,
		matchMedia,
		onScrollUp,
		onScrollDown,
		onEdgeReached,
	});

	return {
		isActive: (id) => id === activeId.value,
		setActive: (id) => {
			activeId.value = id;
			setClick();
		},
		activeId,
		activeIndex,
	};
}
