<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { useFakeData } from './useFakeData';
import { useActiveTarget } from '../src/useActiveTarget';

const { menuItems, sections, pushSection, shiftSection } = useFakeData();

const titles = computed<string[]>(() => sections.map((section) => section.id));

const { activeIndex, activeId, setActive } = useActiveTarget(titles, {
	jumpToFirst: true,
	jumpToLast: true,
	replaceHash: true,
	boundaryOffset: {
		toTop: -100,
		toBottom: 150,
	},
});

const scrollBehavior = ref('smooth'); // Demo
const isHashEnabled = ref(false); // Demo

watch(activeId, (newId) => {
	if (/* Demo */ isHashEnabled.value) {
		history.replaceState(history.state, '', activeIndex.value <= 0 ? '' : `#${newId}`);
	}
});

const activeItemHeight = computed(
	() => document.querySelector(`a[href="#${activeId.value}"]`)?.scrollHeight || 0
); // Demo

watch(
	() => scrollBehavior.value === 'smooth',
	(isSmooth) => {
		console.log('ontouchstart' in window);
		document.documentElement.style.scrollBehavior = isSmooth ? 'smooth' : 'auto';
	},
	{
		immediate: true,
	}
); // Demo
</script>

<template>
	<div class="Wrapper">
		<!-- Content -->
		<main>
			<section v-for="section in sections" :key="section.id">
				<h1 :id="section.id">
					{{ section.title }}
				</h1>
				<p>{{ section.text }}</p>
			</section>
		</main>

		<!-- Sidebar -->
		<aside>
			<!-- Demo Controls -->
			<div class="Controls">
				<fieldset>
					<legend>scroll-behavior</legend>
					<div>
						<label for="Auto">
							<input
								type="radio"
								id="Auto"
								name="scrollBehavior"
								value="auto"
								v-model="scrollBehavior"
							/>
							auto
						</label>
						<label for="Smooth">
							<input
								type="radio"
								id="Smooth"
								name="scrollBehavior"
								value="smooth"
								v-model="scrollBehavior"
							/>
							smooth
						</label>
					</div>
				</fieldset>

				<!-- 				<label for="urlHash"
					><input id="urlHash" type="checkbox" v-model="isHashEnabled" /> Update URL Hash</label
				> -->

				<div class="Buttons">
					<button @click="shiftSection">Shift</button>
					<button @click="pushSection">Push</button>
				</div>
			</div>

			<!-- TOC -->
			<nav>
				<ul
					:style="{ '--ActiveIndex': activeIndex, '--ActiveItemHeight': `${activeItemHeight}px` }"
				>
					<span v-if="activeIndex >= 0" class="Tracker" />

					<li ref="linkRefs" v-for="item in menuItems" :key="item.href">
						<a
							@click="setActive(item.href)"
							:href="`#${item.href}`"
							:class="{
								Active: item.href === activeId,
							}"
						>
							{{ item.label }}
						</a>
					</li>
				</ul>
			</nav>
		</aside>
	</div>
</template>

<style>
/* App */

:root {
	font-family: Inter, Avenir, Helvetica, Arial, sans-serif;
	font-size: 16px;
	line-height: 24px;
	font-weight: 400;
	color-scheme: dark;
	color: rgba(255, 255, 255, 0.87);
	background-color: #242424;
	font-synthesis: none;
	text-rendering: optimizeLegibility;
	-webkit-font-smoothing: antialiased;
	-moz-osx-font-smoothing: grayscale;
	-webkit-text-size-adjust: 100%;
}

html,
body {
	margin: 0;
}

#app {
	width: 100%;
	background-color: #222831;
}

.Wrapper {
	display: flex;
	max-width: 1280px;
	width: 100%;
	margin: auto;
	position: relative;
	justify-content: space-between;
}

/* Content */

main {
	max-width: 60%;
	padding: 0 20px;
	margin-top: 100px;
}

h1 {
	/* 	margin: -100px 0 0 0;
	padding: 130px 0 30px 0; */
	padding: 30px 0;
}

p {
	margin: 0 0 60px 0;
}

/* Sidebar */

aside {
	border-left: 1px solid #384a5d;
	min-width: 200px;
	align-self: flex-start;
	position: sticky;
	top: 0;
	padding: 10px;
}

@media (max-width: 610px) {
	aside {
		min-width: unset;
	}
}

/* Demo Controls */

.Controls {
	display: flex;
	flex-direction: column;
	gap: 20px;
	margin-bottom: 20px;
}

.Buttons {
	display: flex;
	column-gap: 10px;
	row-gap: 20px;
}

legend {
	font-weight: bold;
	margin: 0 0 5px;
}

fieldset {
	padding: 0;
	border: none;
	margin: 0;
	padding-block: 0;
}

fieldset div {
	display: flex;
	flex-direction: column;
	align-items: flex-start;
}

button {
	padding: 0.4em 0.6em;
	border: 1px solid #ffffff36;
	background-color: #393e46;
	border-radius: 5px;
	font-weight: 600;
	cursor: pointer;
	transition: border 100ms ease-in-out, background-color 100ms ease-in-out;
}

button:hover {
	border: 1px solid white;
	background-color: #4a5463;
}

label {
	cursor: pointer;
	padding: 5px 0;
	padding: 0 0 5px;
}

/* TOC */

.Tracker {
	width: calc(100% + 12px);
	height: var(--ActiveItemHeight);
	position: absolute;
	left: -10px;
	right: 10px;
	top: calc(var(--ActiveItemHeight) * var(--ActiveIndex));
	background-color: #00adb538;
	transition: top 100ms;
	border-left: 4px solid #00adb5;
}

@media (max-width: 610px) {
	.Tracker {
		transition: top 200ms;
	}
}

ul {
	position: relative;
	list-style: none;
	padding: 0;
	margin: 0;
}

li {
	display: flex;
}

a {
	text-decoration: none;
	transition: color 100ms;
	white-space: nowrap;
	transition: background-color 100ms;
	color: rgba(255, 255, 255, 0.646);
	padding: 2.5px 0;
	width: 100%;
}

a:hover {
	color: white;
}

.Active {
	color: white;
}
</style>
