<script lang="ts" setup>
import { computed, ComputedRef, inject } from 'vue';
import { useActive } from '../../../src/useActive';
import animateScrollTo from 'animated-scroll-to';

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
	replaceHash: true,
	boundaryOffset: {
		toTop: -200,
		toBottom: 100,
	},
});

const activeItemHeight = computed(
	() => document.querySelector(`a[href="#${activeId.value}"]`)?.scrollHeight || 0
);

const onClick = computed(() => {
	if (clickType.value === 'native') {
		return (id: string) => setActive(id);
	}
	// Custom click handler using animated-scroll-to
	return (id: string) => {
		setActive(id);
		animateScrollTo(document.getElementById(id) as HTMLElement, {
			elementToScroll: rootId ? (document.getElementById(rootId) as HTMLElement) : window,
			easing: (x: number) => 1 + (1.70158 + 1) * Math.pow(x - 1, 3) + 1.70158 * Math.pow(x - 1, 2),
			minDuration: 300,
			maxDuration: 600,
		});
	};
});
</script>

<template>
	<nav>
		<ul :style="{ '--ActiveIndex': activeIndex, '--ActiveItemHeight': `${activeItemHeight}px` }">
			<span v-if="activeIndex >= 0" class="Tracker" />

			<li v-for="item in menuItems" :key="item.href">
				<a
					@click="onClick(item.href)"
					:href="`#${item.href}`"
					:class="{
						Active: isActive(item.href),
					}"
				>
					{{ item.label }}
				</a>
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
}

@media (max-width: 610px) {
	.Tracker {
		transition: top 200ms;
	}
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
	white-space: nowrap;
	transition: background-color 100ms;
	color: rgba(255, 255, 255, 0.646);
	padding: 2.5px 0;
	width: 100%;
}

a:hover {
	color: white;
}

.Active {
	color: white;
}
</style>
