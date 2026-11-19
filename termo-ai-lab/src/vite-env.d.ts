/// <reference types="vite/client" />
/// <reference types="vite-plugin-pwa/client" />

declare const __APP_VERSION__: string;
/** true w wersji jednoplikowej (TERMO-AI-LAB.html) — bez serwera i service workera. */
declare const __STANDALONE__: boolean;

interface ImportMetaEnv {
  readonly VITE_API_BASE_URL?: string;
}
