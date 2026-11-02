import { defineConfig } from 'vite';

export default defineConfig({
  base: '/Shadow-Blade/',
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          three: ['three'],
        },
      },
    },
  },
  server: {
    host: '127.0.0.1',
    port: 5173,
    watch: {
      ignored: ['**/.brave-runtime/**', '**/.edge-runtime/**', '**/.edge-debug/**'],
    },
  },
  preview: {
    host: '127.0.0.1',
    port: 4173,
  },
});
