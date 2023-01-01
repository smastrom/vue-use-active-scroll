import { ref, Ref, onMounted, computed, unref, watch } from 'vue';
import { useResize } from './useResize';
import { useScroll } from './useScroll';

type Dataset = Record<string, string>;

// https://github.com/microsoft/TypeScript/issues/28374#issuecomment-538052842
type DeepNonNullable<T> = { [P in keyof T]-?: NonNullable<T[P]> } & NonNullable<T>;

type UseActiveTitleOptions = {
	jumpToFirst?: boolean;
	jumpToLast?: boolean;
	debounce?: number;
	topOffset?: number;
	minWidth?: number;
	boundaryOffset?: {
		toTop?: number;
		toBottom?: number;
	};
};

type UseActiveTitleReturn = {
	activeId: Ref<string>;
	activeDataset: Ref<Dataset>;
	activeIndex: Ref<number>;
	isBottomReached: Ref<boolean>;
	setUnreachable: (id: string) => void;
};

const defaultOpts: DeepNonNullable<UseActiveTitleOptions> = {
	jumpToFirst: true,
	jumpToLast: true,
	debounce: 0,
	topOffset: 0,
	minWidth: 0,
	boundaryOffset: {
		toTop: 0,
		toBottom: 0,
	},
};

function getDataset(dataset: DOMStringMap | undefined): Dataset {
	if (!dataset) {
		return {};
	}
	const datasetAsObj = JSON.parse(JSON.stringify(dataset));

	Object.keys(datasetAsObj).forEach((key) => {
		if (key.startsWith('v-')) {
			delete datasetAsObj[key];
		}
	});

	return datasetAsObj;
}

const FIXED_OFFSET = 5;

function getRects(
	elements: HTMLElement[],
	prop: 'top' | 'bottom',
	comparator?: '+' | '-',
	topOffset: number = 0,
	boundaryOffset: number = 0
) {
	// const start = performance.now();
	const map = new Map<string, number>();
	for (let i = 0; i < elements.length; i++) {
		const rectProp = elements[i].getBoundingClientRect()[prop];
		const condition =
			comparator === '+'
				? rectProp >= topOffset + FIXED_OFFSET + boundaryOffset
				: comparator === '-'
				? rectProp <= topOffset + FIXED_OFFSET + boundaryOffset
				: true; // Get both positive and negative
		if (condition) {
			map.set(elements[i].id, elements[i].getBoundingClientRect()[prop]);
		}
	}
	// console.log('getRects:', `${performance.now() - start}ms`);
	return map;
}

/**
 * This function gets all target ids that would be excluded from
 * the highlight process at the bottom of the page.
 *
 * Called onResize, onMount and whenever the user array changes.
 */
function setUnreachIds(target: Ref<string[]>, sortedTargets: HTMLElement[]) {
	const unreachIds: string[] = [];

	const root = document.documentElement;
	const scrollStart = root.scrollHeight - root.clientHeight - root.scrollTop;

	Array.from(getRects(sortedTargets, 'top').values()).forEach((value, index) => {
		if (value >= scrollStart) {
			unreachIds.push(sortedTargets[index].id);
		}
	});

	target.value = unreachIds;
}

