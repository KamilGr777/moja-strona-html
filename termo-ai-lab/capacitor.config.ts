import type { CapacitorConfig } from '@capacitor/cli';

/**
 * Konfiguracja aplikacji Android (Capacitor).
 * Aplikacja mobilna zawiera cały build (dist) — działa offline.
 * Aby korzystać z oceny modelem AI, zbuduj ją z VITE_API_BASE_URL wskazującym serwer TERMO AI LAB
 * i ustaw na serwerze ALLOWED_ORIGINS=https://localhost.
 */
const config: CapacitorConfig = {
  appId: 'pl.termoailab.akademia',
  appName: 'TERMO AI LAB',
  webDir: 'dist',
  android: {
    backgroundColor: '#070b18',
  },
  server: {
    androidScheme: 'https',
  },
};

export default config;
