import { createApp } from 'vue';
import App from './App.vue';
import { createRouter, createWebHistory } from 'vue-router';

const router = createRouter({
	history: createWebHistory(import.meta.env.BASE_URL),
	routes: [
		{
			path: '/',
			name: 'Index',
			component: () => import('./pages/Window.vue'),
		},
		{
			path: '/container',
			name: 'Container',
			component: () => import('./pages/Container.vue'),
		},
		{
			path: '/fixedheader',
			name: 'FixedHeader',
			component: () => import('./pages/FixedHeader.vue'),
		},
		{
			path: '/sections',
			name: 'Sections',
			component: () => import('./pages/Sections.vue'),
		},
	],
	scrollBehavior(to) {
		if (to.hash) {
			return {
				el: to.hash,
				top: to.name === 'FixedHeader' || to.name === 'Sections' ? 60 : 0,
			};
		}
	},
});

createApp(App).use(router).mount('#app');
