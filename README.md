# Vue Reactive TOC

### Reactive sidebar links without drawbacks.

:bulb: Requires Vue 3 or above.

<br />

## Why?

Highlighting sidebar links using the [Intersection Observer](https://developer.mozilla.org/en-US/docs/Web/API/Intersection_Observer_API) may have various drawbacks:

- Some links may never be highlighted if previous sections are entirely visible once bottom is reached (unreachable links)
- Clicking on such links highlights different sections (or does nothing).
- When accessing/refreshing the page, the active link doesn't reflect the one in the the URL if bottom is reached.
- Scrolling speed affects accuracy of the current active link

---

> :bulb: Vue TOC Highlight is a **Vue 3 composable** that automatically deals with such drawbacks and surgically returns **reactive data** of the current active section.

---

### Features

- Zero dependencies, 1.5KB gzipped.
- Works with Vue 3 template refs or CSS selectors
- Total control on the output as it doesn't mutate your elements
- Automatic update on window resize
- Automatic set as active last link on bottom reached regardless of previous sections visibility
- Manually set as active unreachable links with `setUnreachable`

### Limitations

Vue TOC Highlight doesn't work with scrolling containers different than the window. PRs are welcome to extend support to them.

<br />

## Installation

```bash
npm i -S vue-reactive-toc
```

```bash
yarn add vue-reactive-toc
```

```bash
pnpm add vue-reactive-toc
```

<br />

# Usage

## 1. Provide targets — Refs/Selectors

The best thing to do is to observe the **top headings** of your sections. This ensures that the active link follows as much as possible the users' reading-flow. Headings' IDs should also represent the anchors to scroll to. If you want to increase the intersection area, simply increase top and bottom paddings of your titles.

### A) Refs - Recommended

1. Create a new `ref([])` to hold the targets
2. While rendering the sections of your content:
   - Pass the ref name to each top heading [template ref](https://vuejs.org/guide/essentials/template-refs.html#refs-inside-v-for).
   - Add an unique `id` attribute to each top heading, this is the anchor your users will scroll to.
3. Pass the ref to `useActiveTitle`'s first argument

```vue
<script setup>
import { reactive, ref } from 'vue'
import { useActiveTitle } from 'vue-reactive-toc'

const sections = reactive([
  {
    parent: 'guide',
    id: 'section-1',
    title: 'Section 1',
    content: '...'
  } // ...
])

const titleRefs = ref([])
const { activeIndex, activeId, activeDataset } = useActiveTitle(titleRefs)
</script>

<template>
  <section v-for="section in sections" :key="section.id">
    <!-- 👇 This is the observed title and also the anchor to scroll to -->
    <h1 ref="titleRefs" :id="section.id">
      {{ section.title }}
    </h1>
    <p>{{ section.content }}</p>
  </section>
</template>
```

### B) Selectors

If you cannot work with template refs, you can pass a valid [CSS selector string](https://developer.mozilla.org/en-US/docs/Web/API/Document/querySelectorAll) shared by your targets to `useActiveTitle`. Don't forget to also assign an unique `id` to each target.

```js
const { activeIndex, activeId, activeDataset } = useActiveTitle('h1.titles')
```

If relying on selectors instead of refs, bear in mind that the composable won't be able to re-track targets if they are dynamically added/removed from the DOM.

> :bulb: It uses `document.querySelectorAll` under the hood.

<br />

## 2. Provide additional data (optional)

Use [data attributes](https://developer.mozilla.org/en-US/docs/Learn/HTML/Howto/Use_data_attributes) to pass any additional data to the targets:

```vue
<template>
  <section v-for="section in sections" :key="section.id" :id="section.id">
    <h1
      ref="sectionsRef"
      :id="section.id"
      :data-section="section.title"
      :data-parent="section.parent"
    >
      <!-- 👆 -->
      {{ section.title }}
    </h1>
    <p>{{ section.content }}</p>
  </section>
</template>
```

<br />

## 3. Configure the composable (optional)

`useActiveTitle` accepts an optional configuration object as its second argument:

```js
const { activeIndex, activeId, activeDataset } = useActiveTitle(titleRefs, {
  debounce: 100
  // Other options...
})
```

| Property    | Type      | Default | Description                                                                                                                                                                   |
| ----------- | --------- | ------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| topOffset   | `number`  | 0       | It should match the height in pixels of any **fixed** content that overlaps the top of your scrolling area (e.g. fixed header). See also [dealing with offsetTop paddings](). |
| debounce    | `number`  | 0       | Time in ms to wait in order to get updated results once scroll is over.                                                                                                       |
| jumpToFirst | `boolean` | true    | Wheter to set the first target on mount as active even if not (yet) intersecting.                                                                                             |
| jumpToLast  | `boolean` | true    | Wheter to set the last target as active once scroll arrives to bottom even if previous targets are entirely visible.                                                          |

### Return object

The composable returns an object of reactive [refs](https://vuejs.org/api/reactivity-core.html#ref) plus a special function.

| Name            | Type                      | Description                                                                                      |
| --------------- | ------------------------- | ------------------------------------------------------------------------------------------------ |
| activeIndex     | `number`                  | Index of the current active target in DOM tree order, `0` for the first title/section and so on. |
| activeId        | `string`                  | DOM ID of the current active target                                                              |
| activeDataset   | `Record<string, string>`  | Dataset of the current active target in plain object format                                      |
| isBottomReached | `boolean`                 | Whether scroll reached the bottom                                                                |
| setUnreachable  | `(index: number) => void` | "Safe" function to manually set any unreachable target index as active. [More here]().           |

<br />

## 4. Compute your menu links

To keep everything in sync, your menu should be computed from your content. Luckily with Vue you can do that very easily.

```vue
<!-- Page.vue -->

<script setup>
import { computed, reactive, ref } from 'vue'

const sections = reactive([
  {
    parent: 'guide',
    id: 'section-1',
    title: 'Section 1',
    content: '...'
  } // ...
])

const menuLinks = computed(() =>
  sections.map((section, index) => ({
    title: section.title,
    href: `#${section.id}`
  }))
)

const titleRefs = ref([])
</script>

<template>
  <article>
    <section v-for="section in sections" :key="section.id">
      <h1 ref="titleRefs" :id="section.id">
        {{ section.title }}
      </h1>
      <p>{{ section.content }}</p>
    </section>
  </article>
  <Sidebar :refs="titleRefs" :links="menuLinks" />
</template>
```

<br />

## 5. Create the reactive sidebar

- Destructure and include `setUnreachable` in your click handler by passing the index of your link.
- Use any other reactive property to style your menu link or to produce side effects.

```vue
<!-- Sidebar.vue -->

<script setup>
import { watch } from 'vue'
import { useRouter } from 'vue-router'
import { useActiveTitle } from 'vue-reactive-toc'

defineProps({
  refs: {
    type: Array,
    required: false
  },
  links: {
    type: Array,
    required: true
  }
})

const router = useRouter()
const { activeIndex, activeId, setUnreachable } = useActiveTitle(refs)

// Update URL hash on active section change
watch(
  () => activeId.value,
  (newId) => {
    router.replace({
      hash: newId
    })
  }
)
</script>

<template>
  <nav>
    <a
      v-for="(link, index) in menuLinks"
      :href="link.href"
      :key="link.href"
      @click="setUnreachable(index)"
      :class="[
        'link',
        {
          active: index === activeIndex // Set active class when index matches
        }
      ]"
    >
      {{ links.label }}
    </a>
  </nav>
