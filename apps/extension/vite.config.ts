import path from 'path';
import { fileURLToPath } from 'url';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { crx } from '@crxjs/vite-plugin';
import manifest from './manifest.json';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    crx({ manifest }),
  ],
  resolve: {
    alias: {
      '@lockedin/scene': path.resolve(__dirname, '../../packages/scene/src/index.ts'),
    },
  },
  build: {
    rollupOptions: {
      input: {
        blocked: 'src/blocked/index.html',
      },
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
