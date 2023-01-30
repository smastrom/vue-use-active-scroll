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
import { getEdges, useMediaRef, isSSR, FIXED_OFFSET } from './utils';

type UseActiveOptions = {
	root?: Ref<HTMLElement | null> | HTMLElement | null;
	jumpToFirst?: boolean;
	jumpToLast?: boolean;
	overlayHeight?: number;
	minWidth?: number;
	replaceHash?: boolean;
	edgeOffset?: {
		first?: number;
		last?: number;
	};
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

const defaultOpts = {
	jumpToFirst: true,
	jumpToLast: true,
	overlayHeight: 0,
	minWidth: 0,
	replaceHash: false,
	root: null,
	boundaryOffset: {
		toTop: 0,
		toBottom: 0,
	},
	edgeOffset: {
		first: 100,
		last: 100,
	},
} as const;

export function useActive(
	userIds: string[] | Ref<string[]>,
	{
		root: _root = defaultOpts.root,
		jumpToFirst = defaultOpts.jumpToFirst,
		jumpToLast = defaultOpts.jumpToLast,
		overlayHeight = defaultOpts.overlayHeight,
		minWidth = defaultOpts.minWidth,
		replaceHash = defaultOpts.replaceHash,
		boundaryOffset: {
			toTop = defaultOpts.boundaryOffset.toTop,
			toBottom = defaultOpts.boundaryOffset.toTop,
		} = defaultOpts.boundaryOffset,
		edgeOffset: {
			first: firstOffset = defaultOpts.edgeOffset.first,
			last: lastOffset = defaultOpts.edgeOffset.last,
		} = defaultOpts.edgeOffset,
	}: UseActiveOptions = defaultOpts
): UseActiveReturn {
	let resizeObserver: ResizeObserver;
	let skipObserverCallback = true;
	const media = `(min-width: ${minWidth}px)`;

	// Reactivity

	// Internal
	const matchMedia = ref(isSSR || window.matchMedia(media).matches);
	const targets = reactive({
		elements: [] as HTMLElement[],
		top: new Map<string, number>(),
		bottom: new Map<string, number>(),
	});

	const root = computed(() =>
		isSSR ? null : unref(_root) instanceof HTMLElement ? unref(_root) : document.documentElement
	) as Ref<HTMLElement>;

	const isWindow = computed(() => root.value === document.documentElement);
	const ids = computed(() => targets.elements.map(({ id }) => id));

	// Returned
	const activeId = useMediaRef(matchMedia, '');
	const activeIndex = computed(() => ids.value.indexOf(activeId.value));

	// Functions

	function getTop() {
		return root.value.getBoundingClientRect().top - (isWindow.value ? 0 : root.value.scrollTop);
	}

	// Runs onMount, on root resize and whenever the user array changes
	function setTargets() {
		console.log('Updating targets...');
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

		targets.top.clear();
		targets.bottom.clear();

		targets.elements.forEach((target) => {
			const { top, bottom } = target.getBoundingClientRect();
			targets.top.set(target.id, top - rootTop);
			targets.bottom.set(target.id, bottom - rootTop);
		});
	}

	// Returns true if target has been set as active
	function onEdgeReached() {
		if (!jumpToFirst && !jumpToLast) {
			return false;
		}

		const { isBottom, isTop } = getEdges(root.value);

		if (jumpToFirst && isTop) {
			return (activeId.value = ids.value[0]), true;
		}
		if (jumpToLast && isBottom) {
			return (activeId.value = ids.value[ids.value.length - 1]), true;
		}
	}

	function getSentinel() {
		return isWindow.value ? getTop() : -root.value.scrollTop;
	}

	// Sets first target-top that LEFT the viewport
	function onScrollDown({ isCancel } = { isCancel: false }) {
		let firstOut = jumpToFirst ? ids.value[0] : '';

		const sentinel = getSentinel();
		const offset = FIXED_OFFSET + overlayHeight + toBottom;

		Array.from(targets.top).some(([id, top], index) => {
			const _firstOffset = !jumpToFirst && index === 0 ? firstOffset : 0;

			if (sentinel + top < offset + _firstOffset) {
				return (firstOut = id), false;
			}
			return true; // Get last in ascending
		});

		// If jumpToLast is false, remove activeId once last target-bottom is out of view
		if (!jumpToLast && firstOut === ids.value[ids.value.length - 1]) {
			const lastBottom = Array.from(targets.bottom.values())[ids.value.length - 1];

			if (sentinel + lastBottom < offset + lastOffset) {
				return (activeId.value = '');
			}
		}

		// Prevent innatural highlighting with smoothscroll/custom easings...
		if (
			ids.value.indexOf(firstOut) > ids.value.indexOf(activeId.value) ||
			(firstOut && !activeId.value)
		) {
			return (activeId.value = firstOut);
		}

		// ...but not on scroll cancel
		if (isCancel) {
			activeId.value = firstOut;
		}
	}

	// Sets first target-bottom that ENTERED the viewport
	function onScrollUp() {
		let firstIn = jumpToLast ? ids.value[ids.value.length - 1] : '';

		const sentinel = getSentinel();
		const offset = FIXED_OFFSET + overlayHeight + toTop;

		Array.from(targets.bottom).some(([id, bottom], index) => {
			const _lastOffset = !jumpToLast && index === ids.value.length - 1 ? lastOffset : 0;

			if (sentinel + bottom > offset + _lastOffset) {
				return (firstIn = id), true; // Get first in ascending
			}
		});

		// If jumpToFirst is false, remove activeId once first target-top is in view
		if (!jumpToFirst && firstIn === ids.value[0]) {
			if (sentinel + targets.top.values().next().value > offset + firstOffset) {
				return (activeId.value = '');
			}
		}

		if (
			// Prevent innatural highlighting with smoothscroll/custom easings
			ids.value.indexOf(firstIn) < ids.value.indexOf(activeId.value) ||
			(firstIn && !activeId.value)
		) {
			return (activeId.value = firstIn);
		}
	}

	function onResize() {
		matchMedia.value = window.matchMedia(media).matches;
	}

	// Returns true if hash has been set as active
	function setFromHash() {
		const hashId = targets.elements.find(({ id }) => id === location.hash.slice(1))?.id;

		if (hashId) {
			return (activeId.value = hashId), true;
		}
	}

	function onHashChange(event: HashChangeEvent) {
		if (matchMedia.value) {
			// If scrolled to top
			if (!event.newURL.includes('#') && activeId.value) {
				return (activeId.value = jumpToFirst ? ids.value[0] : '');
			}

			// Else set hash as active
			setFromHash();
		}
	}

	function setObserver() {
		resizeObserver = new ResizeObserver(() => {
			if (!skipObserverCallback) {
				setTargets();
				requestAnimationFrame(() => {
					if (!onEdgeReached()) {
						onScrollDown();
					}
				});
			} else {
				skipObserverCallback = false;
			}
		});

		resizeObserver.observe(root.value);
	}

	function destroyObserver() {
		if (resizeObserver) {
			resizeObserver.disconnect();
		}
	}

	function addHashListener() {
		window.addEventListener('hashchange', onHashChange);
	}

	function removeHashListener() {
		window.removeEventListener('hashchange', onHashChange);
	}

	// Mount

	onMounted(async () => {
		window.addEventListener('resize', onResize, { passive: true });

		// https://github.com/nuxt/content/issues/1799
		await new Promise((resolve) => setTimeout(resolve));

		if (matchMedia.value) {
			setTargets();
			setObserver();
			addHashListener();

			// Hash has priority only on mount...
			if (!setFromHash() && !onEdgeReached()) {
				onScrollDown();
			}
		}
	});

	// Update

	watch(matchMedia, (_matchMedia) => {
		if (_matchMedia) {
			setTargets();
			setObserver();
			addHashListener();

			// ...but not on resize
			if (!onEdgeReached()) {
				onScrollDown();
			}
		} else {
			activeId.value = '';
			removeHashListener();
			destroyObserver();
		}
	});

	watch(
		root,
		() => {
			setTargets();
		},
		{
			flush: 'post',
		}
	);

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

	// Destroy

	onBeforeUnmount(() => {
		window.removeEventListener('resize', onResize);
		removeHashListener();
		destroyObserver();
	});

	// Composables

	const setClick = useScroll({
		userIds,
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
