import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import * as path from 'path'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      'next-themes': path.resolve('./node_modules/next-themes')
    }
  },
  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      'react-router-dom',
      'next-themes',
      'lucide-react',
      '@radix-ui/react-slot',
      '@radix-ui/react-toast',
      '@radix-ui/react-dialog',
      '@radix-ui/react-dropdown-menu',
      'class-variance-authority',
      'clsx',
      'tailwind-merge',
      'framer-motion',
      'recharts',
      'react-icons'
    ],
    exclude: [],
    force: false
  },
  server: {
    port: 5173,
    host: true,
    hmr: {
      overlay: false,
      clientPort: 5173
    },
    watch: {
      usePolling: false,
      interval: 1000
    }
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          router: ['react-router-dom'],
          ui: ['@radix-ui/react-slot', '@radix-ui/react-toast', '@radix-ui/react-dialog'],
          icons: ['lucide-react', 'react-icons'],
          utils: ['clsx', 'tailwind-merge', 'class-variance-authority']
        }
      }
    }
  }
})
