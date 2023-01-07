<script lang="ts" setup>
import DemoRadios from './DemoControls.vue';
import TOC from './TOC.vue';
</script>

<template>
	<aside>
		<DemoRadios />
		<TOC />
	</aside>
</template>

<style scoped>
aside {
	display: grid;
	min-width: 180px;
	border-left: 1px solid var(--BorderColor);
	width: var(--SidebarWidth);
	position: sticky;
	top: 0px;
	padding: 10px;
	height: max-content;
}

.FixedHeader ~ div aside {
	top: 60px;
}
</style>
