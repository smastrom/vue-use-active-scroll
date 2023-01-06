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
	min-width: 180px;
	border-left: 1px solid var(--BorderColor);
	width: var(--SidebarWidth);
	align-self: flex-start;
	position: sticky;
	top: 60px;
	padding: 10px;
}
</style>
