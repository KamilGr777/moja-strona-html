// Tworzy gotowy pakiet do pobrania: zbudowana aplikacja + samodzielny serwer (bez npm install).
// Użycie: npm run build && npm run package   → release/termo-ai-lab-v<wersja>.zip
import { cpSync, existsSync, mkdirSync, rmSync, writeFileSync, readFileSync, chmodSync } from 'node:fs';
import { execFileSync } from 'node:child_process';

const pkg = JSON.parse(readFileSync('package.json', 'utf8'));
const name = `termo-ai-lab-v${pkg.version}`;
const out = `release/${name}`;
if (!existsSync('dist/index.html') || !existsSync('server-dist/index.mjs')) {
  console.error('Brak buildu. Uruchom najpierw: npm run build');
  process.exit(1);
}
rmSync('release', { recursive: true, force: true });
mkdirSync(out, { recursive: true });
cpSync('dist', `${out}/dist`, { recursive: true });
cpSync('server-dist', `${out}/server-dist`, { recursive: true });
cpSync('.env.example', `${out}/.env.example`);
cpSync('README.md', `${out}/README.md`);
cpSync('docs', `${out}/docs`, { recursive: true });
if (existsSync('standalone/TERMO-AI-LAB.html')) {
  // Wersja jednoplikowa: obok paczki (do pobrania osobno) i w środku paczki.
  cpSync('standalone/TERMO-AI-LAB.html', `${out}/TERMO-AI-LAB.html`);
  cpSync('standalone/TERMO-AI-LAB.html', 'release/TERMO-AI-LAB.html');
}

writeFileSync(
  `${out}/URUCHOMIENIE.txt`,
  `TERMO AI LAB ${pkg.version} — gotowy pakiet serwera WWW (to NIE jest instalator)

NAJPROŚCIEJ: otwórz dwuklikiem plik TERMO-AI-LAB.html — cała aplikacja w jednym pliku,
bez instalacji i bez Internetu (ocena promptów w trybie demonstracyjnym).

Wersja z serwerem (instalacja PWA, ocena promptów modelem AI):
Wymagania: Node.js 20 lub nowszy (https://nodejs.org). Nie trzeba uruchamiać "npm install".

1) Uruchomienie
   Windows:      kliknij dwukrotnie start-windows.bat
   Linux/macOS:  ./start.sh
   (lub ręcznie: node server-dist/index.mjs)

2) Otwórz w przeglądarce: http://localhost:8787
   Na innych urządzeniach w sieci: http://<adres-komputera>:8787
   Instalacja jako aplikacja (PWA) na telefonach wymaga adresu HTTPS — udostępnij serwer
   przez firmowy serwer WWW / reverse proxy z certyfikatem.

3) Ocena promptów przez model AI (opcjonalnie)
   Skopiuj .env.example jako .env i wpisz ANTHROPIC_API_KEY=...
   Bez klucza aplikacja działa w trybie demonstracyjnym (wyraźnie oznaczonym).

Sam katalog dist/ można też opublikować na dowolnym hostingu statycznym (tryb demonstracyjny).
`,
);
writeFileSync(`${out}/start-windows.bat`, '@echo off\r\ncd /d "%~dp0"\r\necho TERMO AI LAB - http://localhost:8787\r\nnode server-dist\\index.mjs\r\npause\r\n');
writeFileSync(`${out}/start.sh`, '#!/usr/bin/env sh\ncd "$(dirname "$0")"\necho "TERMO AI LAB - http://localhost:8787"\nexec node server-dist/index.mjs\n');
chmodSync(`${out}/start.sh`, 0o755);

execFileSync('zip', ['-qr', `${name}.zip`, name], { cwd: 'release', stdio: 'inherit' });
console.log(`✓ release/${name}.zip`);
