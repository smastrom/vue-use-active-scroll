import { ref, Ref, onMounted, isRef, shallowRef, computed, watch } from 'vue';
import { UseHighlightOptions } from './types';
import { useScroll } from './useScroll';

type Dataset = Record<string, string>;

// Value in px to ensure that the section is highlighted
const OFFSET = 10;
const BACK_TO_TOP_OFFSET = 10;

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
			// eslint-disable-next-line no-nested-ternary
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
function getUnreachables(elements: HTMLElement[]) {
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

	return unreachables;
}

export function useHighlight(
	refs: Ref<HTMLElement[]> | string,
	{
		topOffset, // Ok
		debounce = 0, // Ok
		jumpToFirst = true, // Ok
		jumpToLast = true, // Ok
	}: UseHighlightOptions
) {
	const userElements = isRef(refs) ? refs : shallowRef([]);
	const scheduledIndex = ref(-1);

	/** Return values */
	const unreachableIndices = ref<number[]>([]);
	const activeIndex = ref(-1);
	const dataset = computed<Dataset>(() => {
		const activeElement = userElements.value[activeIndex.value];
		if (!activeElement) {
			return {};
		}

		return getDataset(activeElement.dataset);
	});

	onMounted(() => {
		if (typeof refs === 'string') {
			(userElements as Ref<HTMLElement[]>).value = Array.from(document.querySelectorAll(refs));
		}

		unreachableIndices.value = getUnreachables(userElements.value);

		if (jumpToFirst && document.documentElement.scrollTop <= 10) {
			return (activeIndex.value = 0);
		}
	});

	const { isBottomReached } = useScroll(document.documentElement, {
		onScrollDown() {
			console.log('Scrolling Down');
			if (
				!jumpToFirst &&
				activeIndex.value === -1 &&
				getRects(userElements.value, 'top', '-').size <= 0
			) {
				return (activeIndex.value = -1);
			}
			activeIndex.value = Array.from(getRects(userElements.value, 'top', '-').keys()).pop() ?? 0;
		},
		onScrollUp() {
			scheduledIndex.value = -1;
			const newActiveIndex = getRects(userElements.value, 'bottom', '+').keys().next().value ?? 0;

			if (!jumpToFirst && newActiveIndex === 0) {
				const newActiveTopPos = getRects(userElements.value, 'top').values().next().value ?? 0;
				if (newActiveTopPos > BACK_TO_TOP_OFFSET) {
					return (activeIndex.value = -1);
				}
			}

			if (newActiveIndex < activeIndex.value) {
				activeIndex.value = newActiveIndex;
			}
		},
		onBottomReached() {
			console.log('Bottom reached');
			if (jumpToLast && unreachableIndices.value.length > 0 && scheduledIndex.value === -1)
				return (activeIndex.value = unreachableIndices.value[unreachableIndices.value.length - 1]);

			if (scheduledIndex.value !== -1) {
				activeIndex.value = scheduledIndex.value;
			}
		},
		debounce,
	});

	watch(
		() => scheduledIndex.value,
		(newValue) => {
			if (newValue !== -1 && isBottomReached.value) {
				activeIndex.value = newValue;
			}
		},
		{ flush: 'post' }
	);

	function setUnreachable(index: number) {
		if (unreachableIndices.value.includes(index) && index !== activeIndex.value) {
			scheduledIndex.value = index;
		}
	}

	return {
		activeIndex,
		dataset,
		unreachableIndices,
		isBottomReached,
		setUnreachable,
	};
}

export function getDataset(dataset: DOMStringMap): Record<string, string> {
	const datasetAsObj = JSON.parse(JSON.stringify(dataset));

	// Exclude any 'data-v'
	Object.keys(datasetAsObj).forEach((key) => {
		if (key.startsWith('v-')) {
			delete datasetAsObj[key];
		}
	});

	return datasetAsObj;
}
