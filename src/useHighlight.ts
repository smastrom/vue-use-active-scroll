import { ref, Ref, onMounted, isRef, computed, watch, nextTick } from 'vue';
import { UseHighlightOptions } from './types';
import { useResize, useScroll } from './internalComposables';

type Dataset = Record<string, string>;

/**
 * This is a fixed value of 20px used when jumpToTop is false,
 * it prevents that the first section is marked as inactive
 * maybe "too soon".
 */

const BACK_TO_TOP_OFFSET = 20;

export function getDataset(dataset: DOMStringMap): Dataset {
	const datasetAsObj = JSON.parse(JSON.stringify(dataset));

	// Exclude any 'data-v'
	Object.keys(datasetAsObj).forEach((key) => {
		if (key.startsWith('v-')) {
			delete datasetAsObj[key];
		}
	});

	return datasetAsObj;
}

function getRects(
	elements: HTMLElement[],
	prop: 'top' | 'bottom',
	comparator?: '+' | '-',
	userOffset: number = 0
) {
	const map = new Map<number, number>();
	for (let i = 0; i < elements.length; i++) {
		const rectProp = elements[i].getBoundingClientRect()[prop];
		const condition =
			comparator === '+'
				? rectProp >= userOffset
				: comparator === '-'
				? rectProp <= userOffset
				: true;
		if (condition) {
			map.set(i, elements[i].getBoundingClientRect()[prop]);
		}
	}
	return map;
}

/**
 * This function gets 'in advance' all section indices that would be
 * excluded from the highlight process at the bottom of the page.
 */
function _setUnreachables(target: Ref<number[]>, elements: HTMLElement[]) {
	const unreachables: number[] = [];
	const root = document.documentElement;
	// This works at any point of the page
	const scrollStart = root.scrollHeight - root.clientHeight - root.scrollTop;

	// Get all indexes that are unreachable
	Array.from(getRects(elements, 'top').values()).forEach((value, index) => {
		if (value > scrollStart) {
			unreachables.push(index);
		}
	});

	target.value = unreachables;
}

