import { customRef, type Ref } from 'vue';

export const isSSR = typeof window === 'undefined';

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
	// Mobile devices needs window.innerHeight
	const clientHeight = root === document.documentElement ? window.innerHeight : root.clientHeight;

	const isTop = root.scrollTop <= FIXED_OFFSET * 2;
	const isBottom = Math.abs(root.scrollHeight - clientHeight - root.scrollTop) <= 1;

	return {
		isTop,
		isBottom,
	};
}
