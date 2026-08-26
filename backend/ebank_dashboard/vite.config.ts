import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  base: '/',
  
  // Build configuration
  build: {
    // Enable source maps in production for debugging
    sourcemap: true,
    // Minimize the bundle
    minify: 'terser',
    // Set target for modern browsers
    target: 'es2020',
    // Output directory
    outDir: 'dist',
    // Clean output directory before build
    emptyOutDir: true,
    // Rollup options
    rollupOptions: {
      output: {
        // Manual chunking for better caching
        manualChunks: {
          react: ['react', 'react-dom'],
          firebase: ['firebase/app', 'firebase/auth', 'firebase/firestore', 'firebase/storage'],
          router: ['react-router-dom'],
          ui: ['lucide-react', 'react-hot-toast'],
        },
      },
    },
  },

  // Development server configuration
  server: {
    port: 5173,
    host: true,
    // Keep framing allowed in dev so Cursor Glass preview can load
    headers: {
      'X-Content-Type-Options': 'nosniff',
      'X-XSS-Protection': '1; mode=block',
    },
  },

  // Preview server configuration
  preview: {
    port: 4173,
    host: true,
    // Security headers for preview - more permissive for testing
    headers: {
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'DENY',
      'X-XSS-Protection': '1; mode=block',
      'Content-Security-Policy': "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline' fonts.googleapis.com; font-src 'self' fonts.gstatic.com; img-src 'self' data: https:; connect-src 'self' https://*.googleapis.com https://*.firebaseio.com https://identitytoolkit.googleapis.com https://securetoken.googleapis.com https://*.cloudfunctions.net https://firebase.googleapis.com;",
    },
  },

  // Environment variables validation
  define: {
    __APP_VERSION__: JSON.stringify(process.env.npm_package_version),
  },
})
