import { computed, reactive } from 'vue';

const sections = reactive(
	Array.from({ length: 20 }, (_, index) => ({
		id: `section_${index}`,
		titleId: `title_${index}`,
		title: `${index} `.repeat(getInt(4, 10)),
		text: 'Ciao '.repeat(getInt(50, 200)),
	}))
);

const menuItems = computed(() =>
	sections.map((item) => ({
		id: item.titleId,
		label: item.title,
		href: item.id,
	}))
);

export function useSections() {
	return { sections, menuItems };
}

function getInt(min: number, max: number) {
	min = Math.ceil(min);
	max = Math.floor(max);
	return Math.floor(Math.random() * (max - min + 1) + min);
}
