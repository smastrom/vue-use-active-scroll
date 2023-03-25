<script setup lang="ts">
import { computed, provide } from 'vue'
import { useFakeData } from '../useFakeData'
import PageLayout from './_Layout.vue'

const { menuItems, sections, /* Demo purposes => */ pushSection, shiftSection } = useFakeData()

const targets = computed<string[]>(() => sections.map((section) => section.id))

provide('TOCData', { menuItems, targets, overlayHeight: 60 }) // Injected to TOC.vue
provide('DemoButtons', { pushSection, shiftSection }) // Injected to DemoRadios.vue
</script>

<template>
   <PageLayout>
      <main>
         <section v-for="section in sections" :key="section.id" :id="section.id">
            {{ section.title }}
         </section>
      </main>
   </PageLayout>
</template>

<style scoped>
main {
   --HeaderHeight: 60px;
   padding: 0 20px;
   max-width: 600px;
   width: 100%;
   margin-top: var(--HeaderHeight);
}

section {
   height: 600px;
   background-color: rgb(217, 173, 255);
   display: flex;
   align-items: center;
   justify-content: center;
   font-size: 140%;
   padding: 10px;
   color: var(--BackgroundColor);
   scroll-margin-top: var(--HeaderHeight);
}

section:nth-child(odd) {
   height: 400px;
   background-color: rgb(173, 255, 252);
}

@media (max-width: 610px) {
   section {
      height: 400px !important;
   }

   section:nth-child(odd) {
      height: 200px !important;
   }
}
</style>
