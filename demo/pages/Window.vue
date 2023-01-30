<script setup lang="ts">
import { computed, provide } from 'vue';
import { useFakeData } from '../useFakeData';
import PageLayout from './_Layout.vue';

const { menuItems, sections, /* Demo purposes => */ pushSection, shiftSection } = useFakeData();
const targets = computed<string[]>(() => sections.map((section) => section.id));

provide('TOCData', { menuItems, targets }); // Injected to TOC.vue
provide('DemoButtons', { pushSection, shiftSection }); // Injected to DemoControls.vue
</script>

<template>
	<PageLayout>
		<main>
			<section v-for="section in sections" :key="section.id">
				<h2 :id="section.id">
					{{ section.title }}
				</h2>
				<p>{{ section.text }}</p>
			</section>
		</main>
	</PageLayout>
</template>

<style scoped>
main {
	margin-top: 300px;
	max-width: 600px;
	padding: 0 20px;
}

h2 {
	padding: 40px 0;
	margin: 0;
}

p {
	margin: 0 0 60px 0;
}
</style>
