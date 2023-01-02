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
	overlayOffset?: number;
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
	overlayOffset: 0,
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
	const datasetAsObj = { ...dataset };

	Object.keys(datasetAsObj).forEach((key) => {
		if (key.startsWith('v-')) {
			delete datasetAsObj[key];
		}
	});

	return datasetAsObj as Dataset;
}

const FIXED_OFFSET = 5;

function getRects(
	targets: HTMLElement[],
	prop: 'top' | 'bottom',
	operator?: '>' | '<',
	userOffset = 0
) {
	const offset = FIXED_OFFSET + userOffset;
	const map = new Map<string, number>();

	targets.forEach((target) => {
		const rectProp = target.getBoundingClientRect()[prop];
		const condition =
			operator === '>' ? rectProp >= offset : operator === '<' ? rectProp <= offset : true;

		if (condition) {
			map.set(target.id, rectProp);
		}
	});

	return map;
}

/**
 * This function gets all target ids that would be excluded from
 * the highlight process at the bottom of the page.
 *
 * Called onResize, onMount and whenever the user array changes.
 */
function _setUnreachIds(target: Ref<string[]>, targets: HTMLElement[]) {
	const unreachIds: string[] = [];
	const root = document.documentElement;
	const scrollStart = root.scrollHeight - root.clientHeight - root.scrollTop;

	Array.from(getRects(targets, 'top').values()).forEach((value, index) => {
		if (value >= scrollStart) {
			unreachIds.push(targets[index].id);
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
		overlayOffset = defaultOpts.overlayOffset,
		minWidth = defaultOpts.minWidth,
		boundaryOffset: {
			toTop = defaultOpts.boundaryOffset.toTop,
			toBottom = defaultOpts.boundaryOffset.toTop,
		} = defaultOpts.boundaryOffset,
	}: UseActiveTitleOptions = defaultOpts
): UseActiveTitleReturn {
	// Internal
	const targets = ref<HTMLElement[]>([]);
	const iDs = computed(() => targets.value.map(({ id }) => id));
	const unreachIds = ref<string[]>([]);
	const scheduledId = ref('');

	// Returned values
	const activeId = ref('');
	const activeDataset = computed(() =>
		getDataset(targets.value.find(({ id }) => id === activeId.value)?.dataset)
	);
	const activeIndex = computed(() => iDs.value.indexOf(activeId.value));

	// Returned function
	function setUnreachable(id: string) {
		if (unreachIds.value.includes(id) && id !== activeId.value) {
			scheduledId.value = id;
		}
	}

	console.log('Ciao');

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

	function setUnreachIds() {
		_setUnreachIds(unreachIds, targets.value);
	}

	onMounted(() => {
		setTargets();
		setUnreachIds();

		const hashId = targets.value.find(({ id }) => id === location.hash.slice(1))?.id;

		// Set first target as active if jumpToFirst is true
		if (jumpToFirst && !hashId && window.scrollY <= FIXED_OFFSET) {
			return (activeId.value = targets.value[0]?.id ?? '');
		}

		if (hashId && unreachIds.value.includes(hashId)) {
			return (scheduledId.value = hashId);
		}

		onScrollDown();
	});

	watch(
		userIds,
		() => {
			setTargets();
			setUnreachIds();
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
		const offset = overlayOffset + Math.abs(toBottom || 0);

		// Prevent to set first target as active until a title actually leaves the viewport.
		if (
			!jumpToFirst &&
			!activeId.value &&
			getRects(targets.value, 'top', '<', offset).size <= FIXED_OFFSET
		) {
			return (activeId.value = '');
		}

		const newActiveId = Array.from(getRects(targets.value, 'top', '<', offset).keys()).pop() ?? '';

		// Prevent to set PREV targets as active on smoothscroll/overscroll side effects.
		if (iDs.value.indexOf(newActiveId) > iDs.value.indexOf(activeId.value)) {
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

		const offset = overlayOffset + Math.abs(toTop || -0) * -1;
		const newActiveId =
			getRects(targets.value, 'bottom', '>', offset).keys().next().value ?? iDs.value[0];

		// Set activeIndex to -1 as soon as it is completely in the viewport (positive top side).
		if (!jumpToFirst && newActiveId === iDs.value[0]) {
			const newTopPos = getRects(targets.value, 'top').values().next().value ?? 0;
			if (newTopPos > FIXED_OFFSET + offset) {
				return (activeId.value = '');
			}
		}

		// Prevent to set NEXT targets as active on smoothscroll/overscroll side effects.
		if (iDs.value.indexOf(newActiveId) < iDs.value.indexOf(activeId.value)) {
			activeId.value = newActiveId;
		}
	}

	const { viewportWidth } = useResize({
		minWidth,
		setUnreachIds,
	});

	const { isBottomReached } = useScroll({
		userIds,
		onScrollUp,
		onScrollDown,
		viewportWidth,
		debounce,
		minWidth,
	});

	watch([isBottomReached, scheduledId], ([_isBottomReached, _scheduledId]) => {
		if (_isBottomReached && _scheduledId) {
			return (activeId.value = _scheduledId);
		}
		if (_isBottomReached && jumpToLast && !_scheduledId && unreachIds.value.length > 0) {
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
