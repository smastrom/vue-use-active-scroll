<script lang="ts" setup>
import { computed } from 'vue';
import { useRouter } from 'vue-router';

const router = useRouter();
const isFixedHeader = computed(() => router.currentRoute.value.name === 'FixedHeader');
</script>

<template>
	<nav :class="{ FixedHeader: isFixedHeader }">
		<div>
			<RouterLink to="/">Window</RouterLink>
			<RouterLink to="/container">Container</RouterLink>
			<RouterLink to="/fixedheader">Fixed Header</RouterLink>
		</div>
	</nav>
</template>

<style scoped>
.FixedHeader {
	position: fixed;
	max-width: 100%;
	width: 1280px;
}

nav {
	border-bottom: 1px solid var(--BorderColor);
	height: 60px;
	padding: 0 20px;
	display: flex;
	align-items: center;
	background-color: var(--BackgroundColor);
}

div {
	width: max-content;
	display: grid;
	gap: 30px;
	grid-auto-flow: column;
}

a {
	font-weight: 600;
	font-size: 90%;
	text-decoration: none;
	cursor: pointer;
	color: white;
}

a:hover,
a.router-link-exact-active {
	border-bottom: 2px solid white;
}
</style>
