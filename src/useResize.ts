import { onBeforeUnmount, onMounted, ref } from 'vue';
import { isSSR } from './utils';

type UseResizeOptions = {
	minWidth: number;
	setUnreachableIds: () => void;
	onScrollDown: () => void;
	onScrollUp: () => void;
};

export function useResize({
	minWidth,
	setUnreachableIds,
	onScrollDown,
	onScrollUp,
}: UseResizeOptions) {
	const viewportWidth = ref(1 / 0);

	if (isSSR) {
		return {
			viewportWidth,
		};
	}

	let scrollPos = window.pageYOffset;

	function onResize() {
		const _viewportWidth = document.documentElement.clientWidth;

		if (_viewportWidth >= minWidth) {
			setUnreachableIds();
			if (window.pageYOffset > scrollPos) {
				onScrollUp();
			} else {
				onScrollDown();
			}
		}

		scrollPos = window.pageYOffset;
		viewportWidth.value = _viewportWidth;
	}

	onMounted(() => {
		viewportWidth.value = document?.documentElement.clientWidth || 1 / 0;
		window.addEventListener('resize', onResize, { passive: true });
	});

	onBeforeUnmount(() => {
		window.removeEventListener('resize', onResize);
	});

	return {
		viewportWidth,
	};
}
