import { defineConfig } from 'vite';

export default defineConfig({
  root: './src',
  publicDir: '../public',
  build: {
    outDir: '../../docs',
    emptyOutDir: false, // Don't delete WASM files
    rollupOptions: {
      input: {
        main: './src/index.html'
      },
      external: ['/himmel.js']
    }
  },
  server: {
    port: 3000,
    open: true
  }
});