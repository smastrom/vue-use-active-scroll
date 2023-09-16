<script setup lang="ts">
import { computed, inject } from 'vue'
import { RouterLink } from 'vue-router'
import { useFakeData } from '../demo/useFakeData'
import { useActive } from '../src/useActive'
import { Props } from '../cypress/support/component'

const props = (inject('props') ?? {}) as Props

const { sections, menuItems } = useFakeData(20)

const targets = computed(() => sections.map(({ id }) => id))

const { setActive, isActive } = useActive(targets, {
   jumpToLast: props.jumpToLast,
   jumpToFirst: props.jumpToFirst,
})
</script>

<template>
   <div class="Wrapper">
      <div class="Content" :style="`margin-top: ${props.marginTop || 0}px`">
         <section v-for="section in sections" :key="section.id">
            <h1 :id="section.id">{{ section.title }}</h1>
            <p>{{ section.text }}</p>
         </section>
      </div>
      <nav>
         <ul>
            <li v-for="item in menuItems" :key="item.href">
               <RouterLink
                  @click="setActive(item.href)"
                  :to="{ hash: `#${item.href}` }"
                  :class="{ active: isActive(item.href) }"
               >
                  {{ item.label }}
               </RouterLink>
            </li>
         </ul>
      </nav>
   </div>
</template>

<style>
html {
   scroll-behavior: smooth;
}
</style>

<style scoped>
.Wrapper {
   display: grid;
   grid-template-columns: 800px 300px;
}

nav {
   position: fixed;
   right: 0;
   top: 0;
}

.active {
   background-color: red;
}
</style>
