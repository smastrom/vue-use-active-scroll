import { computed, ComputedRef, onBeforeUnmount, onMounted, ref } from 'vue';
import { isSSR } from './utils';

export function useMinWidth(minWidth: number): ComputedRef<boolean> {
	const width = ref(1 / 0);
	const isAbove = computed(() => width.value > minWidth);

	if (isSSR) {
		return isAbove;
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

	return isAbove;
}
