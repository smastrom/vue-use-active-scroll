import { onBeforeUnmount, onMounted, ref } from 'vue';
import { isSSR } from './utils';

type UseResizeOptions = {
	minWidth: number;
	setUnreachIds: () => void;
};

export function useResize({ minWidth, setUnreachIds }: UseResizeOptions) {
	const viewportWidth = ref(1 / 0);

	if (isSSR) {
		return {
			viewportWidth,
		};
	}

	function onResize() {
		viewportWidth.value = document.documentElement.clientWidth;

		if (viewportWidth.value >= minWidth) {
			setUnreachIds();
		}
	}

	onMounted(() => {
		viewportWidth.value = document?.documentElement.clientWidth ?? 1 / 0;
		window.addEventListener('resize', onResize, { passive: true });
	});

	onBeforeUnmount(() => {
		window.removeEventListener('resize', onResize);
	});

	return {
		viewportWidth,
	};
}
