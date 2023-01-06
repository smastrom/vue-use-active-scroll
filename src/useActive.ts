import { ref, Ref, onMounted, computed, unref, watch, isRef, isReactive } from 'vue';
import { useListeners } from './useListeners';
import { getEdges, getRects, FIXED_TO_TOP_OFFSET } from './utils';

type UseActiveTitleOptions = {
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

type UseActiveTitleReturn = {
	isActive: (id: string) => boolean;
	setActive: (id: string) => void;
	activeId: Ref<string>;
	activeIndex: Ref<number>;
};

// https://github.com/microsoft/TypeScript/issues/28374#issuecomment-538052842
type DeepNonNullable<T> = { [P in keyof T]-?: NonNullable<T[P]> } & NonNullable<T>;

const defaultOpts: DeepNonNullable<UseActiveTitleOptions> = {
	jumpToFirst: true,
	jumpToLast: true,
	overlayHeight: 0,
	minWidth: 0,
	replaceHash: false,
	boundaryOffset: {
		toTop: 0,
		toBottom: 0,
	},
	// @ts-ignore
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
	}: UseActiveTitleOptions = defaultOpts
): UseActiveTitleReturn {
	// Internal

	const root = ref<HTMLElement | null>(null);
	const rootTop = ref(0);
	const targets = ref<HTMLElement[]>([]);
	const isHTML = computed(() => rootId == null);
	const iDs = computed(() => targets.value.map(({ id }) => id));

	// Returned values
	const activeId = ref('');
	const activeIndex = computed(() => iDs.value.indexOf(activeId.value));

	// Runs onMount and whenever the user array changes
	function setTargets() {
		const _targets = <HTMLElement[]>[];

		unref(userIds).forEach((id) => {
			const target = document.getElementById(id);
			if (target) {
				_targets.push(target);
			}
		});

		_targets.sort((a, b) => a.offsetTop - b.offsetTop);
		targets.value = _targets;
	}

	onMounted(() => {
		if (isHTML.value) {
			root.value = document.documentElement;
		} else {
			const cRoot = document.getElementById(rootId as string);
			if (cRoot) {
				root.value = cRoot;
				rootTop.value = cRoot.getBoundingClientRect().top;
			}
		}

		setTargets();

		const hashId = targets.value.find(({ id }) => id === location.hash.slice(1))?.id;
		if (hashId) {
			return (activeId.value = hashId);
		}

		if (!jumpToEdges()) {
			onScrollDown();
		}
	});

	watch(
		isRef(userIds) || isReactive(userIds) ? userIds : () => null,
		() => {
			setTargets();
		},
		{ flush: 'post' }
	);

	watch(activeId, (newId) => {
		if (replaceHash) {
			const start = jumpToFirst ? 0 : -1;
			const newHash = `${location.pathname}${activeIndex.value > start ? `#${newId}` : ''}`;
			history.replaceState(history.state, '', newHash);
		}
	});

	const isClick = useListeners({
		isHTML,
		root,
		rootTop,
		onScroll,
		minWidth,
	});

	function jumpToEdges() {
		const { isBottomReached, isTopReached } = getEdges(root.value!);

		if (isTopReached && jumpToFirst) {
			activeId.value = iDs.value[0];
			return true;
		} else if (isBottomReached && jumpToLast) {
			activeId.value = iDs.value[iDs.value.length - 1];
			return true;
		}
	}

	function onScroll(prevY: number) {
		const now = performance.now();
		const nextY = isHTML.value ? window.scrollY : root.value!.scrollTop;

		if (nextY < prevY) {
			onScrollUp();
		} else {
			onScrollDown();
		}
		jumpToEdges();
		console.log(`onScroll: ${performance.now() - now}ms`);
	}

	// Sets first target that left the top of the viewport
	function onScrollDown() {
		// OverlayHeight offset not needed if margin-top is negative
		const isCorrected =
			overlayHeight > 0 &&
			targets.value.some((target) => getComputedStyle(target).marginTop.includes('-'));
		const offset = isCorrected ? 0 : overlayHeight + rootTop.value + toBottom!;
		const firstOut =
			[...getRects(targets.value, 'top', '<', offset).keys()].at(-1) ??
			(jumpToFirst ? iDs.value[0] : '');

		activeId.value = firstOut;

		if (iDs.value.indexOf(firstOut) > iDs.value.indexOf(activeId.value)) {
			activeId.value = firstOut;
		}
	}

	// Sets first target that entered the top of the viewport
	function onScrollUp() {
		const offset = overlayHeight + rootTop.value + toTop!;
		if (!jumpToFirst) {
			const firstTargetTop = getRects(targets.value, 'top').values().next().value;
			// Exclude boundaryOffsets on first target
			if (firstTargetTop > FIXED_TO_TOP_OFFSET + (offset - toTop!)) {
				return (activeId.value = '');
			}
		}

		const firstIn = getRects(targets.value, 'bottom', '>', offset).keys().next().value ?? '';

		if (iDs.value.indexOf(firstIn) < iDs.value.indexOf(activeId.value)) {
			activeId.value = firstIn;
		}
	}

	// Returned
	function setActive(id: string) {
		if (id !== activeId.value) {
			isClick.value = true;
			activeId.value = id;
		}
	}

	// Returned
	function isActive(id: string) {
		return id === activeId.value;
	}

	return {
		isActive,
		setActive,
		activeId,
		activeIndex,
	};
}
