import { ref, Ref, onMounted, isRef, shallowRef, computed, watch, nextTick } from 'vue';
import { UseHighlightOptions } from './types';
import { useResize, useScroll } from './internalComposables';

type Dataset = Record<string, string>;

// Value in px to ensure that the section is highlighted
const OFFSET = 10;
const BACK_TO_TOP_OFFSET = 10;

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
	offset: number = OFFSET
) {
	const map = new Map<number, number>();
	for (let i = 0; i < elements.length; i++) {
		const rectProp = elements[i].getBoundingClientRect()[prop];
		const condition =
			comparator === '+' ? rectProp >= offset : comparator === '-' ? rectProp <= offset : true;
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
	// Maybe place those values in a shared reactive and update them on resize.
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
	{ topOffset = 0, debounce = 0, jumpToFirst = true, jumpToLast = true }: UseHighlightOptions
) {
	// Internal refs
	const userElements = isRef(refs) ? refs : shallowRef([]);
	const scheduledIndex = ref(-1);

	// Returned values
	const unreachableIndices = ref<number[]>([]);
	const activeIndex = ref(-1);
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

	// Hooks
	onMounted(() => {
		if (typeof refs === 'string') {
			(userElements as Ref<HTMLElement[]>).value = Array.from(document.querySelectorAll(refs));
		}

		// Works always and sets activeIndex to 0 if jumpToFirst is true
		if (jumpToFirst && document.documentElement.scrollTop <= 10) {
			return (activeIndex.value = 0);
		}
	});

	watch(
		() => userElements.value.length,
		() => {
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
	 * Rects notes
	 * - getRects(top, -) -> get all titles that are above the viewport, used onScrollDown.
	 * Since map order resposcts DOM order the LAST value is the nearest to the top of the viewport.
	 *
	 *
	 * - getRects(bottom, +) -> get all titles that entered the viewport, used onScrollUp.
	 * We target the bottom side of the title so that result is returned as soon as it enters the viewport.
	 * Since map order resposcts DOM order the FIRST value is always the nearest to top of the viewport.
	 */

	function onScrollDown() {
		/**
		 * This condition prevents to set the first index as active until a title actually
		 * leaves the viewport. Used when jumpToFirst is false.
		 */
		if (
			!jumpToFirst &&
			activeIndex.value === -1 &&
			getRects(userElements.value, 'top', '-').size <= 0
		) {
			return (activeIndex.value = -1);
		}
		// Common behavior - Get last item that leaves the viewport from its top edge
		activeIndex.value = Array.from(getRects(userElements.value, 'top', '-').keys()).pop() ?? 0;
	}

	function onScrollUp() {
		scheduledIndex.value = -1;
		// Common behavior - Get first item that enters the viewport from its bottom edge
		const newActiveIndex = getRects(userElements.value, 'bottom', '+').keys().next().value ?? 0;

		/**
		 * If jumpToFirst is false, and the first title is in the viewport,
		 * we set activeIndex to -1 as soon as it is completely in the viewport (top edge positive).
		 */
		if (!jumpToFirst && newActiveIndex === 0) {
			const newActiveTopPos = getRects(userElements.value, 'top').values().next().value ?? 0;
			if (newActiveTopPos > BACK_TO_TOP_OFFSET) {
				return (activeIndex.value = -1);
			}
		}

		/**
		 * Else set the first item that enters the viewport.
		 * This condition prevents to set next indexes as active when scrolling up fast
		 * and smoothscroll is active.
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

	useResize(setUnreachables, onScrollDown);

	const { isBottomReached } = useScroll(userElements, document.documentElement, {
		onScrollDown,
		onScrollUp,
		onBottomReached,
		debounce,
	});

	return {
		activeIndex,
		dataset,
		unreachableIndices,
		isBottomReached,
		setUnreachable,
	};
}
