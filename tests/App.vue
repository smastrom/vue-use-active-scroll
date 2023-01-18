<script setup lang="ts">
import { computed } from 'vue';
import { useFakeData } from '../demo/useFakeData';
import { useActive } from '../src/useActive';

const props = defineProps<{
	jumpToLast: boolean;
	jumpToFirst: boolean;
	marginTop: number;
}>();

const { sections, menuItems } = useFakeData(20);

const targets = computed(() => sections.map(({ id }) => id));
const { setActive, isActive } = useActive(targets, {
	jumpToLast: props.jumpToLast,
	jumpToFirst: props.jumpToFirst,
});
</script>

<template>
	<div class="Wrapper">
		<div class="Content" :style="`margin-top: ${marginTop || 0}px`">
			<section v-for="section in sections" :key="section.id">
				<h1 :id="section.id">{{ section.title }}</h1>
				<p>{{ section.text }}</p>
			</section>
		</div>
		<nav>
			<ul>
				<li v-for="item in menuItems" :key="item.href">
					<a
						@click="setActive(item.href)"
						:href="`#${item.href}`"
						:class="{ active: isActive(item.href) }"
						>{{ item.label }}</a
					>
				</li>
			</ul>
		</nav>
	</div>
</template>

<style>
html {
	scroll-behavior: smooth;
}
</style>

<style scoped>
.Wrapper {
	display: grid;
	grid-template-columns: 800px 300px;
}

nav {
	position: fixed;
	right: 0;
	top: 0;
}

.active {
	background-color: red;
}
</style>
