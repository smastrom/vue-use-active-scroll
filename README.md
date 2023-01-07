# Vue Use Active Scroll

**Examples:** Vite: [Demo App]() — Nuxt Content: [TOC]() - [Nested TOC]()

:bulb: Requires Vue 3 or above.

<br />

## Why?

The [Intersection Observer](https://developer.mozilla.org/en-US/docs/Web/API/Intersection_Observer_API) is a great API.
But it may not be the one-size-fits-all solution for highlighting menu/sidebar links. You might noticed that:

- Scrolling speed affects accuracy
- Clicking on some links highlights different targets (or does nothing).
- Some targets never intersects once reached the bottom
- When accessing the page, active target doesn't reflect the one in the URL hash.
- Is tricky to customize behavior according to different interactions

> Vue Use Active Scroll implements a custom scroll observer that automatically deals with all these drabacks and simply returns only one active target: **the right one**.

### Features

- Precise and stable at any scroll speed
- Customizable boundary offsets for each scroll direction
- Customizable behavior on top/bottom reached
- Supports containers different than window
- Adaptive behavior on mount, scroll, click, cancel.
- CSS scroll-behavior and click callback agnostic

### What it doesn't do?

- Mutate your elements and styles
- Scroll to targets

<br />

## Installation

```bash
pnpm add vue-use-active-scroll
```

<br />

# Usage

## 1. Provide target IDs

In your menu/sidebar component, provide the IDs of the targets to observe to `useActive` (order is not important):

```vue
<script setup>
import { useActive } from 'vue-reactive-toc'

const targets = ref(['introduction', 'quick-start', 'props', 'events'])
// or 'reactive' or 'computed' or plain array of strings

const { isActive } = useActive(targets)
</script>
```

> :bulb: For a TOC, you most likely want to target (and scroll) the headings of your content (instead of the whole section) to ensure results coherent with users' reading flow.

<details><summary><strong>Using Inject (recommended)</strong></summary>

<br />

```vue
<!-- PageLayout.vue -->

<script setup>
impoty { ref, provide } from 'vue'

const targets = ref(['introduction', 'quick-start', 'props', 'events'])
// You most likely will compute them from your content

provide('SidebarData', {
  targets
  // Other stuff...
})
</script>

<template>
  <!-- <Content /> -->
  <Sidebar :targets="targets" />
</template>
```

```vue
<!-- Sidebar.vue -->

<script setup>
import { inject } from 'vue'
import { useActive } from 'vue-reactive-toc'

const { targets /* ...other stuff */ } = inject('SidebarData')

const { isActive } = useActive(targets)
</script>
```

</details>

<details><summary><strong>Using Props</strong></summary>

<br />

```vue
<!-- PageLayout.vue -->

<script setup>
impoty { ref } from 'vue'

const targets = ref(['introduction', 'quick-start', 'props', 'events'])
// You most likely will compute them from your content
</script>

<template>
  <!-- <Content /> -->
  <TocSidebar :targets="targets" />
</template>
```

```vue
<!-- Sidebar.vue -->

<script setup>
impoty { toRef } from 'vue'
import { useActive } from 'vue-reactive-toc'

const props = defineProps({
  targets: {
    type: Array,
    required: true
  }
})

const targets = toRef(props, 'targets')

const { isActive } = useActive(targets)
</script>
```

</details>

<details><summary><strong>Nuxt Content</strong></summary>

<br />

Nuxt Content automatically applies IDs to your headings. You can get the TOC links by accessing `data.body.toc.links` using [queryContent](https://content.nuxtjs.org/api/composables/query-pages/).

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
    children: [{ id: 'subtitle-1', depth: 3, text: 'Subtitle 1' }] // Nested
  },
  { id: 'title-2', depth: 2, text: 'Title 2' },
  { id: 'title-3', depth: 2, text: 'Title 3' },
  { id: 'title-4', depth: 2, text: 'Title 4' }
]
```

You can compute a flat array of the IDs to observe by mapping `data.body.toc.links`:

```js
const targets = computed(() =>
  data.value
    ? data.value.body.toc.links.flatMap(({ id, children = [] }) => [
        id,
        ...children.map(({ id }) => id)
      ])
    : []
)

// console.log(targets.value) => ['title-1', 'subtitle-1', 'title-2', 'title-3', 'title-4']

