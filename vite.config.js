import { defineConfig } from 'vite';
import { resolve } from 'node:path';

// De här två sidhuvudena gör att WebAssembly får använda flera processorkärnor.
const isolation = {
  'Cross-Origin-Opener-Policy': 'same-origin',
  'Cross-Origin-Embedder-Policy': 'credentialless',
};

export default defineConfig({
  server: { headers: isolation },
  preview: { headers: isolation },
  worker: { format: 'es' },
  optimizeDeps: { exclude: ['@huggingface/transformers', 'onnxruntime-web'] },
  build: {
    target: 'es2022',
    rollupOptions: {
      input: { main: resolve(import.meta.dirname, 'index.html'), spik: resolve(import.meta.dirname, 'spik.html') },
    },
  },
});
