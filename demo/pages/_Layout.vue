<script lang="ts" setup>
import Sidebar from '../components/Sidebar/_Main.vue';
</script>

<template>
	<div>
		<slot />
		<Sidebar />
	</div>
</template>

<style scoped>
div {
	display: flex;
	justify-content: space-between;
}
</style>
