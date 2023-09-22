import { defineConfig } from 'vite'

import vue from '@vitejs/plugin-vue'
import dts from 'vite-plugin-dts'
import terser from '@rollup/plugin-terser'

export default defineConfig(({ mode }) => {
   if (mode === 'app') {
      return { plugins: [vue()] }
   }
   return {
      build: {
         emptyOutDir: true,

         lib: {
            entry: 'src/index.ts',
            name: 'vue-use-active-scroll',
            fileName: 'index',
            formats: ['es', 'cjs'],
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
         dts({
            rollupTypes: true,
         }),
         vue(),
      ],
   }
})
