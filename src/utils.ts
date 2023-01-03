export const isSSR = typeof window === 'undefined';

export const FIXED_TO_TOP_OFFSET = 10;
export const FIXED_BOUNDARY_OFFSET = 5;
export const IDLE_TIME = 200;

export function getRects(
	targets: HTMLElement[],
	prop: 'top' | 'bottom',
	operator?: '>' | '<',
	userOffset = 0
) {
	const offset = FIXED_BOUNDARY_OFFSET + userOffset;
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

export function getEdges() {
	const root = document.documentElement;
	const isTopReached = root.scrollTop <= FIXED_TO_TOP_OFFSET;
	const isOverScroll = root.scrollTop > root.scrollHeight - root.clientHeight;
	const isBottomReached = Math.abs(root.scrollHeight - root.clientHeight - root.scrollTop) < 1;

	return { isTopReached, isBottomReached, isOverScroll };
}
