![npm](https://img.shields.io/npm/v/vue-use-active-scroll?color=46c119) ![GitHub Workflow Status](https://img.shields.io/github/actions/workflow/status/smastrom/vue-use-active-scroll/tests.yml?branch=main&label=tests)
![dependency-count](https://img.shields.io/badge/dependency%20count-0-success)

# Vue Use Active Scroll

[Live Demo](https://vue-use-active-scroll.netlify.app/)

<br />

**Examples**

[With Template Refs](https://stackblitz.com/edit/vitejs-vite-sywzg8?file=src%252Fpages%252FIndex.vue) - [Nuxt Content Nested TOC](https://stackblitz.com/edit/github-oh85gq?file=components%2FSidebar.vue) - [Markup from a CMS](https://stackblitz.com/edit/vitejs-vite-9feebm?file=src%252Fpages%252FIndex.vue)

<br />

## Why?

The [Intersection Observer](https://developer.mozilla.org/en-US/docs/Web/API/Intersection_Observer_API) is a great API.
But it may not be the one-size-fits-all solution to highlight nav/sidebar links. Most likely because you want to:

-  Highlight any clicked link even if it will never intersect
-  Always highlight first/last link once reached the top/bottom of the page
-  Get consistent results regardless of scroll speed
-  Immediately highlight links on click/hash navigation if smooth scrolling is enabled
-  Avoid unnatural highlighting with custom easings or smooth scrolling

**Vue Use Active Scroll** implements a custom scroll observer which automatically adapts to any type of scroll behavior and trigger and always returns the "correct" active target.

### Do you really need it?

If you don't care about the above gotchas, then no, please **don't use this package** because it adds a couple of KBs to your JS bundle that you don't need.

You can achieve a good result with the Intersection Observer API as well. The [Astro docs TOC](https://github.com/withastro/docs/blob/main/src/components/RightSidebar/TableOfContents.tsx) is a great example in just 30 lines of code.

Moreover, this package is meant for highlighting links in vertical sidebars and may be overkill for other use cases lik menu header links.

<br />

## Features

-  Precise and stable at any speed
-  CSS scroll-behavior or JS scroll agnostic
-  Adaptive behavior on mount, hash and prev/next navigation, scroll, click, cancel.
-  Customizable offsets for each scroll direction
-  Customizable offsets for first and last target
-  Customizable behavior on top/bottom reached
-  Supports custom scrolling containers
-  Supports both plain ids and template refs

### What it doesn't do?

-  **Scroll to targets**
-  Mutate the DOM and inject styles
-  Require specific scroll behavior
-  Require or configure hash navigation

<br />

## Requirements

If scrolling to anchors, Vue Router (RouterLink / NuxtLink) is required.

<br />

## Installation

```bash
pnpm add vue-use-active-scroll

# yarn add vue-use-active-scroll
# npm i vue-use-active-scroll
# bun add vue-use-active-scroll
```

<br />

## Usage

This package exports a single composable named `useActiveScroll` which accepts an array of targets to observe with the following signature:

```ts
type Targets = Ref<HTMLElement[]> | Ref<string[]>
```

You can provide targets using template refs, HTML elements or DOM IDs.

The composable returns an object with properties to react to the active link and a **method to include in your click handler**: it doesn't scroll to targets and it's required if scroll is also originated by clicks.

```ts
const { setActive, activeId, activeIndex /*, ... */ } = useActiveScroll(targets)
```

> :warning: In case you setup Vue Router from scratch (e.g. Vite SPA), please make sure that you have configured [scroll behavior](#vue-router---scroll-to-and-from-hash) in your router instance.
>
> This is not required if using Nuxt as it's already configured by the framework.

---

### Scenario 1 - Template refs (preferred)

If you are in charge of rendering the content nodes (e.g. using `v-for`), simply pass the template refs to `useActiveScroll`:

```vue
<script setup>
import { ref, reactive, computed } from 'vue'
import { useActiveScroll } from 'vue-use-active-scroll'

// This may come from a CMS, markdown file, etc.
const content = reactive([
   { id: 'introduction', title: 'Introduction', content: '...' },
   { id: 'quick-start', title: 'Quick Start', content: '...' }, // ...
])

const links = computed(() =>
   content.map(({ id, title }) => ({ href: id, label: title }))
)

const targets = ref([])

const { setActive, activeId } = useActiveScroll(targets)
</script>

<template>
   <!-- Content -->
   <section v-for="section in content">
      <h2 :id="section.id" ref="targets">{{ section.title }}</h2>
      <p>{{ section.content }}</p>
   </section>

   <!-- Sidebar -->
   <nav>
      <RouterLink
         v-for="link in links"
         @click="setActive(link.href)"
         :key="link.href"
         :to="{ hash: `#${link.href}` }"
         :ariaCurrentValue="link.href === activeId"
         :class="{ 'sidebar-link--active': link.href === activeId }"
      >
         {{ link.label }}
      </RouterLink>
   </nav>
</template>
```

### Scenario 2 - Nuxt Content `<ContentDoc />`

Nuxt Content is great because not only automatically applies IDs to your headings, but also provides a `useContent` composable to query a reactive TOC in any component.

Since the object is reactive and kept in sync with the content, you can directly pass the IDs to `useActiveScroll`:

```vue
<script setup lang="ts">
import { useActiveScroll } from 'vue-use-active-scroll'

const { toc } = useContent()

// ['introduction', 'introduction-sub-1', 'quick-start']
const ids = computed(() =>
   toc.value.links.flatMap(({ id, children = [] }) => [
      id,
      ...children.map(({ id }) => id), // Flatten any nested link
   ])
)

const { setActive, activeId } = useActiveScroll(ids)
</script>

<template>
   <ContentDoc />

   <nav>
      <NuxtLink
         v-for="link in toc.links"
         @click="setActive(link.id)"
         :key="link.id"
         :to="`#${link.id}`"
         :ariaCurrentValue="link.href === activeId"
         :class="{ 'sidebar-link--active': activeId === link.id }"
      >
         {{ link.text }}
      </NuxtLink>
   </nav>
</template>
```

### Scenario 3 - Incoming HTML

In this case, you must query the DOM in an `onMounted` hook or a watcher in order to get the targets.

Many CMSs already append IDs to markup headings. In case yours doesn't, you can add them manually.

The below example also shows how to compute the sidebar links in case you are not able to retrieve them in advance in order to cover the worst case scenario.

```vue
<script setup>
import { ref, watch } from 'vue'
import { useActiveScroll } from 'vue-use-active-scroll'

const container = ref(null)
const targets = ref([])
const links = ref([])

function resetTargets() {
   targets.value = []
   links.value = []
}

function setTargets(container) {
   const _targets = []
   const _links = []

   container.querySelectorAll('h2').forEach((h2) => {
      /**
       * Add IDs to headings if your CMS doesn't
       */
      h2.id = h2.textContent.toLowerCase().replace(/\s+/g, '-')

      _targets.push(h2)
      _links.push({ href: h2.id, label: h2.textContent })
   })

   links.value = _links
   targets.value = _targets
}

watch(container, (c) => (c ? setTargets(c) : resetTargets()), {
   immediate: true,
   flush: 'post',
})

const { setActive, activeId } = useActiveScroll(targets)
</script>

<template>
   <!-- Content -->
   <article v-html="data.html" ref="container" />

   <!-- Sidebar -->
   <nav>
      <RouterLink
         v-for="link in links"
         @click="setActive(link.href)"
         :key="link.href"
         :to="{ hash: `#${link.href}` }"
         :ariaCurrentValue="link.href === activeId"
         :class="{ 'sidebar-link--active': link.href === activeId }"
      >
         {{ link.label }}
      </RouterLink>
   </nav>
</template>
```

<br />

## Customization

`useActiveScroll` accepts an optional configuration object as last argument:

```js
const { activeId, setActive } = useActiveScroll(targets, {
   // ...
})
```

| Property       | Type                                                | Default                    | Description                                                                                                                                                                                                       |
| -------------- | --------------------------------------------------- | -------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| jumpToFirst    | `boolean`                                           | true                       | Whether to set the first target on mount as active even if not (yet) intersecting.                                                                                                                                |
| jumpToLast     | `boolean`                                           | true                       | Whether to set the last target as active once reached the bottom even if previous targets are entirely visible.                                                                                                   |
| boundaryOffset | `BoundaryOffset`                                    | { toTop: 0, toBottom: 0 }  | Boundary offset in px for each scroll direction. Tweak them to "anticipate" or "delay" target detection.                                                                                                          |
| edgeOffset     | `EdgeOffset`                                        | { first: 100, last: -100 } | Offset in px for fist and last target. `first` has no effect if `jumpToFirst` is true. Same for `last` if `jumpToLast` is true.                                                                                   |
| root           | `HTMLElement \| null` \| `Ref<HTMLElement \| null>` | null                       | Scrolling element. Set it only if your content **is not scrolled** by the window. If _null_, defaults to _document.documentElement_.                                                                              |
| replaceHash    | `boolean`                                           | false                      | Whether to replace URL hash on scroll. First target is ignored if `jumpToFirst` is true.                                                                                                                          |
| overlayHeight  | `number`                                            | 0                          | Height in pixels of any **CSS fixed** content that overlaps the top of your scrolling area (e.g. fixed header). Must be paired with a CSS [scroll-margin-top](#setting-scroll-margin-top-for-fixed-headers) rule. |
| minWidth       | `number`                                            | 0                          | Whether to toggle listeners and functionalities within a specific width. Useful if hiding the sidebar using `display: none`.                                                                                      |

### Return object

| Name        | Type                                         | Description                                                                          |
| ----------- | -------------------------------------------- | ------------------------------------------------------------------------------------ |
| setActive   | `(id: string \| el: HTMLElement) => void`    | :firecracker: Function to include in your click handler to ensure adaptive behavior. |
| isActive    | `(id: string \| el: HTMLElement) => boolean` | Whether the given ID or element is active or not                                     |
| activeEl    | `Ref<HTMLElement \| null>`                   | Active target element                                                                |
| activeId    | `Ref<string>`                                | Active target ID                                                                     |
| activeIndex | `Ref<number>`                                | Index of the active target in offset order, `0` for the first target and so on.      |

<br />

## Defining scroll behavior

You're free to choose between CSS (smooth or auto), [scrollIntoView](https://developer.mozilla.org/en-US/docs/Web/API/Element/scrollIntoView) or even a library like [animated-scroll-to](https://github.com/Stanko/animated-scroll-to).

### CSS scroll-behavior (recommended)

-  Content scrolled by the window:

```css
html {
   scroll-behavior: smooth; /* or 'auto' */
}
```

-  Content scrolled by a container:

```css
.scrolling-container {
   scroll-behavior: smooth;
}
```

### Custom JS scroll

```vue
<script setup>
import { useActiveScroll } from 'vue-use-active-scroll'
import animateScrollTo from 'animated-scroll-to'

// ...

const { setActive, activeId } = useActiveScroll(targets)

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
   <button
      v-for="link in links"
      @click="scrollTo($event, link.href)"
      :class="{ 'sidebar-btn--active': link.href === activeId }"
   >
      {{ link.label }}
   </button>
</template>
```

<br />

## Vue Router - Scroll to and from anchors

> :warning: If using Nuxt, Vue Router is already configured to scroll to and from anchors on page load or back/forward navigation. **So you don't need to do follow the steps below**. Otherwise rules must be defined manually.

### Scrolling to anchors

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

### Scrolling from anchor back to the top of the page

To navigate back to the top of the same page (e.g. clicking on browser's back button from hash to the page root), use the _scroll_ method for containers and return _top_ for content scrolled by the window.

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
            return document.getElementById('scrolling_container').scroll(0, 0)
         }

         // Content scrolled by the window
         return { top: 0 }
      }
   },
})
```

### Preventing hash from being pushed

You may noticed that when clicking on a link, a new entry is added to the history. When navigating back, the page will scroll to the previous target and so on.

If you don't like that, choose to replace instead of pushing the hash:

```vue
<template>
   <!-- ... -->
   <RouterLink
      @click="setActive(link.href)"
      :to="{ hash: `#${item.href}`, replace: true /* 👈🏻 */ }"
      :class="{
         active: link.href === activeId,
      }"
   />
   <!-- ... -->
</template>
```

<br />

## Server-side rendering

Since `useActiveScroll` won't kick in until the page is hydrated, if you're using Nuxt, you might want to render the first link as active if on the server.

```vue
<script setup>
const isSSR = ref(true)

onMounted(() => (isSSR.value = false))
</script>

<template>
   <nav>
      <RouterLink
         v-for="(link, idx) in links"
         :class="{
            'sidebar-link--active':
               (isSSR && idx === 0) || link.href === activeId,
         }"
      >
         {{ link.label }}
      </RouterLink>
   </nav>
</template>
```

<br />

## Setting scroll-margin-top for fixed headers

You might noticed that if you have a fixed header and defined an `overlayHeight`, once clicked to scroll, the target may be underneath the header. You must add `scroll-margin-top` to your targets:

```js
useActiveScroll(targets, { overlayHeight: 100 })
```

```css
.target {
   scroll-margin-top: 100px;
}
```

<br />

## License

MIT
