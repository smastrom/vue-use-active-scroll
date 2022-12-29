import { ref, Ref, onMounted, isRef, computed, unref, watch, nextTick, watchPostEffect } from 'vue';
import { UseHighlightOptions } from './types';
import { useResize, useScroll } from './internalComposables';

type Dataset = Record<string, string>;

/**
 * This is a fixed value of 20px used when jumpToTop is false,
 * it prevents the first section to be marked as inactive
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
	const map = new Map<string, number>();
	for (let i = 0; i < elements.length; i++) {
		const rectProp = elements[i].getBoundingClientRect()[prop];
		const condition =
			comparator === '+'
				? rectProp >= userOffset
				: comparator === '-'
				? rectProp <= userOffset
				: true; // Get both positive and negative
		if (condition) {
			map.set(elements[i].id, elements[i].getBoundingClientRect()[prop]);
		}
	}
	return map;
}

/**
 * This function gets 'in advance' all target ids that would be
 * excluded from the highlight process at the bottom of the page.
 *
 * Used onResize and whenever the user array changes.
 */
function setUnreachableIds(target: Ref<string[]>, sortedTargets: HTMLElement[]) {
	const unreachableIds: string[] = [];
	const root = document.documentElement;
	// This works at any point of the page
	const scrollStart = root.scrollHeight - root.clientHeight - root.scrollTop;

	// Get all IDs that are unreachable
	Array.from(getRects(sortedTargets, 'top').values()).forEach((value, index) => {
		if (value > scrollStart) {
			unreachableIds.push(sortedTargets[index].id);
		}
	});

	target.value = unreachableIds;
}

export function useHighlight(
	userIds: Ref<string[]> | string[],
	{
		topOffset: userOffset = 100,
		debounce = 0,
		jumpToFirst = true,
		jumpToLast = true,
	}: UseHighlightOptions
) {
	// Internal
	const _userIds = computed<string[]>(() => unref(userIds));
	const sortedTargets = ref<HTMLElement[]>([]);
	const sortedIds = computed(() => sortedTargets.value.map(({ id }) => id));
	const unreachableIds = ref<string[]>([]);
	const scheduledId = ref('');

	// Returned values
	const activeId = ref('');
	const dataset = computed<Dataset>(() => {
		const activeElement = sortedTargets.value.find(({ id }) => id === activeId.value);
		if (!activeElement) {
			return {};
		}
		return getDataset(activeElement.dataset);
	});
	const activeIndex = computed(() => sortedIds.value.indexOf(activeId.value));

	function setUnreachable(id: string) {
		nextTick(() => {
			console.log(id);
			if (unreachableIds.value.includes(id) && id !== activeId.value) {
				scheduledId.value = id;
			}
		});
	}

	watch(
		() => _userIds.value,
		(newIds) => {
			nextTick(() => {
				// Get fresh targets
				sortedTargets.value = [];
				newIds.forEach((id) => {
					const target = document.getElementById(id);

					if (target) {
						sortedTargets.value.push(target);
					}
				});

				// Sort targets by DOM order
				sortedTargets.value.sort((a, b) => a.offsetTop - b.offsetTop);

				// Set fresh unreachable IDs
				setUnreachableIds(unreachableIds, sortedTargets.value);
			});
		},
		{ immediate: true }
	);

	onMounted(() => {
		nextTick(() => {
			// Sets activeId to first if jumpToFirst is true, even if scrolled for 20px
			if (jumpToFirst && document.documentElement.scrollTop <= BACK_TO_TOP_OFFSET) {
				return (activeId.value = sortedTargets.value[0].id);
			}

			// This properly sets as active any unreachable target on page load, if included in the hash
			const unreachableIdFromHash = sortedTargets.value.find(
				({ id }) => id === window.location.hash.slice(1)
			);
			setUnreachable(unreachableIdFromHash?.id || '');
		});
	});

	watch(
		() => scheduledId.value,
		(newValue) => {
			if (newValue !== '' && isBottomReached.value) {
				activeId.value = newValue;
			}
		},
		{ flush: 'post' }
	);

	/**
	 * - getRects(top, -) -> get all titles that are above the viewport, used onScrollDown and onResize.
	 * Since map order respects DOM order the LAST value is the nearest to the top of the viewport.
	 *
	 * - getRects(bottom, +) -> get all titles that entered the viewport, used onScrollUp.
	 * We target the bottom side of the title so that result is returned as soon as it enters the viewport.
	 * Since map order respects DOM order the FIRST value is always the nearest to top of the viewport.
	 */

	function onScrollDown({ isResize } = { isResize: false }) {
		/**
		 * When jumpToFirst is false, this condition prevents to set the first target
		 * as active until a title actually leaves the viewport.
		 */
		if (
			!jumpToFirst &&
			activeId.value === '' &&
			getRects(sortedTargets.value, 'top', '-', userOffset).size <= 0
		) {
			return (activeId.value = sortedTargets.value[0].id);
		}

		// Common behavior - Get last item that leaves the viewport from its top edge
		const newActiveId =
			Array.from(getRects(sortedTargets.value, 'top', '-', userOffset).keys()).pop() ?? '';

		if (!isResize) {
			/**
			 * This condition prevents to set PREV targets as active for when scrolling down
			 * with smoothscroll is active.
			 */
			if (sortedIds.value.indexOf(newActiveId) > sortedIds.value.indexOf(activeId.value)) {
				activeId.value = newActiveId;
			}
		} else {
			activeId.value = newActiveId;
		}
	}

	function onScrollUp() {
		// Reset any unreachable scheduled id
		scheduledId.value = '';

		// Common behavior - Get first item that enters the viewport from its bottom edge
		const newActiveId =
			getRects(sortedTargets.value, 'bottom', '+', userOffset).keys().next().value ??
			sortedIds.value[0];

		/**
		 * If jumpToFirst is false, and the first title is in the viewport,
		 * we set activeIndex to -1 as soon as it is completely in the viewport (top edge positive).
		 */
		if (!jumpToFirst && newActiveId === sortedIds.value[0]) {
			const newActiveTopPos = getRects(sortedTargets.value, 'top').values().next().value ?? 0;
			if (newActiveTopPos > BACK_TO_TOP_OFFSET + userOffset) {
				return (activeId.value = '');
			}
		}

		/**
		 * This condition prevents to set NEXT targets as active when scrolling up
		 * with smoothscroll is active.
		 */
		if (sortedIds.value.indexOf(newActiveId) < sortedIds.value.indexOf(activeId.value)) {
			activeId.value = newActiveId;
		}
	}

	function onBottomReached() {
		// If jumpToLast is true and no scheduled unreachable ID is set, set the last unreachabe ID as active.
		if (jumpToLast && unreachableIds.value.length > 0 && !scheduledId.value) {
			return (activeId.value = unreachableIds.value[unreachableIds.value.length - 1]);
		}

		/**
		 * If there's a scheduled unreachable ID from outside, set it as active.
		 * This occurs whenever user calls setUnreachable.
		 */
		if (scheduledId.value !== '') {
			activeId.value = scheduledId.value;
		}
	}

	useResize(
		() => setUnreachableIds(unreachableIds, sortedTargets.value),
		() => onScrollDown({ isResize: true })
	);

	const { isBottomReached } = useScroll(sortedTargets, {
		onScrollDown,
		onScrollUp,
		onBottomReached,
		debounce,
	});

	return {
		activeIndex,
		activeId,
		dataset,
		unreachableIds,
		isBottomReached,
		setUnreachable,
	};
}
