import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import * as path from 'path'

// Configuration optimisée pour éviter les re-optimisations
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src')
    }
  },
  optimizeDeps: {
    // Pré-inclure toutes les dépendances pour éviter les re-optimisations
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
    // Ne pas forcer la re-optimisation
    force: false
  },
  server: {
    port: 5173,
    host: '127.0.0.1',
    hmr: {
      overlay: false
    },
    watch: {
      ignored: ['**/node_modules/**', '**/.git/**']
    }
  }
})