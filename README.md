# Vue Reactive TOC

### Reactive sidebar links without drawbacks.

:bulb: Requires Vue 3 or above.

<br />

## Why?

Highlighting sidebar links using the [Intersection Observer](https://developer.mozilla.org/en-US/docs/Web/API/Intersection_Observer_API) may have various drawbacks:

- Scrolling speed affects accuracy
- Once scrolled to bottom, some links may never be highlighted if previous targets are entirely visible (unreachable targets).
- Clicking on such links highlights different links (or does nothing).
- When accessing/refreshing the page, the active target may not reflect the one in the the URL hash.

> If you don't care about such drawbacks then you don't need this package.

### What it does?

- Jump to first target on mount regardless of
- Jump to last target on bottom reached regardless of previous targets visibility
- Manually set unreachable targets with `setUnreachable`
- onMount, ensures that the target in the URL hash is active
- Total control on the output as it doesn't touch your DOM
- Update on window resize
- Scroll-behavior agnostic (CSS or JS)

### Limitations

Vue Reactive TOC doesn't work with scrolling containers different than the window. PRs are welcome to extend support to them.

<br />

## Installation

```bash
pnpm add vue-reactive-toc
```

<br />

# Usage

## 1. Provide targets IDs

In order to get results consistent with users' reading flow, targets to be observed should match the titles (h2, h3...) of your sections (not the whole section).

Make sure that each target has an unique `id` (which corresponds to the anchor you'll scroll to) and pass them to `useActiveTitle`. Order is not important.

```vue
<script setup>
import { useActiveTitle } from 'vue-reactive-toc'

const titleIds = ['title-1', 'title-2', 'title-3']
// or titleIds = computed(() => /* ... */)

const { activeId } = useActiveTitle(titleIds)
</script>
```

<details><summary><strong>Nuxt Content</strong></summary>

<br />

Nuxt Content automatically applies IDs to your headings. It also gives an array of TOC links that you can get by accessing `data.body.toc.links` via [queryContent](https://content.nuxtjs.org/api/composables/query-content/).

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
const computedIds = computed(() =>
  data.value
    ? data.value.body.toc.links.flatMap(({ id, children = [] }) => [
        id,
        ...children.map(({ id }) => id)
      ])
    : []
)

// console.log(computedIds.value) => ['title-1', 'sub-title-1', 'title-2', 'title-3', 'title-4']

const { activeId } = useActiveTitle(computedIds)
```

</details>

<br />

## 2. Configure the composable (optional)

`useActiveTitle` accepts an optional configuration object as its second argument:

```js
const { activeId, activeIndex, activeDataset } = useActiveTitle(titles, {
  debounce: 100
  // Other options...
})
```

| Property       | Type             | Default                   | Description                                                                                                                                                    |
| -------------- | ---------------- | ------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| jumpToFirst    | `boolean`        | true                      | Wheter to set the first target on mount as active even if not (yet) intersecting.                                                                              |
| jumpToLast     | `boolean`        | true                      | Wheter to set the last target as active once scroll arrives to bottom even if previous targets are entirely visible.                                           |
| debounce       | `number`         | 0                         | Time in ms to wait in order to get updated results once scroll is idle.                                                                                        |
| boundaryOffset | `BoundaryOffset` | { toTop: 0, toBottom: 0 } | Boundary offset in px for each scroll direction. Increase them to "anticipate" the active target detection.                                                    |
| overlayOffset  | `number`         | 0                         | It should match the height in pixels of any **CSS fixed** content that overlaps the top of your scrolling area. See also [adjusting overlayOffset paddings](). |
| minWidth       | `number`         | 0                         | Viewport width in px from which scroll listeners should be added/removed. Useful if you're hiding your sidebar with `display: none`.                           |

### Return object

The composable returns an object of reactive [refs](https://vuejs.org/api/reactivity-core.html#ref) plus a special function.

| Name            | Type                          | Description                                                                                      |
| --------------- | ----------------------------- | ------------------------------------------------------------------------------------------------ |
| activeId        | `Ref<string>`                 | DOM ID of the current active target                                                              |
| activeIndex     | `Ref<number>`                 | Index of the current active target in DOM tree order, `0` for the first title/section and so on. |
| activeDataset   | `Ref<Record<string, string>>` | Dataset of the current active target in plain object format                                      |
| setUnreachable  | `(id: string) => void`        | "Safe" function to manually set any unreachable target as active. [More info here]().            |
| isBottomReached | `Ref<boolean>`                | Whether scroll reached the bottom                                                                |

<br />

## 3. Create your Sidebar

If your sidebar links have exactly the same length of your targets array (very likely), all you need to style the active link is to compare the current `activeIndex` with the index of the rendered array.

For advanced scenarios like different lengths, nested links or track animations, simply use `activeId` or `activeDataset`.

Watch for any reactive property change and produce side effects like updating the URL hash.

Also, make sure to destructure `setUnreachable` from the composable and call it in any click callback by passing the target ID.

```vue
<script setup>
import { watch } from 'vue'
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
const { activeId, activeIndex, setUnreachable } = useActiveTitle(titleIds)

// Update URL hash on active target change
watch(activeId, (newId) => {
  history.replaceState(...history.state, '', `#${newId}`)
})
</script>

<template>
  <nav>
    <a
      v-for="(link, index) in tocLinks"
      @click="setUnreachable(link.titleId)"
      :href="link.titleId"
      :key="link.titleId"
      :class="[
        'link',
        {
          active: index === activeIndex // Or link.titleId === activeId
        }
      ]"
    >
      {{ link.label }}
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

### What is setUnreachable?

> :bulb: Unreachable targets are all those targets 100% visible once scrolled to the bottom of the page. Clicking on the correspondent link in the sidebar doesn't trigger any scroll event.

`setUnreachable` is a "safe" function that allows to set an unreachable target as active. "Safe" means that you can call it with any ID.

`useActiveTitle` will evaluate if the ID passed is unreachable, if yes, it will update the active target once scroll is idle and bottom is reached no matter what's the actual nearest target or if `jumpToLast` is active.

It is not mandatory to use it but you should definitely include it in any click handler.

<br />

## Adjusting overlayOffset targets' padding

You might noticed that if you have a fixed header and defined a `offsetTop`, once you scroll to a title its top edge may actually be underneath the header.

You must adjust the paddings and the margins of your titles to compensate the offset:

```js
const { activeId } = useActiveTitle(titleRefs, {
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
  margin: -100px 0 0 0; // /* Subtract topOffset from margin-top */
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

<br />

## License

MIT Licensed. (c) Simone Mastromattei 2023.
