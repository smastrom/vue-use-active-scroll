![npm](https://img.shields.io/npm/v/vue-use-active-scroll?color=46c119) ![GitHub Workflow Status](https://img.shields.io/github/actions/workflow/status/smastrom/vue-use-active-scroll/tests.yml?branch=main&label=tests)
![dependency-count](https://img.shields.io/badge/dependency%20count-0-success)

# Vue Use Active Scroll

**Examples:** Vite: [Demo App](https://vue-use-active-scroll.netlify.app) — Nuxt Content: [Nested TOC](https://stackblitz.com/edit/github-oh85gq?file=components%2FSidebar.vue)

:bulb: Requires Vue 3 or above.

<br />

## Why?

The [Intersection Observer](https://developer.mozilla.org/en-US/docs/Web/API/Intersection_Observer_API) is a great API.
But it may not be the one-size-fits-all solution to highlight menu/sidebar links.

When smooth-scrolling, you may want to immediately highlight targets when scroll is originated from click/navigation but not when it is originated from wheel/touch. You may also want to highlight any clicked link even if it will never intersect.

**Vue Use Active Scroll** implements a custom scroll observer which automatically adapts to any type of scroll behaviors and interactions and always returns the "correct" active target.

### Features

- Precise and stable at any speed
- CSS scroll-behavior or JS scroll agnostic
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
<a href="#introduction">Introduction</a>
<a href="#quick-start">Quick Start</a>
<a href="#props">Props</a>
```

In your menu/sidebar component, provide the IDs to observe to `useActive` (order is not
important).

```vue
<!-- Sidebar.vue -->

<script setup>
import { useActive } from 'vue-use-active-scroll'

// Data to render links
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

You can provide either a reactive or a plain array of strings. If the array is reactive, the observer will reinitialize whenever it changes.

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

| Property       | Type                                                | Default                   | Description                                                                                                                                                                                                       |
| -------------- | --------------------------------------------------- | ------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| jumpToFirst    | `boolean`                                           | true                      | Whether to set the first target on mount as active even if not (yet) intersecting.                                                                                                                                |
| jumpToLast     | `boolean`                                           | true                      | Whether to set the last target as active once reached the bottom even if previous targets are entirely visible.                                                                                                   |
| boundaryOffset | `BoundaryOffset`                                    | { toTop: 0, toBottom: 0 } | Boundary offset in px for each scroll direction. Tweak them to "anticipate" or "delay" target detection.                                                                                                          |
| root           | `HTMLElement \| null` \| `Ref<HTMLElement \| null>` | null                      | Scrolling element. Set it only if your content **is not scrolled** by the window. If _null_, defaults to documentElement.                                                                                         |
| replaceHash    | `boolean`                                           | false                     | Whether to replace URL hash on scroll. First target is ignored if `jumpToFirst` is true.                                                                                                                          |
| overlayHeight  | `number`                                            | 0                         | Height in pixels of any **CSS fixed** content that overlaps the top of your scrolling area (e.g. fixed header). Must be paired with a CSS [scroll-margin-top](#setting-scroll-margin-top-for-fixed-headers) rule. |
| minWidth       | `number`                                            | 0                         | Whether to toggle listeners and functionalities within a specific width. Useful if hiding the sidebar using `display: none`.                                                                                      |

### Return object

| Name        | Type                      | Description                                                                          |
| ----------- | ------------------------- | ------------------------------------------------------------------------------------ |
| setActive   | `(id: string) => void`    | :firecracker: Function to include in your click handler to ensure adaptive behavior. |
| isActive    | `(id: string) => boolean` | Whether the given Id is active or not                                                |
| activeId    | `Ref<string>`             | Id of the active target                                                              |
| activeIndex | `Ref<number>`             | Index of the active target in offset order, `0` for the first target and so on.      |

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

#### A. Using native CSS scroll-behavior

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

<details><summary><strong>B. Custom JS Scroll</strong></summary>

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

You might noticed that if you have a fixed header and defined an `overlayHeight`, once you click to scroll to a target it may be underneath the header. You must add `scroll-margin-top` to your targets:

```js
useActive(targets, { overlayHeight: 100 })
```

```css
.target {
  scroll-margin-top: 100px; /* Add overlayHeight to scroll-margin-top */
}
```

<br />

## Vue Router scrollBehavior hash navigation

> :warning: If using Nuxt 3, Vue Router is already configured to scroll to and from URL hash on page load or back/forward navigation. **So you don't need to do follow the steps below**. Otherwise rules must be defined manually.

### Scrolling to hash

For content scrolled by the window, simply return the target element. To scroll to a target scrolled by a container, use _scrollIntoView_ method.

```js
const router = createRouter({
  // ...
  scrollBehavior(to) {
    if (to.hash) {
      // Content scrolled by a container
      if (to.name === 'PageNameUsingContainer') {
        return document.querySelector(to.hash).scrollIntoView()
      }

      // Content scrolled by the window
      return {
        el: to.hash
        // top: 100 // Eventual fixed header (overlayHeight)
      }
    }
  }
})
```

> :bulb: There's no need to define _smooth_ or _auto_ here. Adding the [CSS rule](#2-define-scroll-behavior) is enough.

> :bulb: There's no need need to set overlayHeight if using `scrollIntoView` as the method is aware of target's `scroll-margin-top` property.

### Scrolling from hash to the top of the page

To navigate back to the top of the same page (e.g. clicking on browser back button from a hash to the page root), use the _scroll_ method for containers and return _top_ for content scrolled by the window.

```js
const router = createRouter({
  // ...
  scrollBehavior(to, from) {
    if (from.hash && !to.hash) {
      // Content scrolled by a container
      if (
        to.name === 'PageNameUsingContainer' &&
        from.name === 'PageNameUsingContainer'
      ) {
        return document.querySelector('#ScrollingContainer').scroll(0, 0)
      }

      // Content scrolled by the window
      return { top: 0 }
    }
  }
})
```

<br />

## Prevent hash from being pushed

You may noticed that when clicking on a link, a new entry is added to the history. When navigating back, the page will scroll to the previous target and so on.

If you don't like that, you can prevent the hash from being pushed at all to the history:

```vue
<script setup>
// ...

function handleClick(event, id) {
  event.preventDefault() // 👈🏻 Prevent default behavior
  setActive(id) // 👈🏻 Set active target
  document.getElementById(id).scrollIntoView() // 👈🏻 Scroll to target with JS
}
</script>

<template>
  <nav>
    <a
      @click="handleClick($event, link.href)"
      v-for="(link, index) in links"
      :key="link.href"
      :href="`#${link.href}`"
      :class="{
        active: isActive(link.href)
      }"
    >
      {{ link.label }}
    </a>
  </nav>
</template>
```

If you still want the hash to be added to the URL but to not create a new history entry, you can use the _replaceState_ method.

```js
function handleClick(event, id) {
  event.preventDefault()
  setActive(id) // 👈🏻 Set active target
  history.replaceState(history.state, '', `#${id}`) // 👈🏻 Replace hash
  document.getElementById(id).scrollIntoView()
}
```

<br />

## Custom initialization / reinitialization

If the targets array is empty, _useActive_ won't initialize the scroll observer.

Whenever `root` or `targets` are updated, _useActive_ will reinitialize the observer.

```vue
<script setup>
// ...

const targets = ref([])
const root = ref(null)

const { isActive, setActive } = useActive(targets)

watch(someReactiveValue, async (newValue) => {
  await someAsyncFunction()

  // Whenever ready, update targets and root
  targets.value = ['id-1', 'id-2', 'id-3']
  root.value = document.getElementById('Container')
})
</script>
```

<br />

## License

MIT
