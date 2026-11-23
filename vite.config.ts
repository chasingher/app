import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import fs from 'fs';
import path from 'path';
import {defineConfig} from 'vite';
import {VitePWA} from 'vite-plugin-pwa';

export default defineConfig(() => {
  const basePath = process.env.VITE_BASE_PATH || '/';
  return {
    base: basePath,
    plugins: [
      react(),
      tailwindcss(),
      VitePWA({
        registerType: 'autoUpdate',
        includeAssets: [
          'icon.svg',
          'apple-touch-icon.png',
          'pwa-192x192.png',
          'pwa-512x512.png',
          'pwa-maskable-512x512.png',
        ],
        manifest: {
          id: '/',
          name: 'Chasing Her — Love Websites & Backstage',
          short_name: 'ChasingHer',
          description:
            'Digital love letter websites made from your photos, words, music, and memories — with My Site customer tracker and unified Admin Backstage.',
          theme_color: '#3A0D18',
          background_color: '#FBF3EA',
          display: 'standalone',
          start_url: '/',
          scope: '/',
          orientation: 'portrait-primary',
          icons: [
            {
              src: '/pwa-192x192.png',
              sizes: '192x192',
              type: 'image/png',
              purpose: 'any',
            },
            {
              src: '/pwa-512x512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'any',
            },
            {
              src: '/pwa-maskable-512x512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'maskable',
            },
          ],
          shortcuts: [
            {
              name: 'My Site — Track My Order',
              short_name: 'My Site',
              description: 'Track your love website progress, preview, and edit',
              url: `${basePath.replace(/\/?$/, '/')}my-site/`,
              icons: [{src: `${basePath.replace(/\/?$/, '/')}pwa-192x192.png`, sizes: '192x192'}],
            },
            {
              name: 'Backstage Admin Studio',
              short_name: 'Backstage',
              description: 'Unified orders, sales pages directory, site builders & Firebase 5GB',
              url: `${basePath.replace(/\/?$/, '/')}admin/`,
              icons: [{src: `${basePath.replace(/\/?$/, '/')}pwa-192x192.png`, sizes: '192x192'}],
            },
            {
              name: 'Order a Love Website',
              short_name: 'Order',
              description: 'Create a Chasing Her or Memories website',
              url: `${basePath.replace(/\/?$/, '/')}win-her-back/gh/`,
              icons: [{src: `${basePath.replace(/\/?$/, '/')}pwa-192x192.png`, sizes: '192x192'}],
            },
          ],
        },
        workbox: {
          globPatterns: ['**/*.{js,css,html,ico,png,svg,woff,woff2}'],
          maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
          runtimeCaching: [
            {
              urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
              handler: 'CacheFirst',
              options: {
                cacheName: 'google-fonts-cache',
                expiration: {
                  maxEntries: 15,
                  maxAgeSeconds: 60 * 60 * 24 * 365,
                },
                cacheableResponse: {
                  statuses: [0, 200],
                },
              },
            },
            {
              urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
              handler: 'CacheFirst',
              options: {
                cacheName: 'gstatic-fonts-cache',
                expiration: {
                  maxEntries: 15,
                  maxAgeSeconds: 60 * 60 * 24 * 365,
                },
                cacheableResponse: {
                  statuses: [0, 200],
                },
              },
            },
            {
              urlPattern: /^https:\/\/firebasestorage\.googleapis\.com\/.*/i,
              handler: 'StaleWhileRevalidate',
              options: {
                cacheName: 'firebase-media-cache',
                expiration: {
                  maxEntries: 100,
                  maxAgeSeconds: 60 * 60 * 24 * 30,
                },
                cacheableResponse: {
                  statuses: [0, 200],
                },
              },
            },
          ],
        },
        devOptions: {
          enabled: true,
          type: 'module',
        },
      }),
      // Generates actual static directory entrypoints in dist/<dir>/index.html
      // so GitHub Pages serves /win-her-back/gh/, /birthday/ke/, /admin/, /my-site/, etc.
      // directly as real folders without needing ?view= query params.
      {
        name: 'generate-static-directory-pages',
        apply: 'build',
        closeBundle(error?: Error): void {
          if (error) {
            return;
          }
          const distDir = path.resolve(__dirname, 'dist');
          const rootIndexPath = path.join(distDir, 'index.html');
          if (!fs.existsSync(rootIndexPath)) {
            return;
          }

          const baseHtml = fs.readFileSync(rootIndexPath, 'utf-8');
          const staticDirectories: Array<{ dir: string; title: string }> = [
            { dir: 'win-her-back', title: 'Chasing Her — Win Her Back' },
            { dir: 'win-her-back/gh', title: 'Chasing Her — Win Her Back (Ghana)' },
            { dir: 'win-her-back/ke', title: 'Chasing Her — Win Her Back (Kenya)' },
            {
              dir: 'win-her-back-interactive',
              title: 'Chasing Her — Interactive Digital Love Experience',
            },
            {
              dir: 'win-her-back-interactive/gh',
              title: 'Chasing Her — Interactive Digital Love Experience (Ghana)',
            },
            {
              dir: 'win-her-back-interactive/ke',
              title: 'Chasing Her — Interactive Digital Love Experience (Kenya)',
            },
            { dir: 'birthday', title: 'Chasing Her — Birthday Love Website' },
            { dir: 'birthday/gh', title: 'Chasing Her — Birthday Love Website (Ghana)' },
            { dir: 'birthday/ke', title: 'Chasing Her — Birthday Love Website (Kenya)' },
            {
              dir: 'birthday-interactive',
              title: 'Chasing Her — Digital Birthday Keepsake Questionnaire',
            },
            {
              dir: 'birthday-interactive/gh',
              title: 'Chasing Her — Digital Birthday Keepsake (Ghana)',
            },
            {
              dir: 'birthday-interactive/ke',
              title: 'Chasing Her — Digital Birthday Keepsake (Kenya)',
            },
            { dir: 'my-site', title: 'My Site — Chasing Her Customer Portal' },
            { dir: 'builder', title: 'Site Builder Studio — Chasing Her' },
            { dir: 'admin', title: 'Admin Backstage — Chasing Her' },
            { dir: 'preview', title: 'Recipient Preview — Chasing Her' },
          ];

          for (const route of staticDirectories) {
            const targetDir = path.join(distDir, route.dir);
            fs.mkdirSync(targetDir, { recursive: true });

            const depth = route.dir.split('/').filter(Boolean).length;
            let pageHtml = baseHtml.replace(
              /<title>.*?<\/title>/i,
              `<title>${route.title}</title>`
            );

            // If built with a relative base ("./"), adjust asset paths to point back to dist root
            if (basePath === './' || basePath.startsWith('./')) {
              const upPrefix = '../'.repeat(depth);
              pageHtml = pageHtml
                .replace(/(src|href)="\.\/([^"]+)"/g, `$1="${upPrefix}$2"`)
                .replace(/(src|href)='\.\/([^']+)'/g, `$1='${upPrefix}$2'`);
            }

            fs.writeFileSync(path.join(targetDir, 'index.html'), pageHtml, 'utf-8');
          }

          // Also emit 404.html fallback & .nojekyll for GitHub Pages
          fs.writeFileSync(path.join(distDir, '404.html'), baseHtml, 'utf-8');
          fs.writeFileSync(path.join(distDir, '.nojekyll'), '', 'utf-8');
        },
      },
      // Copies src/assets into dist/ so root-relative URLs like
      // "/src/assets/images/..." (e.g. generate_image output) still resolve
      // in production builds. Do not remove.
      {
        name: 'copy-unbundled-src-assets',
        apply: 'build',
        closeBundle(error?: Error): void {
          if (error) {
            return;
          }
          const distDir = path.resolve(__dirname, 'dist');
          const srcAssets = path.resolve(__dirname, 'src/assets');
          const distAssets = path.resolve(distDir, 'src/assets');
          if (fs.existsSync(distDir) && fs.existsSync(srcAssets)) {
            fs.cpSync(srcAssets, distAssets, {recursive: true, force: true});
          }
        },
      },
    ],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify—file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});