export function useHighlight(
	refs: Ref<HTMLElement[]> | string,
	{
		topOffset: userOffset = 100,
		debounce = 0,
		jumpToFirst = true,
		jumpToLast = true,
	}: UseHighlightOptions
) {
	// Internal refs
	const fakeRefs: { value: HTMLElement[] } = { value: [] };
	const userElements = isRef(refs) ? refs : fakeRefs;
	const scheduledIndex = ref(-1);

	// Returned values
	const unreachableIndices = ref<number[]>([]);
	const activeIndex = ref(-1);
	const activeId = computed(() => userElements.value[activeIndex.value]?.id || '');
	const dataset = computed<Dataset>(() => {
		const activeElement = userElements.value[activeIndex.value];
		if (!activeElement) {
			return {};
		}
		return getDataset(activeElement.dataset);
	});

	function setUnreachable(index: number) {
		nextTick(() => {
			if (unreachableIndices.value.includes(index) && index !== activeIndex.value) {
				scheduledIndex.value = index;
			}
		});
	}

	onMounted(() => {
		// Get them here as there's nothing to watch against in order to keep them reactive.
		if (typeof refs === 'string') {
			(userElements as Ref<HTMLElement[]>).value = Array.from(document.querySelectorAll(refs));
		}

		// Sets activeIndex to 0 if jumpToFirst is true, even if scrolled for 20px
		if (jumpToFirst && document.documentElement.scrollTop <= BACK_TO_TOP_OFFSET) {
			return (activeIndex.value = 0);
		}

		// Autmatically set any unreachable index from hash as active
		const unreachableFromHash = userElements.value.findIndex(
			({ id }) => id === window.location.hash.slice(1)
		);
		setUnreachable(unreachableFromHash);
	});

	watch(
		[() => userElements.value.length, () => typeof refs],
		() => {
			/**
			 * This runs onMount as well also when user is using selectors.
			 * We reorder the elements by their offsetTop position as
			 * it may not be guaranteed according to vue template refs docs.
			 */

			userElements.value.sort((a, b) => a.offsetTop - b.offsetTop);
			setUnreachables();
		},
		{ immediate: true, flush: 'post' }
	);

	watch(
		() => scheduledIndex.value,
		(newValue) => {
			if (newValue !== -1 && isBottomReached.value) {
				activeIndex.value = newValue;
			}
		},
		{ flush: 'post' }
	);

	// Internal Handlers
	function setUnreachables() {
		_setUnreachables(unreachableIndices, userElements.value);
	}

	/**
	 * - getRects(top, -) -> get all titles that are above the viewport, used onScrollDown.
	 * Since map order respects DOM order the LAST value is the nearest to the top of the viewport.
	 *
	 * - getRects(bottom, +) -> get all titles that entered the viewport, used onScrollUp.
	 * We target the bottom side of the title so that result is returned as soon as it enters the viewport.
	 * Since map order respects DOM order the FIRST value is always the nearest to top of the viewport.
	 */

	function onScrollDown({ isResize } = { isResize: false }) {
		/**
		 * This condition prevents to set the first index as active until a title actually
		 * leaves the viewport. Used when jumpToFirst is false.
		 */
		if (
			!jumpToFirst &&
			activeIndex.value === -1 &&
			getRects(userElements.value, 'top', '-', userOffset).size <= 0
		) {
			return (activeIndex.value = -1);
		}
		// Common behavior - Get last item that leaves the viewport from its top edge
		const newActiveIndex =
			Array.from(getRects(userElements.value, 'top', '-', userOffset).keys()).pop() ?? 0;

		if (!isResize) {
			/**
			 * This condition prevents to set PREV indexes as active for when scrolling down
			 * with smoothscroll is active.
			 */
			if (newActiveIndex > activeIndex.value) {
				activeIndex.value = newActiveIndex;
			}
		} else {
			activeIndex.value = newActiveIndex;
		}
	}

	function onScrollUp() {
		// Reset any scheduled index
		scheduledIndex.value = -1;
		// Common behavior - Get first item that enters the viewport from its bottom edge
		const newActiveIndex =
			getRects(userElements.value, 'bottom', '+', userOffset).keys().next().value ?? 0;

		/**
		 * If jumpToFirst is false, and the first title is in the viewport,
		 * we set activeIndex to -1 as soon as it is completely in the viewport (top edge positive).
		 */
		if (!jumpToFirst && newActiveIndex === 0) {
			const newActiveTopPos = getRects(userElements.value, 'top').values().next().value ?? 0;
			if (newActiveTopPos > BACK_TO_TOP_OFFSET + userOffset) {
				return (activeIndex.value = -1);
			}
		}

		/**
		 * This condition prevents to set NEXT indexes as active when scrolling up
		 * with smoothscroll is active.
		 */
		if (newActiveIndex < activeIndex.value) {
			activeIndex.value = newActiveIndex;
		}
	}

	function onBottomReached() {
		// If jumpToLast is true and no scheduled index is set, set the last unreachabe index one as active.
		if (jumpToLast && unreachableIndices.value.length > 0 && scheduledIndex.value === -1)
			return (activeIndex.value = unreachableIndices.value[unreachableIndices.value.length - 1]);

		/**
		 * If there's a scheduled index from outside, set it as active.
		 * This occurse whenever user triggers setUnreachable.
		 */
		if (scheduledIndex.value !== -1) {
			activeIndex.value = scheduledIndex.value;
		}
	}

	useResize(setUnreachables, () => onScrollDown({ isResize: true }));

	const { isBottomReached } = useScroll(userElements, {
		onScrollDown,
		onScrollUp,
		onBottomReached,
		debounce,
	});

	return {
		activeIndex,
		activeId,
		dataset,
		unreachableIndices,
		isBottomReached,
		setUnreachable,
	};
}
