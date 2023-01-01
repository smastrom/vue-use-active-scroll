import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import terser from '@rollup/plugin-terser';

const appConfig = {
	root: 'demo',
	server: {
		open: 'index.html',
	},
	plugins: [vue()],
};

export default defineConfig(({ mode }) => {
	if (mode === 'app') {
		return appConfig;
	}
	return {
		...appConfig,
		build: {
			outDir: '../dist',
			emptyOutDir: true,
			minify: 'terser',
			lib: {
				entry: '../src/index.ts',
				name: 'VueReactiveTOC',
				fileName: 'index',
			},
			rollupOptions: {
				external: ['vue'],
				output: {
					globals: {
						vue: 'Vue',
					},
				},
				plugins: [
					terser({
						compress: {
							defaults: true,
							drop_console: true,
						},
					}),
				],
			},
		},
	};
});
