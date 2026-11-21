/// <reference types="vitest/config" />
import { fileURLToPath, URL } from 'node:url';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: false,
      includeAssets: ['icons/favicon.svg', 'icons/apple-touch-icon.png'],
      manifest: {
        name: 'CYRUS — Personal Intelligence System',
        short_name: 'CYRUS',
        description: 'Your personal operating system with an integrated AI assistant.',
        id: '/',
        start_url: '/',
        scope: '/',
        display: 'standalone',
        orientation: 'portrait',
        background_color: '#05070C',
        theme_color: '#05070C',
        categories: ['productivity', 'health', 'lifestyle'],
        icons: [
          { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: '/icons/maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
        shortcuts: [
          { name: 'Talk to Cyrus', short_name: 'Cyrus', url: '/cyrus', icons: [{ src: '/icons/icon-192.png', sizes: '192x192' }] },
          { name: 'Today', short_name: 'Today', url: '/', icons: [{ src: '/icons/icon-192.png', sizes: '192x192' }] },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,woff2}'],
        navigateFallback: '/index.html',
        // Never cache API traffic: Supabase data and AI responses must always be live.
        navigateFallbackDenylist: [/^\/functions\//, /^\/rest\//, /^\/auth\//],
      },
    }),
  ],
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  server: { host: true },
  build: {
    // React, Supabase, motion and zod together form a ~190 kB (gzip) app core; routes are split lazily.
    chunkSizeWarningLimit: 700,
  },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts', 'supabase/functions/**/*.test.ts'],
    // The Edge Function imports npm packages with Deno's `npm:` specifiers.
    alias: [{ find: /^npm:zod@4$/, replacement: 'zod' }],
  },
});
