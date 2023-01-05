<script setup lang="ts">
import { computed, provide } from 'vue';
import PageLayout from './_Layout.vue';
import { useFakeData } from '../useFakeData';

const { menuItems, sections, /* Demo purposes => */ pushSection, shiftSection } = useFakeData();

const targets = computed<string[]>(() => sections.map((section) => section.id));

provide('TOCData', { menuItems, targets, rootId: 'ScrollingContainer' }); // Injected to TOC.vue
provide('DemoButtons', { pushSection, shiftSection }); // Injected to DemoControls.vue
</script>

<template>
	<PageLayout>
		<div id="ScrollingContainer">
			<section v-for="section in sections" :key="section.id">
				<h2 :id="section.id">
					{{ section.title }}
				</h2>
				<p>{{ section.text }}</p>
			</section>
		</div>
	</PageLayout>
</template>

<style scoped>
#ScrollingContainer {
	overflow: auto;
	scroll-behavior: var(--ScrollBehavior);
	height: 900px;
	max-width: 600px;
	max-height: 90%;
	border: 2px solid var(--BorderColor);
	border-radius: 10px;
	padding: 0 20px;
	margin: 50px 20px;
}

h2 {
	padding: 40px 0;
	margin: 0;
}

p {
	margin: 0 0 60px 0;
}
</style>
