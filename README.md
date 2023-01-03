# Vue Scroll Target

### Reactive TOC/sidebar links without compromises.

:bulb: Requires Vue 3 or above.

<br />

## Why?

Highlighting sidebar links using the [Intersection Observer](https://developer.mozilla.org/en-US/docs/Web/API/Intersection_Observer_API) may have various drawbacks:

- Scrolling speed or behavior affects accuracy
- Once reached the bottom, some links may never be highlighted if previous targets are entirely visible.
- Clicking on such links highlights different links (or does nothing).
- When accessing/refreshing the page, the active target may not reflect the one in the the URL hash.

> If you're struggling with any of these issues, this package might help you.

<br />

## What is it?

It is a Vue 3 composable that implements a customizable scroll observer and returns **reactive data** of the current active target.

It automatically ensures that the returned target reflects:

- User's reading flow regardless of scrolling speed
- The clicked link regardless of the scroll-behavior, custom scroll functions, etc.
- Different behaviors on mount, scroll and click
- The URL hash

### What it doesn't do?

- Mutate your elements
- Scroll to targets

### Limitations

Currently Vue Scroll Target doesn't support scrolling containers different than the window or horizontal scrolling. Discussions/PRs are very welcome to extend support.

<br />

## Installation

```bash
pnpm add vue-reactive-toc
```

<br />

# Usage

## 1. Provide targets

In order to get results consistent with users' reading flow, targets to be observed should match the titles (h2, h3...) of your sections (not the whole section).

> :bulb: In different contexts, you might want to target your sections, but the example below is intended for a TOC sidebar.

Make sure that each target has an unique `id` attribute (which corresponds to the anchor you'll scroll to) and pass them to `useActiveTarget`. Order is not important.

You most likely will call `useActiveTarget` in the [setup function](https://v3.vuejs.org/guide/composition-api-setup.html#setup-function-arguments) of your sidebar component.

```vue
<script setup>
import { useActiveTarget } from 'vue-reactive-toc'

const titleIds = ['title-1', 'title-2', 'title-3']
// or computed(() => /* ... */), or props.titleIds, etc...

const { isActive } = useActiveTarget(titleIds)
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

const { isActive } = useActiveTarget(targets)
```

</details>

<br />

## 2. Configure the composable (optional)

`useActiveTarget` accepts an optional configuration object as its second argument:

```js
const { isActive, setActive } = useActiveTarget(titles, {
  // Options...
})
```

| Property       | Type             | Default                   | Description                                                                                                                                                    |
| -------------- | ---------------- | ------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| jumpToFirst    | `boolean`        | true                      | Wheter to set the first target on mount as active even if not (yet) intersecting.                                                                              |
| jumpToLast     | `boolean`        | true                      | Wheter to set the last target as active once scroll reaches the bottom even if previous targets are entirely visible.                                          |
| boundaryOffset | `BoundaryOffset` | { toTop: 0, toBottom: 0 } | Boundary offset in px for each scroll direction. Tweak them to "anticipate" or "delay" targets detection.                                                      |
| overlayHeight  | `number`         | 0                         | It should match the height in pixels of any **CSS fixed** content that overlaps the top of your scrolling area. See also [adjusting overlayHeight paddings](). |
| minWidth       | `number`         | 0                         | Viewport width in px from which scroll listeners should be added/removed. Useful if hiding the sidebar with `display: none` within a specific width.           |
| replaceHash    | `boolean`        | false                     | Whether to replace URL hash on scroll. When `jumpToFirst` is true, the first target is ignored.                                                                |

### Return object

The composable returns an object of reactive [refs](https://vuejs.org/api/reactivity-core.html#ref) plus two handy functions:

| Name          | Type                          | Description                                                                        |
| ------------- | ----------------------------- | ---------------------------------------------------------------------------------- |
| isActive      | `(id: string) => boolean`     | Wheter the given Id is active or not                                               |
| setActive     | `(id: string) => void`        | Function to set active targets and ensure proper behavior between scroll and click |
| activeId      | `Ref<string>`                 | Id of the active target                                                            |
| activeIndex   | `Ref<number>`                 | Index of the active target in DOM tree order, `0` for the first target and so on.  |
| activeDataset | `Ref<Record<string, string>>` | Dataset of the active target in plain object format                                |

<br />

## 3. Create your sidebar

1. Use `isActive` to style the active link:

```vue
<script setup>
// ...
const { isActive } = useActiveTarget(titles)
</script>

<template>
  <nav>
    <a
      v-for="(link, index) in links"
      :href="link.targetId"
      :key="link.targetId"
      :class="{ active: isActive(link.targetId) }"
    >
      {{ link.label }}
    </a>
  </nav>
</template>

<style>
html {
  scroll-behavior: smooth; /* or 'auto' */
}

.active {
  color: #f00;
}
</style>
```

> :bulb: If you're playing with transitions or dealing with different depths, simply make use of _activeIndex_, _activeId_ and _activeDataset_.

2. Call `setActive` in your click handler by passing the anchor ID.

> :bulb: _setActive_ doesn't scroll to the target, it just ensures proper behavior between scroll/click switch.

```vue
<script setup>
// ...
const { isActive, setActive } = useActiveTarget(titles)
</script>

<template>
  <nav>
    <a
      v-for="(link, index) in links"
      @click="setActive(link.targetId)"
      :href="link.targetId"
      :key="link.targetId"
      :class="{ active: isActive(link.targetId) }"
    >
      {{ link.label }}
    </a>
  </nav>
</template>
```

You are totally free to create your own click handler and choose the scrolling strategy: CSS (smooth or auto), [scrollIntoView](https://developer.mozilla.org/en-US/docs/Web/API/Element/scrollIntoView) or even a scroll library like [animated-scroll-to](https://github.com/Stanko/animated-scroll-to) with custom easings will work.

<br />

</details>

<br />

## Adjusting overlayHeight targets' padding

You might noticed that if you have a fixed header and defined an `overlayHeight`, once you click to scroll to a target its top edge may actually be underneath the
header. You must adjust the paddings and the margins of your titles to compensate the offset:

```js
const { activeId } = useActiveTarget(titleRefs, { overlayHeight: 100 })
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
  margin: -100px 0 0 0; // /* Subtract overlayHeight from margin-top */
  padding: 130px 0 30px 0; /* Add overlayHeight to padding-top */
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

MIT