</template>

<style>
html {
  scroll-behavior: smooth;
}
</style>

<style scoped>
.link {
  color: #000;
}

.active {
  color: #f00;
}
</style>
```

## What is setUnreachable?

> :bulb: Unreachable targets are all those targets 100% visible once scrolled to the bottom of the page. Clicking on the correspondent link in the sidebar doesn't trigger any scroll event.

<br />

`setUnreachable` is a special "safe" function that allows to manually schedule an unreachable target index to be set as active.

`useActiveTitle` will evaluate if the index passed is unreachable, if yes, it will update the active target once scroll is idle and bottom is reached no matter what's the actual nearest target.

> It is not mandatory to use it but you should include it in any click handler.

<br />

## Dealing with offsetTop title paddings

You might noticed that if you have a fixed header and defined a `offsetTop`, once you scroll to a section its top edge may actually be underneath the header.

You must adjust the paddings and the margins of your titles to compensate the offset:

```js
const { activeIndex } = useActiveTitle(titleRefs, {
  topOffset: 100
})
```

From:

```css
.titles {
  margin: 0;
  padding: 30px 0;
}
```

To:

```css
.titles {
  margin: -100px 0 0 0; // /* Remove topOffset from margin-top */
  padding: 130px 0 30px 0; /* Add topOffset to padding-top */
}
```

Which is basically from:

```css
.titles {
  margin: 0;
  padding: 0;
}
```

to:

```css
.titles {
  margin: -100px 0 0 0;
  padding: 100px 0 0 0;
}
```
