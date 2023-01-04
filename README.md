# Vue Use Active Scroll

### Reactive TOC/sidebar links without compromises.

:bulb: Requires Vue 3 or above.

<br />

## Why?

Highlighting sidebar links using the [Intersection Observer](https://developer.mozilla.org/en-US/docs/Web/API/Intersection_Observer_API) may have various drawbacks:

- Scrolling speed affects accuracy
- Last links may never be highlighted once reached the bottom
- Clicking on some links highlights different links (or does nothing).
- When accessing the page, the active target may not reflect the one in the the URL hash.
- Observer configuration cannot be tweaked dynamically

> If you're struggling with any of these issues, this package might help you.

<br />

## What is it?

It is a Vue 3 composable that implements a custom scroll observer and returns **reactive data** of the current active target.

### Features

- Accurate results at any scroll speed
- Customizable boundary offsets for each scroll direction
- Automatic adaptive behavior on mount, scroll, click and resume
- CSS scroll-behavior/click callback agnostic
- ~1.5KB (gzipped) without dependencies

### What it doesn't do?

- Mutate your elements and styles
- Scroll to targets

### Limitations

Vue Use Active Scroll doesn't support horizontal scrolling.

<br />

## Installation

```bash
pnpm add vue-reactive-toc
```

<br />

# Usage

## 1. Provide targets

> :bulb: In other scenarios, you might want to target different elements as the example below is intended for a TOC menu/sidebar.

In order to get results consistent with users' reading flow, targets to be observed should match the titles (h2, h3...) of your sections.

Make sure that each target has an unique `id` attribute (which corresponds to the anchor to scroll to) and pass them to `useActive`. Order is not important.

You most likely will call `useActive` in the [setup function](https://v3.vuejs.org/guide/composition-api-setup.html#setup-function-arguments) of your menu/sidebar component.

```vue
<script setup>
import { useActive } from 'vue-reactive-toc'

const titleIds = ref(['title-1', 'title-2', 'title-3'])
// or computed(() => /* ... */), or props.titleIds, etc...

const { isActive } = useActive(titleIds)
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
const { isActive, setActive } = useActive(titles, {
  // Options...
})
```

| Property       | Type               | Default                   | Description                                                                                                                                                        |
| -------------- | ------------------ | ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| jumpToFirst    | `boolean`          | true                      | Whether to set the first target on mount as active even if not (yet) intersecting.                                                                                 |
| jumpToLast     | `boolean`          | true                      | Whether to set the last target as active once scroll reaches the bottom.                                                                                           |
| boundaryOffset | `BoundaryOffset`   | { toTop: 0, toBottom: 0 } | Boundary offset in px for each scroll direction. Tweak them to "anticipate" or "delay" targets detection. Respected only when scroll is not originated from click. |
| rootId         | `string` \| `null` | null                      | Id of the scrolling element. Set it only if your content is **not scrolled** by the window. If null defaults to documentElement.                                   |
| replaceHash    | `boolean`          | false                     | Whether to replace URL hash on scroll. First target is ignored if `jumpToFirst` is true.                                                                           |
| minWidth       | `number`           | 0                         | Viewport width in px from which scroll listeners should be toggled. Useful if hiding the sidebar with `display: none` within a specific width.                     |
| overlayHeight  | `number`           | 0                         | Height in pixels of any **CSS fixed** content that overlaps the top of your scrolling area. See also [adjusting overlayHeight paddings]().                         |

### Return object

| Name        | Type                      | Description                                                                                                 |
| ----------- | ------------------------- | ----------------------------------------------------------------------------------------------------------- |
| isActive    | `(id: string) => boolean` | Whether the given Id is active or not                                                                       |
| setActive   | `(id: string) => void`    | Function to set active targets and ensure proper behavior between wheel/touch scroll and scroll from click. |
| activeId    | `Ref<string>`             | Id of the active target                                                                                     |
| activeIndex | `Ref<number>`             | Index of the active target in DOM tree order, `0` for the first target and so on.                           |

<br />

## 3. Create your sidebar

**1.** Use `isActive` to style the active link:

```vue
<script setup>
// ...
const { isActive } = useActive(titles)
</script>

<template>
  <nav>
    <a
      v-for="(link, index) in links"
      :href="link.targetId"
      :key="link.targetId"
      :class="{ active: isActive(link.targetId) /* 👈🏻 */ }"
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

**2.** Call `setActive` in your click handler by passing the anchor ID.

> :bulb: _setActive_ doesn't scroll to the target but just ensures proper behavior between wheel/touch scroll and scroll from click.

```vue
<script setup>
// ...
const { isActive, setActive } = useActive(titles)
</script>

<template>
  <nav>
    <a
      v-for="(link, index) in links"
      @click="setActive(link.targetId) /* 👈🏻 */"
      :href="link.targetId"
      :key="link.targetId"
      :class="{ active: isActive(link.targetId) }"
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

const { isActive, setActive } = useActive(titles)

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

<br />

## Adjusting overlayHeight targets' padding

You might noticed that if you have a fixed header and defined an `overlayHeight`, once you click to scroll to a target its top edge may actually be underneath the
header. You must adjust the paddings and the margins of your titles to compensate the offset:

```js
useActive(targets, { overlayHeight: 100 })
```

From:

```css
.title {
  margin: 0;
  padding: 30px 0;
}
```

To:

```css
.title {
  margin: -100px 0 0 0; // /* Subtract overlayHeight from margin-top */
  padding: 130px 0 30px 0; /* Add overlayHeight to padding-top */
}
```

Which is basically from:

```css
.title {
  margin: 0;
  padding: 0;
}
```

to:

```css
.title {
  margin: -100px 0 0 0;
  padding: 100px 0 0 0;
}
```

<br />

## License

MIT
