/**
 * Wersja jednoplikowa: cała aplikacja (kod, style, fonty, ikony, treści) w jednym pliku HTML.
 * Pobierasz → otwierasz dwuklikiem w przeglądarce. Bez instalacji, bez serwera, działa offline.
 * Ocena promptów działa w trybie demonstracyjnym (model AI wymaga serwera).
 * Build: npm run build:standalone  →  standalone/TERMO-AI-LAB.html
 */
import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { viteSingleFile } from 'vite-plugin-singlefile';
import { readFileSync, renameSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const pkg = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8')) as { version: string };
const favicon = `data:image/svg+xml;base64,${readFileSync(new URL('./public/favicon.svg', import.meta.url)).toString('base64')}`;

/** Ikona jako data URI, bez odwołań do plików PWA, których nie ma obok pliku HTML. */
function standaloneHtml(): Plugin {
  return {
    name: 'termo-standalone-html',
    transformIndexHtml(html) {
      return html
        .replace(/<link rel="icon"[^>]*>/, `<link rel="icon" type="image/svg+xml" href="${favicon}" />`)
        .replace(/\s*<link rel="apple-touch-icon"[^>]*>/, '')
        .replace(/\s*<meta name="apple-mobile-web-app[^>]*>/g, '')
        .replace(/\s*<meta name="mobile-web-app-capable"[^>]*>/, '');
    },
  };
}

function renameOutput(): Plugin {
  return {
    name: 'termo-standalone-rename',
    closeBundle() {
      renameSync('standalone/index.html', 'standalone/TERMO-AI-LAB.html');
    },
  };
}

export default defineConfig({
  base: './',
  publicDir: false,
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
    __STANDALONE__: 'true',
  },
  resolve: {
    alias: {
      'virtual:pwa-register': fileURLToPath(new URL('./src/lib/standalone/pwa-register-stub.ts', import.meta.url)),
    },
  },
  plugins: [react(), tailwindcss(), standaloneHtml(), viteSingleFile({ removeViteModuleLoader: true }), renameOutput()],
  build: {
    outDir: 'standalone',
    emptyOutDir: true,
    assetsInlineLimit: 100_000_000,
    chunkSizeWarningLimit: 5000,
    target: 'es2020',
  },
});
