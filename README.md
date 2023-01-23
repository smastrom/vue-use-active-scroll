# Vue Use Active Scroll

**Examples:** Vite: [Demo App]() — Nuxt Content: [Nested TOC](https://stackblitz.com/edit/github-oh85gq?file=components%2FSidebar.vue)

:bulb: Requires Vue 3 or above.

<br />

## Why?

The [Intersection Observer](https://developer.mozilla.org/en-US/docs/Web/API/Intersection_Observer_API) is a great API.
But it may not be the one-size-fits-all solution to highlight menu/sidebar links.

You may noticed that last targets, may never intersect if entirely visible in the viewport. Clicking on their links highlights other links or does nothing. In addition to that, the URL hash may not reflect the active link.

But also, it's tricky to customize behavior according to different scroll interactions.

For example, you want to immediately highlight targets when scroll is originated from click but not when scroll is originated from wheel/touch.

**Vue Use Active Scroll** implements a custom scroll observer which automatically adapts to different interactions and always returns the "correct" active target.

### Features

- Precise and stable at any speed
- CSS scroll-behavior and callback agnostic
- Adaptive behavior on mount (hash), scroll, click, cancel.
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
import { useActive } from 'vue-use-active-scroll'

// Data used to render your links
const links = ref([
  { href: 'introduction', label: 'Introduction' },
  { href: 'quick-start', label: 'Quick Start' },
  { href: 'props', label: 'Props' }
])

const targets = computed(() => links.map(({ href }) => href))
// console.log(targets.value) => ['introduction', 'quick-start', 'props']

const { isActive } = useActive(targets)
</script>
```

> :bulb: For a TOC, you want to target (and scroll) the headings of your sections (instead of the whole section) to ensure results better-aligned with users' reading flow.

<details><summary><strong>Nuxt Content 2</strong></summary>

<br />

Nuxt Content automatically applies IDs to your headings. If enabled the [document-driven mode](https://content.nuxtjs.org/guide/writing/document-driven/) you can directly query the TOC in your sidebar component:

```js
const { toc } = useContent()
```

Then just compute the array of the IDs to observe (assuming max depth is 3):

```js
const targets = computed(() =>
  toc.value.links.flatMap(({ id, children = [] }) => [
    id,
    ...children.map(({ id }) => id)
  ])
)

const { setActive, isActive } = useActive(targets)
```

<details><summary><strong>Without Document-driven</strong></summary>

<br />

```js
const { data } = await useAsyncData('about', () =>
  queryContent('/about').findOne()
)

const targets = computed(() =>
  data.value
    ? data.value.body.toc.links.flatMap(({ id, children = [] }) => [
        id,
        ...children.map(({ id }) => id)
      ])
    : []
)

const { isActive } = useActive(targets)
```

</details>

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

| Name        | Type                      | Description                                                                                                                       |
| ----------- | ------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| setActive   | `(id: string) => void`    | :firecracker: Function to include in your click handler to ensure adaptive behavior between any futher scroll/cancel interaction. |
| isActive    | `(id: string) => boolean` | Whether the given Id is active or not                                                                                             |
| activeId    | `Ref<string>`             | Id of the active target                                                                                                           |
| activeIndex | `Ref<number>`             | Index of the active target in offset order, `0` for the first target and so on.                                                   |

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

Feel free to create your own click handler and to choose the scrolling strategy: CSS (smooth or auto), [scrollIntoView](https://developer.mozilla.org/en-US/docs/Web/API/Element/scrollIntoView) or even a library like [animated-scroll-to](https://github.com/Stanko/animated-scroll-to) with custom easings will work. Just remember to call `setActive` in your handler.

<details><summary><strong>Custom Scroll Callback</strong></summary>

<br />

```vue
<script setup>
import { useActive } from 'vue-use-active-scroll'
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
