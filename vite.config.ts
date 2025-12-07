import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import path from 'path';

const REPO_NAME = '/c2-webgpu-engine/';

// https://vite.dev/config/
export default defineConfig({
  plugins: [tailwindcss(), react()],
  base: REPO_NAME,
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  build: {
    target: 'esnext',
  },
});
