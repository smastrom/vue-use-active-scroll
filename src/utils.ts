import { customRef, Ref } from 'vue';

export const isSSR = typeof window === 'undefined';

export const FIXED_TO_TOP_OFFSET = 10;
export const FIXED_BOUNDARY_OFFSET = 5;

export function useRestrictedRef<T>(matchMedia: Ref<boolean>, defaultValue: T): Ref<T> {
	const _customRef = customRef<T>((track, trigger) => {
		let value = defaultValue;
		return {
			get() {
				track();
				return value;
			},
			set(newValue) {
				value = matchMedia.value ? newValue : defaultValue;
				trigger();
			},
		};
	});

	return _customRef;
}

export function getRects(targets: HTMLElement[], filter: 'IN' | 'OUT' | 'ALL', userOffset = 0) {
	const extOffset = FIXED_BOUNDARY_OFFSET + userOffset;
	const map = new Map<string, number>();

	targets.forEach((target) => {
		if (filter === 'ALL') {
			return map.set(target.id, target.getBoundingClientRect().top);
		}

		const isOut = filter === 'OUT';
		const rectProp = target.getBoundingClientRect()[isOut ? 'top' : 'bottom'];
		const scrollMargin = isOut ? parseFloat(getComputedStyle(target).scrollMarginTop) : 0;

		const offset = extOffset + scrollMargin;
		const condition = isOut ? rectProp <= offset : rectProp >= offset;

		if (condition) {
			map.set(target.id, rectProp);
		}
	});

	return map;
}

export function getEdges(root: HTMLElement) {
	const isTopReached = root.scrollTop <= FIXED_TO_TOP_OFFSET;
	const isBottomReached = Math.abs(root.scrollHeight - root.clientHeight - root.scrollTop) < 1;
	const isOverscrollTop = root.scrollTop < 0;
	const isOverscrollBottom = root.scrollTop > root.scrollHeight - root.clientHeight;

	return {
		isTop: isTopReached || isOverscrollTop,
		isBottom: isBottomReached || isOverscrollBottom,
	};
}
