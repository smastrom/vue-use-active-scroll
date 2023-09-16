<script setup lang="ts">
import { provide } from 'vue'
import { RouterView } from 'vue-router'
import type { Props } from '../cypress/support/component'

const props = defineProps<Props>()

provide('props', props)
</script>

<template>
   <div>
      <RouterView />
   </div>
</template>

<style>
html {
   scroll-behavior: smooth;
}
</style>
