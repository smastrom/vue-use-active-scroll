import {
	ref,
	Ref,
	onMounted,
	computed,
	unref,
	watch,
	isRef,
	isReactive,
	onBeforeUnmount,
} from 'vue';
import { useScroll } from './useScroll';
import { getEdges, getRects, useRestrictedRef, isSSR, FIXED_TO_TOP_OFFSET } from './utils';

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
	userIds: string[] | Ref<string[]> = ref([]),
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
	const media = `(min-width: ${minWidth}px)`;

	// Internal
	const root = ref<HTMLElement | null>(null);
	const rootTop = ref(0);
	const targets = ref<HTMLElement[]>([]);
	const matchMedia = ref(isSSR || window.matchMedia(media).matches);

	const isHTML = computed(() => typeof rootId !== 'string');
	const ids = computed(() => targets.value.map(({ id }) => id));

	// Returned values
	const activeId = useRestrictedRef(matchMedia, '');
	const activeIndex = computed(() => ids.value.indexOf(activeId.value));

	// Runs onMount and whenever the user array changes
	function setTargets() {
		let _targets = <HTMLElement[]>[];

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
		const { isBottom, isTop } = getEdges(root.value!);

		if (jumpToFirst && isTop) {
			return (activeId.value = ids.value[0]), true;
		}
		if (jumpToLast && isBottom) {
			return (activeId.value = ids.value[ids.value.length - 1]), true;
		}
	}

	function _setActive(prevY: number, { isCancel } = { isCancel: false }) {
		const nextY = isHTML.value ? window.scrollY : root.value!.scrollTop;

		if (nextY === prevY) {
			return;
		}

		if (nextY < prevY) {
			onScrollUp();
		} else {
			onScrollDown({ isCancel });
		}

		if (!isCancel) {
			jumpToEdges();
		}
	}

	// Sets first target that LEFT the top
	function onScrollDown({ isCancel } = { isCancel: false }) {
		// overlayHeight not needed as 'scroll-margin-top' is set instead
		const offset = rootTop.value + toBottom!;
		const outTargets = Array.from(getRects(targets.value, 'OUT', offset).keys());
		const firstOut = outTargets[outTargets.length - 1] ?? (jumpToFirst ? ids.value[0] : '');

		// Prevent innatural highlighting with smoothscroll/custom easings
		if (ids.value.indexOf(firstOut) > ids.value.indexOf(activeId.value)) {
			return (activeId.value = firstOut);
		}

		if (isCancel) {
			activeId.value = firstOut;
		}
	}

	// Sets first target that ENTERED the top
	function onScrollUp() {
		const offset = overlayHeight + rootTop.value + toTop!;
		const firstIn = getRects(targets.value, 'IN', offset).keys().next().value ?? '';

		if (!jumpToFirst && firstIn === ids.value[0]) {
			const firstTargetTop = getRects(targets.value, 'ALL').values().next().value;
			if (firstTargetTop > FIXED_TO_TOP_OFFSET + offset) {
				return (activeId.value = '');
			}
		}

		if (ids.value.indexOf(firstIn) < ids.value.indexOf(activeId.value)) {
			activeId.value = firstIn;
		}
	}

	function onResize() {
		rootTop.value = isHTML.value ? 0 : root.value!.getBoundingClientRect().top;
		matchMedia.value = window.matchMedia(media).matches;
	}

	onMounted(async () => {
		if (isHTML.value) {
			root.value = document.documentElement;
		} else {
			const cRoot = document.getElementById(rootId as string);
			if (cRoot) {
				root.value = cRoot;
				rootTop.value = cRoot.getBoundingClientRect().top;
			}
		}

		// https://github.com/nuxt/content/issues/1799
		await new Promise((resolve) => setTimeout(resolve));
		setTargets();

		window.addEventListener('resize', onResize, { passive: true });

		if (matchMedia.value) {
			const hashId = targets.value.find(({ id }) => id === location.hash.slice(1))?.id;
			if (hashId) {
				return (activeId.value = hashId);
			}

			if (!jumpToEdges()) {
				onScrollDown();
			}
		}
	});

	onBeforeUnmount(() => {
		window.removeEventListener('resize', onResize);
	});

	const isClick = useScroll({
		isHTML,
		root,
		matchMedia,
		_setActive,
	});

	watch(isRef(userIds) || isReactive(userIds) ? userIds : () => null, setTargets, {
		flush: 'post',
	});

	watch(activeId, (newId) => {
		if (replaceHash) {
			const start = jumpToFirst ? 0 : -1;
			const newHash = `${location.pathname}${activeIndex.value > start ? `#${newId}` : ''}`;
			history.replaceState(history.state, '', newHash);
		}
	});

	watch(matchMedia, (_matchMedia) => {
		if (_matchMedia) {
			onScrollDown();
		} else {
			activeId.value = '';
		}
	});

	// Returned
	function setActive(id: string) {
		if (id !== activeId.value) {
			activeId.value = id;
			isClick.value = true;
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
