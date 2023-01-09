import { customRef, Ref } from 'vue';

export const isSSR = typeof window === 'undefined';

export const FIXED_TO_TOP_OFFSET = 10;
export const FIXED_OFFSET = 5;

// When users set refs, if no media match, set default value
export function useMediaRef<T>(matchMedia: Ref<boolean>, defaultValue: T): Ref<T> {
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

export function getEdges(root: HTMLElement) {
	// Mobile devices
	const clientHeight = root === document.documentElement ? window.innerHeight : root.clientHeight;

	const isTopReached = root.scrollTop <= FIXED_TO_TOP_OFFSET;
	const isBottomReached = Math.abs(root.scrollHeight - clientHeight - root.scrollTop) < 1;
	const isOverscrollTop = root.scrollTop < 0;
	const isOverscrollBottom = root.scrollTop > root.scrollHeight - clientHeight;

	return {
		isTop: isTopReached || isOverscrollTop,
		isBottom: isBottomReached || isOverscrollBottom,
	};
}
