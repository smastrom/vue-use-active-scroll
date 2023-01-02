import { watch, computed, reactive } from 'vue';

export function useFakeData() {
	const parsedStart = parseInt(sessionStorage.getItem('firstNumber') || '0');
	const parsedEnd = parseInt(sessionStorage.getItem('lastNumber') || '0');
	const parsedLength = parsedEnd - parsedStart + 1;

	const sections = reactive(
		Array.from({ length: parsedLength <= 1 ? 15 : parsedLength }, (_, index) => {
			return {
				id: `title_${parsedStart + index}`,
				title: `${parsedStart + index} `.repeat(6).toUpperCase(),
				text: 'Text '.repeat(getInt(80, 320)),
			};
		})
	);

	const lastNum = computed(() => parseInt(sections[sections.length - 1].title));
	const firstNum = computed(() => parseInt(sections[0].title));

	const menuItems = computed(() =>
		sections.map((item) => ({
			label: item.title,
			href: item.id,
		}))
	);

	function shiftSection() {
		sections.shift();
	}

	function pushUnreachable() {
		sections.push({
			id: `title_${lastNum.value + 1}`,
			title: `${lastNum.value + 1} `.repeat(6).toUpperCase(),
			text: 'Text '.repeat(getInt(50, 100)),
		});
	}

	watch(
		[firstNum, lastNum],
		([newFirst, newLast]) => {
			sessionStorage.setItem('firstNumber', `${newFirst}`);
			sessionStorage.setItem('lastNumber', `${newLast}`);
		},
		{ immediate: true }
	);

	return { sections, menuItems, pushUnreachable, shiftSection };
}

function getInt(min: number, max: number) {
	min = Math.ceil(min);
	max = Math.floor(max);
	return Math.floor(Math.random() * (max - min + 1) + min);
}