import { onBeforeUnmount, onMounted, ref } from 'vue';
import { isSSR } from './utils';

export function useWidth() {
	const width = ref(1 / 0);

	if (isSSR) {
		return width;
	}

	function onResize() {
		width.value = document.documentElement.clientWidth;
	}

	onMounted(() => {
		width.value = document?.documentElement.clientWidth ?? 1 / 0;
		window.addEventListener('resize', onResize, { passive: true });
	});

	onBeforeUnmount(() => {
		window.removeEventListener('resize', onResize);
	});

	return width;
}
