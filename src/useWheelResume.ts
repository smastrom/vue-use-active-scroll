import { watch, Ref } from 'vue';

export function useWheelResume({
	isClick,
	isAbove,
	onScroll,
}: {
	isClick: Ref<boolean>;
	isAbove: Ref<boolean>;
	onScroll: (prevY: number) => void;
}) {
	let prevY: number | undefined;

	function onResume() {
		if (!prevY) {
			prevY = window.scrollY;
		}
		onScroll(prevY);
		prevY = window.scrollY;
	}

	watch(isClick, (_isClick, _, onCleanup) => {
		if (_isClick && isAbove.value && !('ontouchstart' in window)) {
			console.log('Adding wheel');
			document.addEventListener('wheel', onResume, { passive: true });
		}

		onCleanup(() => {
			if (_isClick && isAbove.value) {
				console.log('Removing wheel');
				document.removeEventListener('wheel', onResume);
			}
		});
	});

	return null;
}
