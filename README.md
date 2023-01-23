![npm](https://img.shields.io/npm/v/vue-use-active-scroll?color=46c119) ![GitHub Workflow Status](https://img.shields.io/github/actions/workflow/status/smastrom/vue-use-active-scroll/tests.yml?branch=main&label=tests)
![dependency-count](https://img.shields.io/badge/dependency%20count-0-success)

# Vue Use Active Scroll

**Examples:** Vite: [Demo App](https://vue-use-active-scroll.netlify.app) — Nuxt Content: [Nested TOC](https://stackblitz.com/edit/github-oh85gq?file=components%2FSidebar.vue)

:bulb: Requires Vue 3 or above.

<br />

## Why?

The [Intersection Observer](https://developer.mozilla.org/en-US/docs/Web/API/Intersection_Observer_API) is a great API.
But it may not be the one-size-fits-all solution to highlight menu/sidebar links.

You may noticed that's tricky to customize behavior according to different interactions.

For example, you want to immediately highlight targets when scroll is originated from click/navigation but not when it is originated from wheel/touch. You want also to highlight any clicked link even if it will never intersect.

**Vue Use Active Scroll** implements a custom scroll observer which automatically adapts to different interactions and always returns the "correct" active target.

### Features

- Precise and stable at any speed
- CSS scroll-behavior and callback agnostic
- Adaptive behavior on mount, back/forward hash navigation, scroll, click, cancel.
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

| Property       | Type               | Default                   | Description                                                                                                                                                                                                       |
| -------------- | ------------------ | ------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| jumpToFirst    | `boolean`          | true                      | Whether to set the first target on mount as active even if not (yet) intersecting.                                                                                                                                |
| jumpToLast     | `boolean`          | true                      | Whether to set the last target as active once reached the bottom even if previous targets are entirely visible.                                                                                                   |
| boundaryOffset | `BoundaryOffset`   | { toTop: 0, toBottom: 0 } | Boundary offset in px for each scroll direction. Tweak them to "anticipate" or "delay" target detection.                                                                                                          |
| rootId         | `string` \| `null` | null                      | Id of the scrolling element. Set it only if your content **is not scrolled** by the window.                                                                                                                       |
| replaceHash    | `boolean`          | false                     | Whether to replace URL hash on scroll. First target is ignored if `jumpToFirst` is true.                                                                                                                          |
| overlayHeight  | `number`           | 0                         | Height in pixels of any **CSS fixed** content that overlaps the top of your scrolling area (e.g. fixed header). Must be paired with a CSS [scroll-margin-top](#setting-scroll-margin-top-for-fixed-headers) rule. |
| minWidth       | `number`           | 0                         | Whether to toggle listeners and functionalities within a specific width. Useful if hiding the sidebar using `display: none`.                                                                                      |

### Return object

| Name        | Type                      | Description                                                                                                                                   |
| ----------- | ------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| setActive   | `(id: string) => void`    | :firecracker: Function to include in your click handler to ensure adaptive behavior between any interaction that may cancel or resume scroll. |
| isActive    | `(id: string) => boolean` | Whether the given Id is active or not                                                                                                         |
| activeId    | `Ref<string>`             | Id of the active target                                                                                                                       |
| activeIndex | `Ref<number>`             | Index of the active target in offset order, `0` for the first target and so on.                                                               |

<br />

## 3. Create your sidebar

### **1.** Call _setActive_ in your click handler by passing the anchor ID

```vue
<!-- Sidebar.vue -->

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
```

<br />

### **2.** Define scroll behavior

You're free to choose between CSS (smooth or auto), [scrollIntoView](https://developer.mozilla.org/en-US/docs/Web/API/Element/scrollIntoView) or even a library like [animated-scroll-to](https://github.com/Stanko/animated-scroll-to).

#### A. Using CSS scroll-behavior

- If content is scrolled by the window, add the following CSS rule to your `html` element:

```css
html {
  scroll-behavior: smooth; /* or 'auto' */
}
```

- If content is scrolled by a container:

```css
html {
  scroll-behavior: auto; /* Keep it 'auto' */
}

.container {
  scroll-behavior: smooth;
}
```

<details><summary><strong>B. Custom Scroll Animation</strong></summary>

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

<br />

### **3.** Use _isActive_ or _activeId_ to style the active link:

> :bulb: If you're playing with transitions simply leverage _activeIndex_.

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

## Setting scroll-margin-top for fixed headers

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

## Vue Router scroll to hash on mount

If using Nuxt, Vue Router is already configured to scroll to the URL hash on page load or back/forward navigation.

If not using Nuxt and you're setting up Vue Router from scratch, you must enable the feature manually.

### Window

```js
const router = createRouter({
  // ...
  scrollBehavior(to) {
    if (to.hash) {
      return {
        el: to.hash
        // top: 100 // Eventual fixed header (overlayHeight)
      }
    }
  }
})
```

> :bulb: There's need to define _smooth_ or _auto_ here. Adding the [CSS rule](#2-define-scroll-behavior) is enough. Same applies below.

### Container

To scroll to a target scrolled by a container, you must use `scrollIntoView`:

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
