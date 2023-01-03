import { onMounted, ref } from 'vue';

export function useIdle(duration: number) {
	const isIdle = ref(false);
	let timer: NodeJS.Timeout;

	function onIdle() {
		clearTimeout(timer);
		timer = setTimeout(() => {
			console.log('Idle');
			isIdle.value = true;
		}, duration);
	}

	onMounted(() => {
		if (window.scrollY >= 5) {
			document.addEventListener('scroll', onIdle, { once: true, passive: true });
		} else {
			isIdle.value = true;
		}
	});

	return isIdle;
}
