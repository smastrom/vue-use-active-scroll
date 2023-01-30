<script setup lang="ts">
import { computed, provide, ref } from 'vue';
import PageLayout from './_Layout.vue';
import { useFakeData } from '../useFakeData';

const { menuItems, sections, /* Demo purposes => */ pushSection, shiftSection } = useFakeData();

const targets = computed<string[]>(() => sections.map((section) => section.id));

const containerRef = ref<HTMLElement | null>(null);

provide('TOCData', { menuItems, targets, containerRef }); // Injected to TOC.vue
provide('DemoButtons', { pushSection, shiftSection }); // Injected to DemoControls.vue
</script>

<template>
	<PageLayout>
		<div ref="containerRef" class="Container">
			<section
				v-for="(section, index) in sections"
				:key="section.id"
				:style="`${
					index === sections.length - 1
						? 'margin-bottom: 2000px;'
						: index === 0
						? 'margin-top: 2000px;'
						: ''
				}`"
			>
				<h2 :id="section.id">
					{{ section.title }}
				</h2>
				<p>{{ section.text }}</p>
			</section>
		</div>
	</PageLayout>
</template>

<style scoped>
.Container {
	overflow: auto;
	max-height: calc(100vh - 160px);
	scroll-behavior: var(--ScrollBehavior);
	height: 900px;
	max-width: 600px;
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
