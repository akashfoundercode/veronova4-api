import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { viteSingleFile } from 'vite-plugin-singlefile';
import path from 'path';

// viteSingleFile inlines JS/CSS into dist/index.html so the built game can be
// opened directly or hosted anywhere as one file. Remove it for a classic split build.
export default defineConfig({
  plugins: [react(), viteSingleFile()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  build: { chunkSizeWarningLimit: 2000 },
});
