import { defineConfig } from 'cypress'

export default defineConfig({
   component: {
      video: false,
      viewportWidth: 1366,
      experimentalWebKitSupport: true,
      viewportHeight: 768,
      devServer: {
         framework: 'vue',
         bundler: 'vite',
      },
   },
})
