import path from 'path';
import { fileURLToPath } from 'url';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  base: process.env.VITE_BASE_PATH ?? "/",
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@lockedin/scene': path.resolve(__dirname, '../../packages/scene/src/index.ts'),
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules/three/')) return 'three';
          if (id.includes('node_modules/@react-three/')) return 'react-three';
          if (id.includes('node_modules/gsap/')) return 'gsap';
          if (id.includes('node_modules/react/') || id.includes('node_modules/react-dom/')) return 'react-vendor';
        },
      },
    },
    chunkSizeWarningLimit: 750,
  },
});
