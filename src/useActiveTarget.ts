import { ref, Ref, onMounted, computed, unref, watch } from 'vue';
import { useWidth } from './useWidth';
import { useScroll } from './useScroll';
import { useIdle } from './useIdle';
import { getDataset, IDLE_TIME, getRects, getEdges } from './utils';

// https://github.com/microsoft/TypeScript/issues/28374#issuecomment-538052842
type DeepNonNullable<T> = { [P in keyof T]-?: NonNullable<T[P]> } & NonNullable<T>;

type UseActiveTitleOptions = {
	jumpToFirst?: boolean;
	jumpToLast?: boolean;
	overlayHeight?: number;
	minWidth?: number;
	boundaryOffset?: {
		toTop?: number;
		toBottom?: number;
	};
};

type UseActiveTitleReturn = {
	activeId: Ref<string>;
	activeDataset: Ref<Record<string, string>>;
	activeIndex: Ref<number>;
	setActive: (id: string) => void;
};

const defaultOpts: DeepNonNullable<UseActiveTitleOptions> = {
	jumpToFirst: true,
	jumpToLast: true,
	overlayHeight: 0,
	minWidth: 0,
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
		boundaryOffset: {
			toTop = defaultOpts.boundaryOffset.toTop,
			toBottom = defaultOpts.boundaryOffset.toTop,
		} = defaultOpts.boundaryOffset,
	}: UseActiveTitleOptions = defaultOpts
): UseActiveTitleReturn {
	// Internal
	const targets = ref<HTMLElement[]>([]);
	const iDs = computed(() => targets.value.map(({ id }) => id));

	const width = useWidth();
	const isIdle = useIdle(IDLE_TIME);

	let isClick: boolean;
	let clickTimer: NodeJS.Timeout;
	const rBounds = {
		toTop: 0,
		toBottom: 0,
	};

	// Returned values
	const activeId = ref('');
	const activeIndex = computed(() => iDs.value.indexOf(activeId.value));
	const activeDataset = computed(() =>
		getDataset(targets.value.find(({ id }) => id === activeId.value)?.dataset)
	);

	// Returned function
	function setActive(id: string) {
		if (id !== activeId.value) {
			isClick = true;
			activeId.value = id;
			console.log(isClick);
		}
	}

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
		const { isBottomReached, isTopReached } = getEdges();

		if (isTopReached && jumpToFirst) {
			activeId.value = iDs.value[0];
			return true;
		} else if (isBottomReached && jumpToLast) {
			activeId.value = iDs.value[iDs.value.length - 1];
			return true;
		}
	}

	onMounted(() => {
		setTargets();

		const hashId = targets.value.find(({ id }) => id === location.hash.slice(1))?.id;
		if (hashId) {
			return (activeId.value = hashId);
		}

		if (jumpToEdges()) {
			return;
		}

		setFirstOut();
	});

	watch(
		userIds,
		() => {
			setTargets();
		},
		{ flush: 'post' }
	);

	const isActive = true;
	const exceptFirst = true;
	watch(activeId, (newId) => {
		if (isActive) {
			const start = exceptFirst ? 0 : -1;
			const newHash = activeIndex.value > start ? `#${newId}` : '';
			history.replaceState(history.state, '', newHash);
		} else {
			history.replaceState(history.state, '', '');
		}
	});

	// Restores scroll settings, which are disabled when the user clicks
	function restoreSettings() {
		clickTimer = setTimeout(() => {
			rBounds.toTop = toTop as number;
			rBounds.toBottom = toBottom as number;
			isClick = false;
			console.log(isClick);
			console.log('Restored scroll settings.');
		}, IDLE_TIME);
	}

	// Sets first target that entered the top of the viewport.
	function setFirstIn() {
		const offset = overlayHeight + rBounds.toTop;
		const firstIn =
			getRects(targets.value, 'bottom', '>', offset).keys().next().value ?? iDs.value[0];

		// Prevent smoothscroll to set next targets while scrolling.
		if (iDs.value.indexOf(firstIn) < iDs.value.indexOf(activeId.value)) {
			activeId.value = firstIn;
		}
	}

	// Sets first target that left the top of the viewport.
	function setFirstOut() {
		const offset = overlayHeight + rBounds.toBottom;
		const firstOut =
			Array.from(getRects(targets.value, 'top', '<', offset).keys()).pop() ??
			(jumpToFirst ? iDs.value[0] : '');

		if (iDs.value.indexOf(firstOut) > iDs.value.indexOf(activeId.value)) {
			activeId.value = firstOut;
		}
	}

	function onScroll({ isDown } = { isDown: false }) {
		if (!isIdle.value) {
			console.log('No idle, canceling scroll handler');
			return;
		}

		function setTarget() {
			if (isDown) {
				setFirstOut();
			} else {
				setFirstIn();
			}

			jumpToEdges();
		}

		clearTimeout(clickTimer);

		if (!isClick) {
			setTarget();
		} else {
			// Continue when resuming scrolling just right after click
			document.addEventListener('wheel', setTarget, { once: true, passive: true });
		}

		restoreSettings();
	}

	useScroll({
		userIds,
		onScroll,
		width,
		minWidth,
	});

	return {
		activeId,
		activeIndex,
		activeDataset,
		setActive,
	};
}