export function useActiveTitle(
	userIds: string[] | Ref<string[]> = [],
	{
		jumpToFirst = defaultOpts.jumpToFirst,
		jumpToLast = defaultOpts.jumpToLast,
		debounce = defaultOpts.debounce,
		topOffset = defaultOpts.topOffset,
		minWidth = defaultOpts.minWidth,
		boundaryOffset: {
			toTop = defaultOpts.boundaryOffset.toTop,
			toBottom = defaultOpts.boundaryOffset.toTop,
		} = defaultOpts.boundaryOffset,
	}: UseActiveTitleOptions = defaultOpts
): UseActiveTitleReturn {
	// Internal
	const sortedTargets = ref<HTMLElement[]>([]);
	const sortedIds = computed(() => sortedTargets.value.map(({ id }) => id));
	const unreachIds = ref<string[]>([]);
	const scheduledId = ref('');

	// Returned values
	const activeId = ref('');
	const activeDataset = computed<Dataset>(() =>
		getDataset(sortedTargets.value.find(({ id }) => id === activeId.value)?.dataset)
	);
	const activeIndex = computed(() => sortedIds.value.indexOf(activeId.value));

	// Returned function
	function setUnreachable(id: string) {
		if (unreachIds.value.includes(id) && id !== activeId.value) {
			scheduledId.value = id;
		}
	}

	// Runs onMount and whenever the user array changes
	function setTargets() {
		const targets = <HTMLElement[]>[];

		// Get fresh targets
		unref(userIds).forEach((id) => {
			const target = document.getElementById(id);
			if (target) {
				targets.push(target);
			}
		});

		// Sort targets by DOM order
		targets.sort((a, b) => a.offsetTop - b.offsetTop);
		sortedTargets.value = targets;
	}

	onMounted(() => {
		setTargets();
		setUnreachIds(unreachIds, sortedTargets.value);

		const hashTarget = sortedTargets.value.find(({ id }) => id === location.hash.slice(1))?.id;

		// Set first target as active if jumpToFirst is true
		if (jumpToFirst && !hashTarget && document.documentElement.scrollTop <= 0) {
			return (activeId.value = sortedTargets.value[0]?.id ?? '');
		}

		if (hashTarget && unreachIds.value.includes(hashTarget)) {
			return (scheduledId.value = hashTarget);
		}

		onScrollDown();
	});

	watch(
		userIds,
		() => {
			setTargets();
			setUnreachIds(unreachIds, sortedTargets.value);
		},
		{ flush: 'post' }
	);

	/**
	 * getRects(top, -) -> Gets all top sides of titles that LEFT the viewport.
	 *
	 * Since map respects DOM order the LAST value is the latest target that
	 * left the top of the viewport and it will be set as active (newActiveId).
	 */
	function onScrollDown() {
		const boundaryOffset = Math.abs(toBottom || 0);

		// Prevent to set first target as active until a title actually leaves the viewport.
		if (
			!jumpToFirst &&
			!activeId.value &&
			getRects(sortedTargets.value, 'top', '-', topOffset, boundaryOffset).size <= FIXED_OFFSET
		) {
			return (activeId.value = '');
		}

		const newActiveId =
			Array.from(
				getRects(sortedTargets.value, 'top', '-', topOffset, boundaryOffset).keys()
			).pop() ?? '';

		// Prevent to set PREV targets as active on smoothscroll/overscroll side effects.
		if (sortedIds.value.indexOf(newActiveId) > sortedIds.value.indexOf(activeId.value)) {
			activeId.value = newActiveId;
		}
	}

	/**
	 * getRects(bottom, +) -> Get all bottom sides of titles that ENTERED the viewport.
	 *
	 * FIRST value is always the latest target that entered the top of the viewport (newActiveId).
	 */
	function onScrollUp() {
		scheduledId.value = '';

		const boundaryOffset = Math.abs(toTop || -0) * -1;
		const newActiveId =
			getRects(sortedTargets.value, 'bottom', '+', topOffset, boundaryOffset).keys().next().value ??
			sortedIds.value[0];

		// Set activeIndex to -1 as soon as it is completely in the viewport (positive top side).
		if (!jumpToFirst && newActiveId === sortedIds.value[0]) {
			const newTopPos = getRects(sortedTargets.value, 'top').values().next().value ?? 0;
			if (newTopPos > FIXED_OFFSET + topOffset + boundaryOffset) {
				return (activeId.value = '');
			}
		}

		// Prevent to set NEXT targets as active on smoothscroll/overscroll side effects.
		if (sortedIds.value.indexOf(newActiveId) < sortedIds.value.indexOf(activeId.value)) {
			activeId.value = newActiveId;
		}
	}

	const { viewportWidth } = useResize({
		minWidth,
		setUnreachIds: () => setUnreachIds(unreachIds, sortedTargets.value),
	});

	const { isBottomReached } = useScroll({
		userIds,
		onScrollUp,
		onScrollDown,
		viewportWidth,
		debounce,
		minWidth,
	});

	watch([isBottomReached, scheduledId], ([newIsBottomReached, newScheduledId]) => {
		if (newIsBottomReached && newScheduledId) {
			console.log('Scheduled unreachable', newScheduledId);
			console.log('Bottom reached, scheduled set.');
			return (activeId.value = newScheduledId);
		}
		if (newIsBottomReached && jumpToLast && !newScheduledId && unreachIds.value.length > 0) {
			console.log('Bottom reached, jumpToLast active, setting last unreachable.');
			return (activeId.value = unreachIds.value[unreachIds.value.length - 1]);
		}
	});

	return {
		activeId,
		activeIndex,
		activeDataset,
		isBottomReached,
		setUnreachable,
	};
}
