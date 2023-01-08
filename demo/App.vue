<script lang="ts" setup>
import { ref, provide } from 'vue';
import Header from './components/Header.vue';

const scrollBehavior = ref<'smooth' | 'auto'>('smooth');
const clickType = ref<'native' | 'custom'>('native');

provide('DemoRadios', {
	scrollBehavior,
	clickType,
});
</script>

<template>
	<div class="Wrapper">
		<Header />
		<RouterView />
	</div>
</template>

<style scoped>
.Wrapper {
	display: flex;
	max-width: 1280px;
	width: 100%;
	margin: auto;
	position: relative;
	justify-content: space-between;
	flex-direction: column;
}
</style>

<style>
:root {
	font-family: Inter, Helvetica, Arial, sans-serif;
	font-size: 100%;
	line-height: 24px;
	font-weight: 400;
	color: rgba(255, 255, 255, 0.87);
	background-color: #242424;
	font-synthesis: none;
	text-rendering: optimizeLegibility;
	-webkit-font-smoothing: antialiased;
	-moz-osx-font-smoothing: grayscale;
	-webkit-text-size-adjust: 100%;
	background-color: var(--BackgroundColor);
	--SidebarWidth: 200px;
	--BorderColor: #384a5d;
	--BackgroundColor: #222831;
}

@media (max-width: 610px) {
	--SidebarWidth: 180px;
}

* {
	box-sizing: border-box;
}

html {
	scroll-behavior: var(--ScrollBehavior);
}

html,
body {
	margin: 0;
}

#app {
	width: 100%;
}
</style>
