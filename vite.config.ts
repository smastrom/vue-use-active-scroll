import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import dts from 'vite-plugin-dts';
import terser from '@rollup/plugin-terser';

const appConfig = {
	root: 'demo',
	server: {
		open: '/',
	},
};

export default defineConfig(({ mode }) => {
	if (mode === 'app') {
		return { ...appConfig, plugins: [vue()] };
	}
	return {
		...appConfig,
		build: {
			outDir: '../dist',
			emptyOutDir: true,
			minify: 'terser',
			lib: {
				entry: '../src/useActive.ts',
				name: 'VueUseActiveScroll',
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
		plugins: [
			vue(),
			dts({
				root: '../',
				include: ['src/useActive.ts'],
				beforeWriteFile: (_, content) => ({
					filePath: 'dist/index.d.ts',
					content,
				}),
			}),
		],
	};
});
