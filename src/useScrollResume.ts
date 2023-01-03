import { watch, Ref } from 'vue';

export function useScrollResume({
	isClick,
	onScroll,
}: {
	isClick: Ref<boolean>;
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
		const eventType = 'ontouchstart' in window ? 'touchmove' : 'wheel';

		if (_isClick) {
			console.log('Attaching wheel...');
			document.addEventListener(eventType, onResume, { passive: true });
		}

		onCleanup(() => {
			if (_isClick) {
				console.log('Detaching wheel on cleanup...');
				document.removeEventListener(eventType, onResume);
			}
		});
	});

	return null;
}
