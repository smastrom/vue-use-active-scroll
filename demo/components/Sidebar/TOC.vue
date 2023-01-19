<script lang="ts" setup>
import { computed, ComputedRef, inject } from 'vue';
import { useRoute } from 'vue-router';
import animateScrollTo from 'animated-scroll-to';
import { useActive } from '../../../src/useActive';

type TOCData = {
	menuItems: { label: string; href: string }[];
	targets: ComputedRef<string[]>;
	rootId?: string | null;
	overlayHeight?: number;
};

const { menuItems, targets, rootId = null, overlayHeight = 0 } = inject('TOCData') as TOCData;

const { clickType } = inject('DemoRadios') as {
	clickType: ComputedRef<'native' | 'custom'>;
};

const { activeIndex, activeId, setActive, isActive } = useActive(targets, {
	rootId,
	overlayHeight,
	/* 	boundaryOffset: {
		toBottom: 100,
		toTop: -100,
	}, */
});

const route = useRoute();

const activeItemHeight = computed(
	() => document.querySelector(`a[href="${route.path}#${activeId.value}"]`)?.scrollHeight || 0
);

function customScroll(id: string) {
	setActive(id);
	animateScrollTo(document.getElementById(id) as HTMLElement, {
		elementToScroll: rootId ? (document.getElementById(rootId) as HTMLElement) : window,
		easing: (x: number) => 1 + (1.70158 + 1) * Math.pow(x - 1, 3) + 1.70158 * Math.pow(x - 1, 2),
		maxDuration: 600,
		verticalOffset: -overlayHeight || 0,
		cancelOnUserAction: true,
	});
}

const onClick = computed(() => (clickType.value === 'native' ? setActive : customScroll));
</script>

<template>
	<nav>
		<ul :style="{ '--ActiveIndex': activeIndex, '--ActiveItemHeight': `${activeItemHeight}px` }">
			<span v-if="activeIndex >= 0" class="Tracker" />

			<li v-for="item in menuItems" :key="item.href">
				<RouterLink
					@click.native="onClick(item.href)"
					:ariaCurrentValue="`${isActive(item.href)}`"
					:to="{ hash: `#${item.href}` }"
					:class="{
						Active: isActive(item.href),
					}"
					activeClass=""
					exactActiveClass=""
				>
					{{ item.label }}
				</RouterLink>
			</li>
		</ul>
	</nav>
</template>

<style scoped>
.Tracker {
	width: calc(100% + 12px);
	height: var(--ActiveItemHeight);
	position: absolute;
	left: -10px;
	right: 10px;
	top: calc(var(--ActiveItemHeight) * var(--ActiveIndex));
	background-color: #00adb538;
	transition: top 100ms;
	border-left: 4px solid #00adb5;
	border-radius: 0px 5px 5px 0px;
}

ul {
	position: relative;
	list-style: none;
	padding: 0;
	margin: 0;
}

li {
	display: flex;
}

a {
	text-decoration: none;
	transition: color 100ms;
	user-select: none;
	white-space: nowrap;
	transition: background-color 100ms;
	color: rgba(255, 255, 255, 0.646);
	padding: 2.5px 0;
	width: 100%;
	--webkit-tap-highlight-color: rgba(0, 0, 0, 0);
}

@media (hover: hover) {
	a:hover {
		color: white;
	}
}

.Active {
	color: white;
}
</style>
