<script setup lang="ts">
import { onMounted, computed, provide, ref } from 'vue'
import { useFakeData } from '../useFakeData'

import PageLayout from './_Layout.vue'

const { menuItems, sections, /* Demo purposes => */ pushSection, shiftSection } = useFakeData()

const targetEls = ref<HTMLElement[]>([])
// const targetsIds = computed<string[]>(() => sections.map((section) => section.id))

const containerRef = ref<HTMLElement | null>(null)

onMounted(() => {
   console.log('targetEls', targetEls.value)
})

provide('TOCData', {
   menuItems,
   targets: targetEls,
   containerRef,
}) // Injected to TOC.vue
provide('DemoButtons', { pushSection, shiftSection }) // Injected to DemoControls.vue
</script>

<template>
   <PageLayout>
      <div ref="containerRef" class="Container">
         <section v-for="section in sections" :key="section.id">
            <h2 ref="targetEls" :id="section.id">
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
