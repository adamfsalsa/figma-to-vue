import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import { fileURLToPath, URL } from 'node:url';

const setupFile = fileURLToPath(new URL('./tests/setup.ts', import.meta.url));

export default defineConfig({
  plugins: [vue()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: [setupFile],
  },
});