const { isActive } = useActive(targets)
```

</details>

<br />

## 2. Configure the composable (optional)

`useActive` accepts an optional configuration object as its second argument:

```js
const { isActive, setActive } = useActive(targets, {
  // Options...
})
```

| Property       | Type               | Default                   | Description                                                                                                                                                        |
| -------------- | ------------------ | ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| jumpToFirst    | `boolean`          | true                      | Whether to set the first target on mount as active even if not (yet) intersecting.                                                                                 |
| jumpToLast     | `boolean`          | true                      | Whether to set the last target as active once reached the bottom.                                                                                                  |
| boundaryOffset | `BoundaryOffset`   | { toTop: 0, toBottom: 0 } | Boundary offset in px for each scroll direction. Tweak them to "anticipate" or "delay" targets detection. Respected only when scroll is not originated from click. |
| rootId         | `string` \| `null` | null                      | Id of the scrolling element. Set it only if your content **is not scrolled** by the window.                                                                        |
| replaceHash    | `boolean`          | false                     | Whether to replace URL hash on scroll. First target is ignored if `jumpToFirst` is true.                                                                           |
| minWidth       | `number`           | 0                         | Viewport width in px from which scroll listeners should be toggled. Useful if hiding the sidebar with `display: none` within a specific width.                     |
| overlayHeight  | `number`           | 0                         | Height in pixels of any **CSS fixed** content that overlaps the top of your scrolling area. See also [adjusting overlayHeight margin]().                           |

### Return object

| Name        | Type                      | Description                                                                                                      |
| ----------- | ------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| isActive    | `(id: string) => boolean` | Whether the given Id is active or not                                                                            |
| setActive   | `(id: string) => void`    | Function to set active targets and ensure proper behavior between scroll from wheel/touch and scroll from click. |
| activeId    | `Ref<string>`             | Id of the active target                                                                                          |
| activeIndex | `Ref<number>`             | Index of the active target in DOM tree order, `0` for the first target and so on.                                |

<br />

## 3. Create your sidebar

### **1.** Call `setActive` in your click handler by passing the anchor ID

> :bulb: _setActive_ doesn't scroll to the target but ensures proper behavior between scroll from wheel/touch scroll and scroll from click.

```vue
<script setup>
// ...
const { isActive, setActive } = useActive(targets)
</script>

<template>
  <nav>
    <a
      v-for="(link, index) in links"
      @click="setActive(link.href) /* 👈🏻 */"
      :href="link.href"
      :key="link.href"
    >
      {{ link.label }}
    </a>
  </nav>
</template>
```

You are totally free to create your own click handler and choose the scrolling strategy: CSS (smooth or auto), [scrollIntoView](https://developer.mozilla.org/en-US/docs/Web/API/Element/scrollIntoView) or even a scroll library like [animated-scroll-to](https://github.com/Stanko/animated-scroll-to) with custom easings will work. Just remember to include `setActive` in your handler.

<details><summary><strong>Custom Scroll Callback</strong></summary>

<br />

```vue
<script setup>
import { useActive } from 'vue-active-target'
import animateScrollTo from 'animated-scroll-to'

// ...

const { isActive, setActive } = useActive(targets)

function scrollTo(event, targetId) {
  // ...
  setActive(targetId) // 👈🏻 Include setActive
  animateScrollTo(document.getElementById(targetId), {
    easing: easeOutBack,
    minDuration: 300,
    maxDuration: 600
  })
}
</script>

<template>
  <!-- ... -->
  <a
    v-for="(item, index) in links"
    @click="scrollTo($event, item.targetId)"
    :href="item.targetId"
    :key="item.targetId"
    :class="{ active: isActive(item.targetId) }"
  >
    {{ link.label }}
  </a>
  <!-- ... -->
</template>
```

</details>

### **2.** Use `isActive` to style the active link:

```vue
<script setup>
// ...
const { isActive } = useActive(targets)
</script>

<template>
  <nav>
    <a
      v-for="(link, index) in links"
      @click="setActive(link.href)"
      :href="link.href"
      :key="link.href"
      :class="{ active: isActive(link.href) /* 👈🏻 */ }"
    >
      {{ link.label }}
    </a>
  </nav>
</template>

<style>
html {
  /* or .container { */
  scroll-behavior: smooth; /* or 'auto' */
}

.active {
  color: #f00;
}
</style>
```

> :bulb: If you're playing with transitions or advanced styling rules simply use of _activeIndex_ and _activeId_.

<br />

## Adjusting overlayHeight targets' margin

You might noticed that if you have a fixed header and defined an `overlayHeight`, once you click to scroll to a target it may be underneath the header. You must set `scroll-margin-top` to your targets:

```js
useActive(targets, { overlayHeight: 100 })
```

```css
.target {
  scroll-margin-top: 100px; /* Add overlayHeight to scroll-margin-top */
}
```

<br />

## License

MIT
