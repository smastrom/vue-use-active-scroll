![npm](https://img.shields.io/npm/v/vue-use-active-scroll?color=46c119) ![GitHub Workflow Status](https://img.shields.io/github/actions/workflow/status/smastrom/vue-use-active-scroll/tests.yml?branch=main&label=tests)
![dependency-count](https://img.shields.io/badge/dependency%20count-0-success)

# Vue Use Active Scroll

**Examples:** Vite: [Demo App](https://vue-use-active-scroll.netlify.app) — Nuxt Content: [Nested TOC](https://stackblitz.com/edit/github-oh85gq?file=components%2FSidebar.vue)

<br />

## Why?

The [Intersection Observer](https://developer.mozilla.org/en-US/docs/Web/API/Intersection_Observer_API) is a great API.
But it may not be the one-size-fits-all solution to highlight nav/sidebar links.

_You may want to:_

-  Highlight any clicked link even if it will never intersect
-  Get consistent results regardless of scroll speed
-  Immediately highlight links on click/hash navigation if smooth scrolling is enabled
-  Prevent unnatural highlighting with custom easings or smooth scrolling

**Vue Use Active Scroll** implements a custom scroll observer which automatically adapts to any type of scroll behavior and interaction and always returns the "correct" active target.

### Features

-  Precise and stable at any speed
-  CSS scroll-behavior or JS scroll agnostic
-  Adaptive behavior on mount, hash navigation, scroll, click, cancel.
-  Customizable offsets for each scroll direction
-  Customizable offsets for first and last target
-  Customizable behavior on top/bottom reached
-  Supports custom scrolling containers

### What it doesn't do?

-  **Scroll to targets**
-  Mutate elements and inject styles
-  Enforce specific scroll behaviors
-  Enforce/configure/alter hash navigation

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

And your nav links will look like:

```html
<a href="#introduction">Introduction</a>
<a href="#quick-start">Quick Start</a>
<a href="#props">Props</a>
```

In your nav/sidebar component, provide the IDs to observe to `useActive` (order is not
important).

> :bulb: For a TOC, you may want to target (and scroll) the headings of your sections (instead of the whole section) to ensure results better-aligned with users' reading flow.

```vue
<!-- Sidebar.vue -->

<script setup>
import { useActive } from 'vue-use-active-scroll'

// Data to render links, in real life you may pass them as prop, use inject() etc...
const links = ref([
   { href: 'introduction', label: 'Introduction' },
   { href: 'quick-start', label: 'Quick Start' },
   { href: 'props', label: 'Props' },
])

const targets = computed(() => links.value.map(({ href }) => href))
// console.log(targets.value) => ['introduction', 'quick-start', 'props']

const { isActive } = useActive(targets)
</script>
```

You can provide either a reactive or a plain array of strings. If the array is reactive, the observer will reinitialize whenever it changes.

If an empty array is provided, the observer won't be initialized until the array is populated.

### What if my targets don't have IDs?

There might be cases where you lack control over the rendered HTML and no IDs nor TOC are provided. Assuming your content is wrapped by container that you can access via a ref or a selector:

```vue
<!-- Sidebar.vue -->

<script setup>
const links = ref([])

function setLinks() {
   // 1. Collect targets
   const targets = Array.from(
      document.getElementById('ArticleContent').querySelectorAll('h2')
   )

   targets.forEach((target) => {
      // 2. Generate an ID from their text content and add it
      target.id = target.textContent.toLowerCase().replace(/\s+/g, '-')
      // 3. Populate the array
      links.value.push({
         href: target.id,
         label: target.textContent,
      })
   })
}

onMounted(() => {
   setLinks()
})

// 4. Compute the array of IDs to observe
const targets = computed(() => links.value.map(({ href }) => href))

// 5. Provide it to useActive
const { isActive } = useActive(targets)
</script>
```

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
      ...children.map(({ id }) => id),
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
           ...children.map(({ id }) => id),
        ])
      : []
)

const { isActive } = useActive(targets)
```

</details>

</details>

<br />

## 2. Customize the composable (optional)

`useActive` accepts an optional configuration object as its second argument:

```js
const { isActive, setActive } = useActive(targets, {
   // ...
})
```

| Property       | Type                                                | Default                    | Description                                                                                                                                                                                                       |
| -------------- | --------------------------------------------------- | -------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| jumpToFirst    | `boolean`                                           | true                       | Whether to set the first target on mount as active even if not (yet) intersecting.                                                                                                                                |
| jumpToLast     | `boolean`                                           | true                       | Whether to set the last target as active once reached the bottom even if previous targets are entirely visible.                                                                                                   |
| boundaryOffset | `BoundaryOffset`                                    | { toTop: 0, toBottom: 0 }  | Boundary offset in px for each scroll direction. Tweak them to "anticipate" or "delay" target detection.                                                                                                          |
| edgeOffset     | `EdgeOffset`                                        | { first: 100, last: -100 } | Offset in px for fist and last target. `first` has no effect if `jumpToFirst` is true. Same for `last` if `jumpToLast` is true.                                                                                   |
| root           | `HTMLElement \| null` \| `Ref<HTMLElement \| null>` | null                       | Scrolling element. Set it only if your content **is not scrolled** by the window. If _null_, defaults to documentElement.                                                                                         |
| replaceHash    | `boolean`                                           | false                      | Whether to replace URL hash on scroll. First target is ignored if `jumpToFirst` is true.                                                                                                                          |
| overlayHeight  | `number`                                            | 0                          | Height in pixels of any **CSS fixed** content that overlaps the top of your scrolling area (e.g. fixed header). Must be paired with a CSS [scroll-margin-top](#setting-scroll-margin-top-for-fixed-headers) rule. |
| minWidth       | `number`                                            | 0                          | Whether to toggle listeners and functionalities within a specific width. Useful if hiding the sidebar using `display: none`.                                                                                      |

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

:bulb: _setActive_ doesn't scroll to targets. It just informs the observer that scroll from click is about to happen so that it can adapt its behavior.

<br />

### **2.** Define scroll behavior

You're free to choose between CSS (smooth or auto), [scrollIntoView](https://developer.mozilla.org/en-US/docs/Web/API/Element/scrollIntoView) or even a library like [animated-scroll-to](https://github.com/Stanko/animated-scroll-to).

#### A. Using native CSS scroll-behavior (recommended)

-  If content is scrolled by the window, add the following CSS rule to your `html` element:

```css
html {
   scroll-behavior: smooth; /* or 'auto' */
}
```

-  If content is scrolled by a container:

```css
html {
   scroll-behavior: auto; /* Keep it 'auto' */
}

.Container {
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
      maxDuration: 600,
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
            ActiveLink: isActive(link.href) /* 👈🏻 or link.href === activeId */,
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

.ActiveLink {
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
      active: isActive(link.href),
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
      active: isActive(link.href),
   }"
>
  {{ link.label }}
</NuxtLink>
```

</details>

<br />

## Setting scroll-margin-top for fixed headers

You might noticed that if you have a fixed header and defined an `overlayHeight`, once clicked to scroll, the target may be underneath the header. You must add `scroll-margin-top` to your targets:

```js
useActive(targets, { overlayHeight: 100 })
```

```css
.target {
   scroll-margin-top: 100px; /* Add overlayHeight to scroll-margin-top */
}
```

<br />

## Vue Router - Scroll to hash on mount / navigation

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
            el: to.hash,
            // top: 100 // Eventual fixed header (overlayHeight)
         }
      }
   },
})
```

> :bulb: There's no need to define _smooth_ or _auto_ here. Adding the [CSS rule](#2-define-scroll-behavior) is enough.

> :bulb: There's no need need to set overlayHeight if using `scrollIntoView` as the method is aware of target's `scroll-margin-top` property.

### Scrolling from hash back to the top of the page

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
            return document.getElementById('ScrollingContainer').scroll(0, 0)
         }

         // Content scrolled by the window
         return { top: 0 }
      }
   },
})
```

<br />

## Vue Router - Prevent hash from being pushed

You may noticed that when clicking on a link, a new entry is added to the history. When navigating back, the page will scroll to the previous target and so on.

If you don't like that, choose to replace instead of pushing the hash:

```vue
<template>
   <!-- ... -->
   <RouterLink
      @click.native="setActive(link.href)"
      :to="{ hash: `#${item.href}`, replace: true /* 👈🏻 */ }"
      :class="{
         active: isActive(link.href),
      }"
   />
   <!-- ... -->
</template>
```

<br />

## License

MIT
