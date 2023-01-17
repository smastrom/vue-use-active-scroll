# Vue Use Active Scroll

**Examples:** Vite: [Demo App]() — Nuxt Content: [TOC]() - [Nested TOC]()

:bulb: Requires Vue 3 or above.

<br />

## Why?

The [Intersection Observer](https://developer.mozilla.org/en-US/docs/Web/API/Intersection_Observer_API) is a great API.
But it may not be the one-size-fits-all solution to highlight menu/sidebar links.

You may noticed that clicking on some links highlights the wrong one (or does nothing) or that the active link doesn't reflect the one in the URL hash. But most important, you noticed that's tricky to obtain different behaviors according to different scroll interactions.

For example, you want to immediately highlight targets when scroll is originated from click but not when scroll is originated from wheel/touch.

**Vue Use Active Scroll** implements a custom scroll observer which automatically adapts to different interactions and always returns the "correct" active target.

### Features

- Precise and stable at any speed
- CSS scroll-behavior and callback agnostic
- Adaptive behavior on mount, scroll, click, cancel.
- Customizable boundary offsets for each direction
- Customizable behavior on top/bottom reached
- Supports containers different than window

### What it doesn't do?

- Mutate elements and inject styles
- Scroll to targets

<br />

## Installation

```bash
pnpm add vue-use-active-scroll
```

<br />

# Usage

## 1. Provide target IDs

Assuming your content looks like:

```html
<h2 id="introduction">Introduction</h2>
<p>...</p>
<h2 id="quick-start">Quick Start</h2>
<p>...</p>
<h2 id="props">Props</h2>
<p>...</p>
```

And your links look like:

```html
<nav>
  <a href="#introduction">Introduction</a>
  <a href="#quick-start">Quick Start</a>
  <a href="#props">Props</a>
</nav>
```

In your menu/sidebar component, provide the IDs of the targets to observe to `useActive` (order is not
important).

```vue
<!-- Sidebar.vue -->

<script setup>
import { useActive } from 'vue-reactive-toc'

const links = ref([
  { href: 'introduction', label: 'Introduction' },
  { href: 'quick-start', label: 'Quick Start' },
  { href: 'props', label: 'Props' }
]) // Data used to render your links

const targets = computed(() => links.map(({ href }) => href))
// console.log(targets.value) => ['introduction', 'quick-start', 'props']

const { isActive } = useActive(targets)
</script>
```

> :bulb: For a TOC, you want to target (and scroll) the headings of your sections (instead of the whole section) to ensure results better-aligned with users' reading flow.

<details><summary><strong>Nuxt Content</strong></summary>

<br />

Nuxt Content automatically applies IDs to your headings. You can get the TOC links by accessing `data.body.toc.links` via [queryContent](https://content.nuxtjs.org/api/composables/query-pages/).

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
  // ...
})
```

| Property       | Type               | Default                   | Description                                                                                                                                                           |
| -------------- | ------------------ | ------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| jumpToFirst    | `boolean`          | true                      | Whether to set the first target on mount as active even if not (yet) intersecting.                                                                                    |
| jumpToLast     | `boolean`          | true                      | Whether to set the last target as active once reached the bottom even if previous targets are entirely visible.                                                       |
| boundaryOffset | `BoundaryOffset`   | { toTop: 0, toBottom: 0 } | Boundary offset in px for each scroll direction. Tweak them to "anticipate" or "delay" target detection.                                                              |
| rootId         | `string` \| `null` | null                      | Id of the scrolling element. Set it only if your content **is not scrolled** by the window.                                                                           |
| replaceHash    | `boolean`          | false                     | Whether to replace URL hash on scroll. First target is ignored if `jumpToFirst` is true.                                                                              |
| overlayHeight  | `number`           | 0                         | Height in pixels of any **CSS fixed** content that overlaps the top of your scrolling area (e.g. fixed header). Must be paired with a CSS [scroll-margin-top]() rule. |
| minWidth       | `number`           | 0                         | Whether to toggle listeners and functionalities within a specific width. Useful if hiding the sidebar using `display: none`.                                          |

### Return object

| Name        | Type                      | Description                                                                                                                                       |
| ----------- | ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| setActive   | `(id: string) => void`    | Function to include in your click handlers in order to ensure proper behavior between any interaction which may trigger or cancel a scroll event. |
| isActive    | `(id: string) => boolean` | Whether the given Id is active or not                                                                                                             |
| activeId    | `Ref<string>`             | Id of the active target                                                                                                                           |
| activeIndex | `Ref<number>`             | Index of the active target in offset order, `0` for the first target and so on.                                                                   |

<br />

## 3. Create your sidebar

### **1.** Call `setActive` in your click handler by passing the anchor ID

```vue
<script setup>
// ...
const { isActive, setActive } = useActive(targets)
</script>

