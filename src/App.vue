<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import { useSections } from './devComposables';
import { useHighlight } from './useActiveTitle';

const { menuItems, sections } = useSections();

const titlesRef = ref<HTMLHeadingElement[]>([]);

const titles = computed(() => sections.map((section) => section.id)); // New

const { unreachableIds, dataset, activeIndex, setUnreachable, activeId, isBottomReached } =
	useHighlight(titles, {
		jumpToFirst: true,
		jumpToLast: true,
		topOffset: 100,
		bottomOffset: 50,
	});

function spliceSection() {
	sections.splice(0, 1);
}

function wipeArray() {
	sections.splice(0, sections.length);
}

watch(
	[() => activeIndex.value, () => activeId.value],
	([newIndex, newId]) => {
		console.log(
			newIndex,
			JSON.stringify(dataset.value),
			JSON.stringify(unreachableIds.value),
			activeId.value
		);
		if (newIndex <= 0) {
			history.replaceState(undefined, '', '/');
		} else {
			history.replaceState(undefined, '', `#${newId}`);
		}
	},
	{ flush: 'post' }
);

const linkRefs = ref<HTMLElement[]>([]);

const activeItemHeight = computed(
	() => linkRefs.value[activeIndex.value]?.getBoundingClientRect().height || 0
);

function handleClick(id: string) {
	document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
	setUnreachable(id);
}
</script>

<template>
	<div class="wrapper">
		<header>Fixed Header</header>
		<main class="main">
			<section v-for="section in sections" :key="section.id">
				<h1
					class="titles"
					ref="titlesRef"
					data-x-y="Ciao"
					:data-section="section.id"
					:id="section.id"
				>
					{{ section.title }}
				</h1>
				<p>{{ section.text }}</p>
			</section>
		</main>
		<nav>
			<button @click="wipeArray">Wipe</button>
			<button @click="spliceSection">Slice</button>

			<ul :style="`--ActiveIndex: ${activeIndex}; --ActiveItemHeight: ${activeItemHeight}px;`">
				<span aria-hidden="true" class="Tracker" />
				<span aria-hidden="true" class="TrackerBackground" />
				<li
					ref="linkRefs"
					v-for="(item, itemIndex) in menuItems"
					:key="item.id"
					:class="[
						'menuItem',
						{
							active: itemIndex === activeIndex,
						},
					]"
				>
					<button @click="() => handleClick(item.href)">{{ item.label }}</button>
					<a :href="`#${item.href}`" @click="setUnreachable(item.href)">
						{{ item.label }}
					</a>
				</li>
			</ul>
		</nav>
	</div>
</template>

<style scoped>
header {
	position: fixed;
	top: 0;
	left: 0;
	right: 0;
	height: 100px;
	background: rgba(255, 255, 255, 0.206);
}

.main {
	margin-top: 300px;
}

.Tracker {
	width: 4px;
	height: var(--ActiveItemHeight);
	position: absolute;
	background: red;
	display: block;
	left: -10px;
	transition: top 100ms;
	top: calc(var(--ActiveItemHeight) * var(--ActiveIndex));
}

.titles {
	margin: -100px 0 0 0;
	padding: 130px 0 30px 0;
}

.TrackerBackground {
	width: 100%;
	height: var(--ActiveItemHeight);
	position: absolute;
	left: -10px;
	right: 10px;
	top: calc(var(--ActiveItemHeight) * var(--ActiveIndex));
	background: #ffffff1a;
	border-radius: 0 5px 5px 0;
	transition: top 100ms;
}

.wrapper {
	display: grid;
	grid-template-columns: 1fr 0.3fr;
	gap: 100px;
	position: relative;
}

.menuItem {
	background-color: transparent;
	transition: background-color 100ms;
}

.active {
	background-color: white;
}

p {
	margin: 0 0 30px 0;
}

nav {
	top: 110px;
	position: fixed;
	right: 0;
	padding: 30px;
}

ul {
	position: relative;
	list-style: none;
	padding: 0;
	margin: 0;
}

li {
	position: relative;
}
</style>
