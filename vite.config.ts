import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  // Use relative base path for maximum portability in containerized environments
  base: './',
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    assetsDir: 'assets',
    sourcemap: false,
    // Ensure consistent naming for container caching
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom', 'recharts']
        }
      }
    }
  },
  define: {
    // Inject process.env for compatibility with legacy services
    'process.env.API_KEY': JSON.stringify(process.env.API_KEY || '')
  }
});
