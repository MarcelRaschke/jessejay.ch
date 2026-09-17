# Performance-Optimierungen - jessejay.ch

Diese Dokumentation beschreibt die umgesetzten Massnahmen zur Performance- und
Ladezeiten-Optimierung sowie die serverseitigen Optionen fuer eigenes Hosting.

## 1. Bilder in WebP konvertieren

Rasterbilder (gif, jpg, jpeg, png) werden zu WebP konvertiert, das bei deutlich
kleinerer Dateigroesse vergleichbare Qualitaet bietet.

- **Skript:** `scripts/convert-webp.js` (nutzt [`sharp`](https://sharp.pixelplumbing.com/))
- **Ausfuehrung:** `npm run build:webp`
- Originaldateien bleiben erhalten; WebP-Varianten werden mit der Endung `.webp`
  neben den Originalen abgelegt.
- `DJPult.gif` (5.6 MB) wurde z.B. zu `DJPult.webp` (22 KB) konvertiert.

> Hinweis: Einige alte Dateien (`otsosamba.jpg`, `get_flashplayer_88_31.gif`,
> `*.svg` im Root) sind Wayback-Machine-Fehlerseiten, keine echten Bilder
> (siehe `ROADMAP.md`, M0). Diese werden beim Konvertieren uebersprungen.

Damit WebP im Markup genutzt wird, Referenzen auf `.webp`-Varianten umstellen, z.B.:

```html
<img src="DJPult.webp" alt="DJ Pult" loading="lazy" width="640" height="360">
```

## 2. Font Awesome lokal hosten

Die Font-Awesome-Icons werden nicht mehr ueber das cdnjs-CDN geladen, sondern
lokal unter `assets/fonts/` gehostet. Dadurch entfaellt ein zusaetzlicher
DNS-Verbindungsaufbau zu einem Drittanbieter (bessere Performance & Privacy).

- **Subset-CSS:** `assets/fonts/css/fontawesome.min.css` (~5 KB) enthaelt nur
  die im Projekt verwendeten Icons (statt der vollen ~74 KB `all.min.css`).
- **Webfonts:** `assets/fonts/webfonts/` (woff2 + ttf, fuer solid/brands/regular
  + v4compatibility).
- **Lizenz:** `assets/fonts/LICENSE.txt` (Font Awesome Free 6.7.2; Icons CC BY
  4.0, Fonts SIL OFL 1.1, Code MIT).
- Alle HTML-Seiten referenzieren das lokale Subset mit `preload` + `stylesheet`.

Einbindung in allen Seiten (`index.html`, `events.html`, `music.html`,
`guestbook.html`, `contact.html`):

```html
<link rel="preload" as="style" href="assets/fonts/css/fontawesome.min.css">
<link rel="stylesheet" href="assets/fonts/css/fontawesome.min.css">
```

## 3. Service Worker fuer Offline-Funktionalitaet

- **Datei:** `sw.js` (Scope: Repository-Root)
- **Strategie:**
  - **HTML-Seiten:** Network-First (frische Inhalte), Fallback auf Cache.
  - **Statische Assets** (CSS, JS, Fonts, Bilder): Cache-First, dann Network +
    Hintergrund-Update.
- **Registrierung:** `js/main.js` registriert den Service Worker nur ueber
  `https:` bzw. `localhost`, um Fehler in der lokalen Dateiansicht zu vermeiden.
- **Core-Assets** werden bei der Installation vorgeladen (App-Shell).
- Externe/CORS-Ressourcen (SoundCloud) und `/data/` werden bewusst nicht vom
  Service Worker abgefangen.
- Die Cache-Version (`jessejay-v1`) in `sw.js` muss bei Updates erhoeht werden,
  damit alte Caches beim Aktivieren geloescht werden.

## 4. Brotli-Komprimierung aktivieren

Brotli komprimiert Text-Assets staerker als gzip. Die Umsetzung ist vom
Deploy-Ziel abhaengig:

- **GitHub Pages** (aktuelles Deploy) komprimiert automatisch (gzip) und
  unterstuetzt kein serverseitiges Brotli-Config. Fuer eigenes Hosting stehen
  folgende Optionen bereit:

### Eigenes Hosting (Apache)
- `.htaccess` aktiviert `mod_brotli` (mit `mod_deflate` als Fallback) und liefert
  vorkomprimierte `.br`-Dateien aus, sofern vorhanden.

### Netlify / Cloudflare Pages
- `_headers` definiert Cache- und Security-Header; Brotli/gzip wird von der
  Plattform automatisch angewendet.

### Vorkomprimierte Assets erzeugen
- **Skript:** `scripts/precompress.js` (nutzt Node `zlib`, Brotli-Qualitaet 11)
- **Ausfuehrung:** `npm run build:compress`
- Erzeugt `.br`- und `.gz`-Varianten fuer Text-Assets (html, css, js, json, xml,
  txt, svg, woff2, ttf). Diese sind in `.gitignore` ausgeklammert und sollten
  im Build/Deploy erzeugt werden.

## 5. CDN nutzen (Cloudflare)

Die Domain `djjessejay.ch` ist bereits fuer Cloudflare konfiguriert (DNS-Proxy
aktiv). Das Skript `scripts/verify-dns.js` prueft die Cloudflare-Konfiguration:

```bash
npm run verify:dns
```

Cloudflare stellt globale Verteilung (Anycast), Caching an Edge, automatische
Brotli-Komprimierung, HTTP/2/3 und TLS ohne zusaetzlichen Konfigurationsaufwand
bereit. Damit entfallen serverseitige Brotli-Configs (Punkt 4) fuer die
Cloudflare-geproxyte Domain – Cloudflare komprimiert an der Edge automatisch.

### Empfehlung fuer Cloudflare
- Caching-Level: Standard (statische Assets werden automatisch erkannt).
- "Brotli" unter Speed > Optimization aktivieren (Standard: an).
- Page Rules / Cache Rules fuer `*.css`, `*.js`, `assets/fonts/*`,
  `*.webp` mit "Cache Everything" + Edge-Cache-TTL setzen, falls noetig.
- Fuer HTML den Cache-Status "Bypass" belassen, damit Inhaltsaktualisierungen
  sofort sichtbar sind (Service Worker nutzt Network-First fuer HTML).
