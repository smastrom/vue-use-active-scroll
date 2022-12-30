import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import terser from '@rollup/plugin-terser';

export default defineConfig(({ mode }) => {
	if (mode === 'app') {
		return {
			plugins: [vue()],
		};
	}
	return {
		build: {
			minify: 'terser',
			lib: {
				entry: 'src/index.ts',
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
							hoist_funs: true,
							ecma: 2015,
							defaults: true,
							drop_console: true,
						},
					}),
				],
			},
		},
		plugins: [vue()],
	};
});
