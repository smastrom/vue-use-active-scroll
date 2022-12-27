# Vue TOC Highlight

### Highlight your sidebar links without compromises.

:bulb: Requires Vue 3 or above.

<br />

## Get Started

```bash
npm install vue-toc-highlight
```

<br />

## Why?

You may noticed that highlighting sidebar links using the [Intersection Observer](https://developer.mozilla.org/en-US/docs/Web/API/Intersection_Observer_API) has various drawbacks:

- Last links may never be highlighted if previous sections are entirely visible once scroll reaches the bottom.
- Clicking on such links highlights a different section (or does nothing).
- Scrolling speed may affect accuracy on the current active link
- When accessing/refreshing the page, the active link doesn't reflect the one in the the URL.

Vue TOC Highlight is a composable that simply returns the data of the currently active section, plus some other goodies to let you build your own sidebar without having to deal with all the above limitations.

> :warning: Use it only if you are not satisfied with the typical Intersection Observer approach.

### Limits

Vue TOC Highlight doesn't work with scrolling containers different than the window. In the future it may be extended to support them.

<br />

# Usage

## 1. Set targets

The best thing to do is to target the top headings of your section. This will ensure that the active link will be as aligned as possible to users' reading-flow.

### A) Template Refs - Recommended

1. Init a new `ref([])`.
2. When rendering the sections of your content, pass the ref variable name to each top heading [template ref](https://vuejs.org/guide/essentials/template-refs.html#refs-inside-v-for).
3. Call the composable by passing their reference as first argument.

```vue
<script>
import { reactive, ref } from "vue";
import { useHighlight } from "vue-toc-highlight";

const sections = reactive([
      {
            parent: "guide",
            id: "section-1",
            title: "Section 1",
            content: "...",
      }, // ...
]);

const titleRefs = ref([]);
const { activeIndex } = useHighlight(titleRefs);
</script>

<template>
      <section v-for="section in sections" :key="section.id" :id="section.id">
            <!-- 👇 -->
            <h1 ref="titleRefs">
                  {{ section.title }}
            </h1>
            <p>{{ section.content }}</p>
      </section>
</template>
```

### B) Selectors

If you cannot work with template refs, you can pass a valid [CSS selector string](https://developer.mozilla.org/en-US/docs/Web/API/Document/querySelectorAll) shared by your targets to `useHighlight`.

```js
const { activeIndex } = useHighlight("h1.titles");
```

> :bulb: It uses `document.querySelectorAll` under the hood.

If relying on selectors, bear in mind that the composable won't be able to re-track targets if they are dynamically added/removed from the DOM.

<br />

## 2. Pass additional data (optional)

Use [data attributes](https://developer.mozilla.org/en-US/docs/Learn/HTML/Howto/Use_data_attributes) to pass any additional data that you want the composable to return:

```vue
<template>
      <section v-for="section in sections" :key="section.id" :id="section.id">
            <h1 ref="sectionsRef" :data-section="section.id" :data-parent="section.parent">
                  <!-- 👆 -->
                  {{ section.title }}
            </h1>
            <p>{{ section.content }}</p>
      </section>
</template>
```

<br />

## 3. Configure the composable (optional)

`useHighlight` accepts an optional configuration object as second argument:

```js
const { activeIndex, activeDataset } = useHighlight(titleRefs, {
      topOffset: 100,
      // Other options...
});
```

| Property    | Type      | Default | Description                                                                                                                 |
| ----------- | --------- | ------- | --------------------------------------------------------------------------------------------------------------------------- |
| topOffset   | `number`  | 0       | It should match the height in pixels of any fixed content that overlaps the top of your scrolling area (e.g. fixed header). |
| debounce    | `number`  | 0       | Time in ms to wait in order to get updated results once scroll is over.                                                     |
| jumpToFirst | `boolean` | true    | Wheter to set the first title/section on mount as active even if not (yet) intersecting.                                    |
| jumpToLast  | `boolean` | true    | Wheter to set the last title/section as active once scroll arrives to bottom even if previous titles are still visible.     |

<br />

## 3. Return object

The composable returns an object of reactive [refs](https://vuejs.org/api/reactivity-core.html#ref) plus a special function.

```js
const { activeIndex, activeDataset, isBottomReached, setUnreachable } = useHighlight(
      sectionsRef,
      {
            topOffset: 100,
            debounce: 100,
      }
);
```

| Name            | Type                      | Description                                                                                      |
| --------------- | ------------------------- | ------------------------------------------------------------------------------------------------ |
| activeIndex     | `number`                  | Index of the current active target in DOM tree order, `0` for the first title/section and so on. |
| activeDataset   | `Record<string, string>`  | Dataset of the current active target in plain object format                                      |
| isBottomReached | `boolean`                 | True if scroll reached the bottom.                                                               |
| setUnreachable  | `(index: number) => void` | "Safe" function to set any unreachable section index as active.                                  |

<br />

## 4. Create your menu

If your menu has the same length of your targets, `activeIndex` is enough to highlight the active link.

```vue
<script setup>
const sections = reactive([
      {
            parent: "guide",
            id: "section-1",
            title: "Section 1",
            content: "...",
      }, // ...
]);

const menuLinks = computed(() =>
      sections.map((section, index) => ({
            title: section.title,
            href: `#${section.id}`,
      }))
);

const titleRefs = ref([]);
const { activeIndex } = useHighlight(titleRefs);
</script>

<template>
      <nav>
            <a
                  v-for="(link, index) in menuLinks"
                  :href="link.href"
                  :key="link.href"
                  :class="[
                        'link',
                        {
                              active: index === activeIndex,
                        },
                  ]"
            >
                  {{ links.label }}
            </a>
      </nav>
