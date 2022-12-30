import { onBeforeUnmount, onMounted } from 'vue';
import { useDebouncedFn } from './useDebounceFn';

export function useResize(setUnreachables: () => void, onScrollDown: () => void) {
	const debouncedCallback = useDebouncedFn(() => {
		setUnreachables();
		onScrollDown();
	}, 75);

	onMounted(() => {
		window.addEventListener('resize', debouncedCallback);
	});

	onBeforeUnmount(() => {
		window.removeEventListener('resize', debouncedCallback);
	});
}
