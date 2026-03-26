import { defineConfig } from 'vite';
import { crx } from '@crxjs/vite-plugin';
import manifest from './src/manifest.json';
import { resolve } from 'path';

export default defineConfig({
  root: 'src',
  plugins: [crx({ manifest })],
  build: {
    outDir: '../dist',
    emptyOutDir: true,
    rollupOptions: {
      input: {
        'content/main-world': resolve(__dirname, 'src/content/main-world.ts'),
      },
    },
  },
});
