import { ref, Ref, onMounted, computed, unref, watch, nextTick } from 'vue';
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

	// Exclude any 'data-v'
	Object.keys(datasetAsObj).forEach((key) => {
		if (key.startsWith('v-')) {
			delete datasetAsObj[key];
		}
	});

	return datasetAsObj;
}

const FIXED_OFFSET = 5;

// Used to track targets distance from viewport
function getRects(
	elements: HTMLElement[],
	prop: 'top' | 'bottom',
	comparator?: '+' | '-',
	topOffset: number = 0,
	boundaryOffset: number = 0
) {
	const start = performance.now();

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
 * This function gets 'in advance' all target ids that would be
 * excluded from the highlight process at the bottom of the page.
 *
 * Called onResize, onMount and whenever the user array changes.
 */
function setUnreachableIds(target: Ref<string[]>, sortedTargets: HTMLElement[]) {
	const reachableIds: string[] = [];
	const unreachableIds: string[] = [];

	const root = document.documentElement;
	const scrollStart = root.scrollHeight - root.clientHeight - root.scrollTop;

	// Get all IDs that are unreachable
	Array.from(getRects(sortedTargets, 'top').values()).forEach((value, index) => {
		if (value >= scrollStart) {
			unreachableIds.push(sortedTargets[index].id);
		} else {
			reachableIds.push(sortedTargets[index].id);
		}
	});

	// Check if the prev one is half-reachable, and add it to the array as well
	const prevTarget = reachableIds[reachableIds.length - 1];
	const rect = document.getElementById(prevTarget)?.getBoundingClientRect();
	if (rect && rect.bottom > scrollStart && rect.top < scrollStart) {
		// console.log('halfReachable', prevTarget);
		unreachableIds.unshift(prevTarget);
	}

	// console.log('anyUnreachable', unreachableIds);
	target.value = unreachableIds;
}

export function useActiveTitle(
	userIds: string[] | Ref<string[]>,
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
	const unreachableIds = ref<string[]>([]);
	const scheduledId = ref('');

	// Returned values
	const activeId = ref('');
	const activeDataset = computed<Dataset>(() =>
		getDataset(sortedTargets.value.find(({ id }) => id === activeId.value)?.dataset)
	);
	const activeIndex = computed(() => sortedIds.value.indexOf(activeId.value));

	function setUnreachable(id: string) {
		nextTick(() => {
			if (unreachableIds.value.includes(id) && id !== activeId.value) {
				scheduledId.value = id;
			}
		});
	}

	// Runs onMount and whenever the user array changes
	function setTargets() {
		console.log('Refreshing targets');
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
		setUnreachableIds(unreachableIds, sortedTargets.value);

		const hashTarget = sortedTargets.value.find(({ id }) => id === location.hash.slice(1))?.id;

		// Set first target as active if jumpToFirst is true
		if (jumpToFirst && !hashTarget && document.documentElement.scrollTop <= 0) {
			return (activeId.value = sortedTargets.value[0]?.id ?? '');
		}

		if (hashTarget && unreachableIds.value.includes(hashTarget)) {
			return (scheduledId.value = hashTarget);
		}

		onScrollDown();
	});

	watch(userIds, () => setTargets(), { flush: 'post' });

	watch(
		scheduledId,
		(newId) => {
			if (
				typeof scheduledId.value === 'string' &&
				scheduledId.value !== '' &&
				isBottomReached.value
			) {
				activeId.value = newId;
			}
		},
		{ flush: 'post' }
	);

	/**
	 * getRects(top, -) -> Gets all top sides of titles that LEFT the viewport.
	 *
	 * Since map respects DOM order the LAST value is the first target that
	 * left the top of the viewport and it will be set as active.
	 *
	 * This function is also called onMount, onResize and onScrollDown.
	 */
	function onScrollDown({ isResize } = { isResize: false }) {
		const boundaryOffset = Math.abs(toBottom || 0);
		/**
		 * When jumpToFirst is false, this condition prevents to set the first target
		 * as active until a title actually leaves the viewport.
		 */
		if (
			!jumpToFirst &&
			activeId.value === '' &&
			getRects(sortedTargets.value, 'top', '-', topOffset, boundaryOffset).size <= 0
		) {
			return (activeId.value = '');
		}

		// Common behavior - Get last item that leaves the viewport from its top edge
		const newActiveId =
			Array.from(
				getRects(sortedTargets.value, 'top', '-', topOffset, boundaryOffset).keys()
			).pop() ?? '';

		if (!isResize) {
			// Prevent to set PREV targets as active on smoothscroll/overscroll side effects.
			if (sortedIds.value.indexOf(newActiveId) > sortedIds.value.indexOf(activeId.value)) {
				activeId.value = newActiveId;
			}
		} else {
			activeId.value = newActiveId;
		}
	}

	/**
	 * getRects(bottom, +) -> Get all bottom sides of titles that ENTERED the viewport.
	 *
	 * Since map respects DOM order the FIRST value is always the first target
	 * that entered the top of the viewport and it will be set as active.
	 */
	function onScrollUp() {
		// Reset any unreachable scheduled ID
		if (scheduledId.value) {
			return (scheduledId.value = '');
		}

		const boundaryOffset = Math.abs(toTop || -0) * -1;

		// Common behavior - Get first item that enters the viewport from its bottom side
		const newActiveId =
			getRects(sortedTargets.value, 'bottom', '+', topOffset, boundaryOffset).keys().next().value ??
			sortedIds.value[0];

		/**
		 * If jumpToFirst is false, and the first title is in the viewport,
		 * we set activeIndex to -1 as soon as it is completely in the viewport (positive top side).
		 */
		if (!jumpToFirst && newActiveId === sortedIds.value[0]) {
			const newActiveTopPos = getRects(sortedTargets.value, 'top').values().next().value ?? 0;
			if (newActiveTopPos > FIXED_OFFSET + topOffset + boundaryOffset) {
				return (activeId.value = '');
			}
		}

		// Prevent to set NEXT targets as active on smoothscroll/overscroll side effects.
		if (sortedIds.value.indexOf(newActiveId) < sortedIds.value.indexOf(activeId.value)) {
			activeId.value = newActiveId;
		}
	}

	function onBottomReached() {
		// If jumpToLast is true and no scheduled unreachable ID is set, set the last unreachabe ID as active.
		if (jumpToLast && unreachableIds.value.length > 0 && !scheduledId.value) {
			console.log('Setting last from onBottomReached!');
			return (activeId.value = unreachableIds.value[unreachableIds.value.length - 1]);
		}

		/**
		 * If there's a scheduled unreachable ID from outside, set it as active.
		 * This occurs whenever an eligible unreachable ID is scheduled
		 * from inside (hash onMount) or outside (user click).
		 */
		if (typeof scheduledId.value === 'string' && scheduledId.value !== '') {
			activeId.value = scheduledId.value;
		}
	}

	const { viewportWidth } = useResize({
		minWidth,
		setUnreachableIds: () => setUnreachableIds(unreachableIds, sortedTargets.value),
		onScrollDown: () => onScrollDown({ isResize: true }),
		onScrollUp,
	});

	const { isBottomReached } = useScroll({
		userIds,
		viewportWidth,
		debounce,
		minWidth,
		onScrollDown,
		onScrollUp,
		onBottomReached,
	});

	return {
		activeId,
		activeIndex,
		activeDataset,
		isBottomReached,
		setUnreachable,
	};
}
