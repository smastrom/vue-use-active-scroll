# Vue Reactive TOC

### Reactive sidebar links without drawbacks.

:bulb: Requires Vue 3 or above.

<br />

## Why?

Highlighting sidebar links using the [Intersection Observer](https://developer.mozilla.org/en-US/docs/Web/API/Intersection_Observer_API) may have various drawbacks:

- Some links are never highlighted if previous sections are entirely visible once bottom is reached (unreachable links)
- Clicking on such links highlights different sections (or does nothing).
- When accessing/refreshing the page, the active link doesn't reflect the one in the the URL if bottom is reached.
- Scrolling speed affects accuracy of the current active link

---

> :bulb: Vue TOC Highlight is a **Vue 3 composable** that automatically deals with such drawbacks and surgically returns **reactive data** of the current active section.

---

### Features

- Zero dependencies, 1.5KB gzipped.
- Total control on the output as it doesn't touch your DOM
- Automatic update on window resize
- Automatic set as active last link on bottom reached regardless of previous sections visibility
- Manually set as active unreachable links with `setUnreachable`
- Works great with Nuxt Content

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

## 1. Provide targets IDs

The best thing to do is to observe the **headings** of your content. Each heading must have an unique `id` attribute which is also the anchor to scroll to.

In your Sidebar component, import `useActiveTitle` and pass the array of IDs to observe.

This array should be computed from your content just like your TOC links. Order is not important.

```vue
<script setup>
import { useActiveTitle } from 'vue-reactive-toc'

const titleIds = ['title-1', 'title-2', 'title-3']

const { activeIndex, activeId } = useActiveTitle(titleIds)
</script>
```

<details><summary><strong>Nuxt Content</strong></summary>

<br />

Nuxt Content automatically applies IDs to your headings. It also gives an array of the links of your TOC that you can get by accessing `data.body.toc.links` via `queryContent`.

```js
const { data } = await useAsyncData('about', () => queryContent('/about').findOne())
```

```js
// data.body.toc.links

;[
  {
    id: 'title-1',
    depth: 2,
    text: 'Title 1',
    children: [{ id: 'sub-title-1', depth: 3, text: 'Sub Title 1' }] // Nested
  },
  { id: 'title-2', depth: 2, text: 'Title 2' },
  { id: 'title-3', depth: 2, text: 'Title 3' },
  { id: 'title-4', depth: 2, text: 'Title 4' }
]
```

You can compute the array of IDs to observe by mapping the `data.body.toc.links` as follows:

```js
const computedLinks = computed(() =>
  data.body.toc.links.flatMap(({ id, children = [] }) => [id, ...children.map(({ id }) => id)])
)

// => ['title-1', 'sub-title-1', 'title-2', 'title-3', 'title-4']
```

</details>

<br />

## 2. Configure the composable (optional)

`useActiveTitle` accepts an optional configuration object as its second argument:

```js
const { activeIndex, activeId, activeDataset } = useActiveTitle(titles, {
  debounce: 100
  // Other options...
})
```

| Property    | Type      | Default | Description                                                                                                                                                                   |
| ----------- | --------- | ------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| topOffset   | `number`  | 0       | It should match the height in pixels of any **fixed** content that overlaps the top of your scrolling area (e.g. fixed header). See also [dealing with offsetTop paddings](). |
| debounce    | `number`  | 0       | Time in ms to wait in order to get updated results once scroll is idle.                                                                                                       |
| jumpToFirst | `boolean` | true    | Wheter to set the first target on mount as active even if not (yet) intersecting.                                                                                             |
| jumpToLast  | `boolean` | true    | Wheter to set the last target as active once scroll arrives to bottom even if previous targets are entirely visible.                                                          |

### Return object

The composable returns an object of reactive [refs](https://vuejs.org/api/reactivity-core.html#ref) plus a special function.

| Name            | Type                                  | Description                                                                                      |
| --------------- | ------------------------------------- | ------------------------------------------------------------------------------------------------ |
| activeIndex     | `Ref<number>`                         | Index of the current active target in DOM tree order, `0` for the first title/section and so on. |
| activeId        | `ComputedRef<string>`                 | DOM ID of the current active target                                                              |
| activeDataset   | `ComputedRef<Record<string, string>>` | Dataset of the current active target in plain object format                                      |
| isBottomReached | `Ref<boolean>`                        | Whether scroll reached the bottom                                                                |
| setUnreachable  | `(index: number) => void`             | "Safe" function to manually set any unreachable target index as active. [More here]().           |

<br />

## 3. Create your Sidebar

If your sidebar links have exactly the same length of your targets array (very likely), all you need to style the active link is to compare the current `activeIndex` with the index of the rendered array.

For advanced scenarios like nested links or animations, you can use `activeId` or `activeDataset`.

You can also watch for any reactive property changes and produce side effects like updating the URL hash.

```vue
<script setup>
import { watch } from 'vue'
import { useRouter } from 'vue-router'
import { useActiveTitle } from 'vue-reactive-toc'

defineProps({
  tocLinks: {
    type: Array,
    required: true // Array of links to render, computed from your content
  },
  titleIds: {
    type: Array,
    required: false // Array of IDs to observe, computed from your content
  }
})

const router = useRouter()
const { activeIndex, activeId, setUnreachable } = useActiveTitle(titleIds)

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
      v-for="(link, index) in tocLinks"
      @click="setUnreachable(index)"
      :href="link.href"
      :key="link.href"
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

`useActiveTitle` will evaluate if the index passed is unreachable, if yes, it will update the active target once scroll is idle and bottom is reached no matter what's the actual nearest target or if `jumpToLast` is active.

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