<template>
  <nav>
    <a
      @click="setActive(link.href) /* 👈🏻 */"
      v-for="(link, index) in links"
      :key="link.href"
      :href="`#${link.href}`"
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
</style>
```

Feel free to create your own click handler and to choose the scrolling strategy: CSS (smooth or auto), [scrollIntoView](https://developer.mozilla.org/en-US/docs/Web/API/Element/scrollIntoView) or even a library like [animated-scroll-to](https://github.com/Stanko/animated-scroll-to) with custom easings will work. Just remember to include `setActive` in your handler.

<details><summary><strong>Custom Scroll Callback</strong></summary>

<br />

```vue
<script setup>
import { useActive } from 'vue-active-target'
import animateScrollTo from 'animated-scroll-to'

// ...

const { isActive, setActive } = useActive(targets)

function scrollTo(event, id) {
  // ...
  setActive(id) // 👈🏻 Include setActive
  animateScrollTo(document.getElementById(id), {
    easing: easeOutBack,
    minDuration: 300,
    maxDuration: 600
  })
}
</script>

<template>
  <!-- ... -->
  <a
    v-for="(link, index) in links"
    @click="scrollTo($event, link.href)"
    :key="link.href"
    :href="`#${link.href}`"
  >
    {{ link.label }}
  </a>
  <!-- ... -->
</template>
```

</details>

### **2.** Use `isActive` to style the active link:

> :bulb: If you're playing with transitions or advanced styling rules simply leverage _activeIndex_ and _activeId_.

```vue
<script setup>
// ...
const { isActive, setActive } = useActive(targets)
</script>

<template>
  <nav>
    <a
      @click="setActive(link.href)"
      v-for="(link, index) in links"
      :key="link.href"
      :href="`#${link.href}`"
      :class="{
        active: isActive(link.href) /* 👈🏻 or link.href === activeId */
      }"
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

<details><summary><strong>RouterLink</strong></summary>

<br />

```vue
<RouterLink
  @click.native="setActive(link.href)"
  :to="{ hash: `#${link.href}` }"
  :class="{
    active: isActive(link.href)
  }"
  :ariaCurrentValue="`${isActive(link.href)}`"
  activeClass=""
  exactActiveClass=""
>
  {{ link.label }}
</RouterLink>
```

</details>

<details><summary><strong>NuxtLink</strong></summary>

<br />

```vue
<NuxtLink
  @click="setActive(link.href)"
  :href="`#${link.href}`"
  :class="{
    active: isActive(link.href)
  }"
>
  {{ link.label }}
</NuxtLink>
```

</details>

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

## Vue Router onMount hash scroll

If using Nuxt, Vue Router is already configured to scroll to the URL hash on page load.

If not using Nuxt and you're setting up Vue Router from scratch, you must enable the feature manually:

```js
const router = createRouter({
  // ...
  scrollBehavior(to) {
    if (to.hash) {
      return {
        el: to.hash
        // top: 100 // Eventual overlayHeight value
      }
    }
  }
})
```

```css
html {
  /* Or .container { */
  scroll-behavior: smooth; /* Or auto */
}
```

### Containers

The above rule will work if your content is scrolled by the window. If you want to scroll to a target inside a container, you must use `scrollIntoView`:

```js
const router = createRouter({
  // ...
  scrollBehavior(to) {
    if (to.hash) {
      // Content scrolled by container
      if (to.name === 'PageNameWithContainer') {
        return document.querySelector(to.hash).scrollIntoView()
      }
      // Content scrolled by window
      return {
        el: to.hash
      }
    }
  }
})
```

> :bulb: No need to set overlayHeight if using `scrollIntoView` as the method is aware of target's `scroll-margin-top` property.

<br />

## License

MIT