</template>

<style scoped>
.link {
      color: #000;
}

.active {
      color: #f00;
}
</style>
```

For advanced cases like parent titles, different depths, etc. you can use `activeDataset` to access the data attributes of the active target.

## activeDataset

If for example, you passed `data-section` and `data-parent-category` to your targets, you'll be able to access the current active target attribute value like this:

```js
const { activeIndex, activeDataset } = useHighlight(titleRefs);

console.log(activeDataset.section); // => Active 'data-section' value
console.log(activeDataset.parentCategory); // => Active 'data-parent-category' value
```

## setUnreachable

> Unreachable sections are all those section that are completely visible in the viewport once bottom is reached.

This function allows you to "safely" set an unreachable index as active without interfering with scroll updates.

`useHighlight` checks if the index passed is unreachable and eventually sets it as active if bottom is reached (and no scroll event occurs).

### Examples

**Example 1 - Set unreachable on mount**

> Imagine a scenario where Section 16, 17, 18, 19 titles are 100% visible in the viewport when bottom is reached.

If users access the link `yoursite.com/#section-18`, the default behavior will set as active Section 16 as it is the nearest to the top of the page. You can schedule Section 18 to be set as active by calling `setUnreachable` in an onMounted hook. If criteria are met, it will be set as active instead of 16.

```js
import { onMounted } from "vue";
import { useHighlight } from "vue-toc-highlight";

const { activeIndex, setUnreachable } = useHighlight(titleRefs);

onMounted(() => {
      const indexFromHash = titlesRef.value.findIndex(
            ({ id }) => id === window.location.hash.slice(1)
      );
      setUnreachable(indexFromHash); // Runs only if index is unreachable and different than default one
});
```

**Example 2 - Set unreachable on link click**

> Imagine a scenario where Section 16, 17, 18, 19 titles are all 100% visible in the viewport when bottom is reached.

If users from the top of the page click on any Section 17/18/19 link, the default behavior is to set as active Section 16 once bottom is reached.

By calling `setUnreachable` directly in the click handler, that index will be set as active if above criteria are met.

```vue
<script setup>
const { activeIndex, setUnreachable } = useHighlight(titleRefs);
</script>

<template>
      <nav>
            <a
                  v-for="(link, index) in menuLinks"
                  :href="link.href"
                  :key="link.id"
                  @click="() => setUnreachable(index)"
                  :class="[
                        'menuItem',
                        {
                              active: index === activeIndex,
                        },
                  ]"
            >
                  {{ links.label }}
            </a>
      </nav>
</template>
```
