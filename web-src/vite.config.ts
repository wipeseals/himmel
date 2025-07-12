import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  root: './src',
  publicDir: '../public',
  build: {
    outDir: '../../docs',
    emptyOutDir: false, // Don't delete WASM files
    rollupOptions: {
      input: resolve(__dirname, 'src/index.html'),
      external: ['/himmel.js']
    }
  },
  server: {
    port: 3000,
    open: true
  }
});