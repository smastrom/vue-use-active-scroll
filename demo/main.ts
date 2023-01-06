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
	],
});

createApp(App).use(router).mount('#app');
