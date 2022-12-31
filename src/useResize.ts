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

	let prevViewport = document.documentElement.clientWidth;

	function onResize() {
		viewportWidth.value = document.documentElement.clientWidth;

		if (viewportWidth.value >= minWidth) {
			setUnreachableIds();

			if (prevViewport < viewportWidth.value) {
				onScrollDown();
			} else {
				onScrollUp();
			}
		}

		prevViewport = viewportWidth.value;
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
