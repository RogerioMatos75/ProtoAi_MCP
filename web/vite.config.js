import { defineConfig } from 'vite';

export default defineConfig({
  base: '/ProtoAi_MCP/',
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    rollupOptions: {
      input: {
        main: 'index.html'
      }
    }
  },
  server: {
    port: 3000
  }
})