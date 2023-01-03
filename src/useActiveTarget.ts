import { ref, Ref, onMounted, computed, unref, watch } from 'vue';
import { useScroll } from './useScroll';
import { getEdges, getRects, FIXED_TO_TOP_OFFSET } from './utils';

type UseActiveTitleOptions = {
	jumpToFirst?: boolean;
	jumpToLast?: boolean;
	overlayHeight?: number;
	minWidth?: number;
	replaceHash?: boolean;
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
};

export function useActiveTarget(
	userIds: string[] | Ref<string[]> = [],
	{
		jumpToFirst = defaultOpts.jumpToFirst,
		jumpToLast = defaultOpts.jumpToLast,
		overlayHeight = defaultOpts.overlayHeight,
		minWidth = defaultOpts.minWidth,
		replaceHash = defaultOpts.replaceHash,
		boundaryOffset: {
			toTop = defaultOpts.boundaryOffset.toTop,
			toBottom = defaultOpts.boundaryOffset.toTop,
		} = defaultOpts.boundaryOffset,
	}: UseActiveTitleOptions = defaultOpts
): UseActiveTitleReturn {
	// Internal
	const targets = ref<HTMLElement[]>([]);
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

	function jumpToEdges() {
		const { isBottomReached, isTopReached, isOverScroll } = getEdges();

		if (isTopReached && jumpToFirst) {
			activeId.value = iDs.value[0];
			return true;
		} else if ((isBottomReached || isOverScroll) && jumpToLast) {
			activeId.value = iDs.value[iDs.value.length - 1];
			return true;
		}
	}

	// Sets first target that left the top of the viewport
	function onScrollDown() {
		/* 		console.log('onScrollDown'); */
		const offset = overlayHeight + (toBottom as number);
		const firstOut =
			Array.from(getRects(targets.value, 'top', '<', offset).keys()).pop() ??
			(jumpToFirst ? iDs.value[0] : '');

		activeId.value = firstOut;

		if (iDs.value.indexOf(firstOut) > iDs.value.indexOf(activeId.value)) {
			activeId.value = firstOut;
		}
	}

	// Sets first target that entered the top of the viewport
	function onScrollUp() {
		/* 		console.log('onScrollUp'); */
		if (!jumpToFirst) {
			const firstTargetTop = getRects(targets.value, 'top').values().next().value;
			// Ignore boundaryOffsets when first target becomes inactive
			if (firstTargetTop > FIXED_TO_TOP_OFFSET + overlayHeight) {
				return (activeId.value = '');
			}
		}

		const offset = overlayHeight + (toTop as number);
		const firstIn = getRects(targets.value, 'bottom', '>', offset).keys().next().value ?? '';

		if (iDs.value.indexOf(firstIn) < iDs.value.indexOf(activeId.value)) {
			activeId.value = firstIn;
		}
	}

	function onScroll(prevY: number) {
		if (window.scrollY < prevY) {
			onScrollUp();
		} else {
			onScrollDown();
		}
		jumpToEdges();
	}

	onMounted(() => {
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
		userIds,
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

	const isClick = useScroll({
		onScroll,
		minWidth,
	});

	// Returned functions
	function setActive(id: string) {
		if (id !== activeId.value) {
			isClick.value = true;
			activeId.value = id;
		}
	}

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
