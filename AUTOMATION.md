# Automatisierung - DJ Jesse Jay Website

Dieses Dokument beschreibt die automatisierten Prozesse für die Wartung und Generierung der DJ Jesse Jay Website.

## 📋 Übersicht

Die Website nutzt verschiedene Automatisierungstools, um repetitive Aufgaben zu vereinfachen:

| Aufgabe | Tool | Ausführung | Status |
|---------|------|------------|--------|
| **Datenbereinigung** | Node.js Skript | Manuell / GitHub Actions | ✅ Aktiv |
| **URL-Validierung** | Node.js + Axios | GitHub Actions (wöchentlich) | ✅ Aktiv |
| **Sitemap-Generierung** | Node.js | GitHub Actions | ✅ Aktiv |
| **HTML-Generierung** | Eleventy (11ty) | GitHub Actions | ⚠️ Optional |
| **Code-Formatierung** | Prettier | GitHub Actions | ✅ Aktiv |
| **Code-Qualität** | ESLint, Stylelint, HTMLHint | GitHub Actions | ⚠️ Optional |

---

## 🚀 Schnelleinrichtung

### 1. Abhängigkeiten installieren

```bash
# Node.js installieren (falls nicht vorhanden)
# Empfohlen: Node.js 18+ oder 20+

# Abhängigkeiten installieren
npm install
```

### 2. Einzelne Skripte ausführen

```bash
# Events bereinigen (HTML-Tags entfernen, Daten validieren)
npm run clean:events

# URLs validieren (sounds.json, images.json)
npm run validate:urls

# Sitemap und robots.txt generieren
npm run generate:sitemap

# JSON-Dateien formatieren
npm run format:json

# Alle Validierungen ausführen
npm run build

# Kompletter Build (Bereinigung + Validierung + Generierung + Formatierung)
npm run build:full
```

---

## 📂 Verzeichnisstruktur

```
jessejay.ch/
├── .eleventy.js              # Eleventy-Konfiguration
├── .github/
│   └── workflows/
│       ├── automate.yml     # Haupt-Workflow (Validierung + Generierung)
│       ├── lint.yml         # Linting-Workflow
│       └── deploy.yml       # Deployment-Workflow (bereits vorhanden)
├── .prettierrc              # Prettier-Konfiguration
├── package.json             # NPM-Skripte und Abhängigkeiten
├── scripts/
│   ├── clean-events.js      # Bereinigt events.json
│   ├── validate-urls.js     # Validiert URLs in sounds.json und images.json
│   └── generate-sitemap.js   # Generiert sitemap.xml und robots.txt
├── templates/
│   └── _base.njk            # Basis-Template für Eleventy
├── data/
│   ├── events.json          # Events (wird automatisch bereinigt)
│   ├── guestbook.json       # Gästebucheinträge
│   ├── sounds.json          # Radio-Sendungen
│   ├── images.json          # Bilder
│   └── biography.json        # Biografie
├── sitemap.xml              # Automatisch generierte Sitemap
└── robots.txt               # Automatisch generierte robots.txt
```

---

## 🔧 Automatisierungsskripte im Detail

### 1. `scripts/clean-events.js` - Datenbereinigung

**Zweck:** Bereinigt die `events.json`-Datei durch:
- Entfernen von HTML-Tags (z.B. `<br>`, `<br/>`)
- Validieren von Datumsfeldern (`0000-00-00` → `null`)
- Normalisieren von URLs (`www.` → `https://www.`)
- Sortieren der Events nach Datum (neueste zuerst)

**Ausführung:**
```bash
npm run clean:events
```

**Beispiel:**
```json
// Vorher
{
  "eventID": "350",
  "date": "2006-07-08",
  "event": "Labyrinth<br>with Mental X, Martin, Jesse Jay<br>my playtime: round n round all night long!",
  "eventURL": "www.laby.ch/event_detail.html?event_ID=1036"
}

// Nachher
{
  "eventID": "350",
  "date": "2006-07-08",
  "event": "Labyrinth with Mental X, Martin, Jesse Jay my playtime: round n round all night long!",
  "eventURL": "https://www.laby.ch/event_detail.html?event_ID=1036"
}
```

---

### 2. `scripts/validate-urls.js` - URL-Validierung

**Zweck:** Überprüft, ob URLs in `sounds.json` und `images.json` noch gültig sind.

**Funktionen:**
- **Sounds:** Führt HEAD-Requests für alle `urlAbspielen`-URLs aus
- **Images:** Überprüft, ob die lokalen Bilddateien existieren
- Generiert einen Validierungsbericht (`data/url-validation-report.json`)

**Ausführung:**
```bash
npm run validate:urls
```

**Beispiel-Ausgabe:**
```
🔍 Überprüfe 44 Sounds auf gültige URLs...
✅ Sound #44: https://soundcloud.com/jessejay/galaxy-space-night-indian (200)
❌ Sound #1: http://195.210.0.134:554/ramgen/lora/archiv/20030502.rm - Timeout
✅ Sound #41: https://a1.soundcloud.com/images/player-overlay.png?ffb13b (200)

📊 Sounds-Statistik:
   - Gültige URLs: 2
   - Ungültige/fehlende URLs: 42

🔍 Überprüfe 45 Bilder...
✅ Bild #1: _2003-03-28_klubex/DSC02839.jpg (existiert)
❌ Bild #15: _2003-03-28_klubex/maggie_felix.jpg (nicht gefunden)

📊 Bilder-Statistik:
   - Vorhandene Bilder: 10
   - Fehlende/ungültige Bilder: 35
```

---

### 3. `scripts/generate-sitemap.js` - Sitemap-Generierung

**Zweck:** Generiert eine `sitemap.xml` und `robots.txt` für bessere SEO.

**Funktionen:**
- Statische Seiten (index.html, events.html, etc.)
- Dynamische URLs aus JSON-Dateien:
  - Events: `/event/{eventID}.html`
  - Sounds: `/sound/{soundID}.html`
  - Guestbook: `/guestbook/{id}.html` (nur erste 50 Einträge)
- Setzt Change-Frequency und Prioritäten

**Ausführung:**
```bash
npm run generate:sitemap
```

**Generierte Dateien:**
- `sitemap.xml` - XML-Sitemap für Suchmaschinen
- `robots.txt` - Anweisungen für Crawler

---

## 🤖 GitHub Actions Workflows

### 1. `automate.yml` - Haupt-Workflow

**Trigger:**
- Push auf `main`-Branch (wenn Dateien in `data/`, `scripts/`, etc. geändert werden)
- Pull Requests auf `main`
- Jeden Montag um 02:00 UTC (wöchentlich)
- Manuell via GitHub UI

**Jobs:**

#### a) `validate-and-generate`
- Führt alle Validierungsskripte aus
- Generiert Sitemap und robots.txt
- Formatiert JSON-Dateien
- Commited Änderungen automatisch (wenn vorhanden)

#### b) `deploy`
- Baut die Website mit Eleventy
- Deployed auf GitHub Pages

#### c) `backup` (nur bei Schedule-Trigger)
- Erstellt ein Backup-Archiv der Daten
- Lädt Backup als GitHub Artifact hoch (30 Tage Retention)

---

### 2. `lint.yml` - Code-Qualität

**Trigger:**
- Push auf `main`-Branch (wenn HTML/CSS/JS-Dateien geändert werden)
- Pull Requests auf `main`
- Manuell via GitHub UI

**Prüft:**
- HTML mit HTMLHint
- CSS mit Stylelint
- JavaScript mit ESLint
- JSON-Formatierung mit Prettier

---

## 🎯 Eleventy (11ty) - Statischer Site Generator

### Warum Eleventy?

- **Einfach:** Keine komplexe Konfiguration nötig
- **Schnell:** Statische Generierung ohne Server
- **Flexibel:** Unterstützt verschiedene Template-Sprachen (Nunjucks, Liquid, etc.)
- **Keine Abhängigkeiten:** Läuft mit Node.js, keine Datenbank nötig
- **Perfekt für JSON:** Ideal für datengetriebene Websites

### Konfiguration

Die Eleventy-Konfiguration (`/.eleventy.js`) bietet:

- **Custom Collections:** Lädt Daten aus JSON-Dateien
- **Custom Filters:** Hilfsfunktionen für Templates
- **Passthrough Copy:** Kopiert statische Dateien direkt

### Templates

- **`templates/_base.njk`:** Basis-Layout für alle Seiten
- **Variablen:** `title`, `description`, `content`

### Build ausführen

```bash
# Eleventy installieren (falls nicht vorhanden)
npx @11ty/eleventy

# Build ausführen
npx @11ty/eleventy --input=. --output=_site

# Für Entwicklung mit Live-Reload
npx @11ty/eleventy --serve --port=8080
```

---

## 📊 Monitoring und Wartung

### 1. URL-Validierungsbericht

Nach jedem Lauf von `validate-urls.js` wird ein Bericht erstellt:
```json
{
  "timestamp": "2024-01-15T10:30:00.000Z",
  "sounds": {
    "total": 5,
    "invalid": [
      {
        "soundID": "1",
        "urlAbspielen": "http://195.210.0.134:554/ramgen/lora/archiv/20030502.rm",
        "validation": {
          "valid": false,
          "reason": "Timeout"
        }
      }
    ]
  },
  "images": {
    "total": 2,
    "invalid": [
      {
        "imgID": "15",
        "imgName": "_2003-03-28_klubex/maggie_felix.jpg"
      }
    ]
  }
}
```

### 2. GitHub Actions Logs

Alle Workflow-Läufe sind in GitHub einsehbar:
- **Actions Tab** → Workflow auswählen → Run anzeigen
- Logs zeigen detaillierte Informationen über Ausführungen

### 3. Manuelle Überprüfung

```bash
# Alle Skripte nacheinander ausführen
npm run build:full

# Nur Validierung
npm run clean:events
npm run validate:urls

# Nur Generierung
npm run generate:sitemap
npm run format:json
```

---

## 🔄 Regelmäßige Wartung

### Wöchentlich (automatisch)
- URL-Validierung (Montags 02:00 UTC)
- Backup der Daten

### Bei Datenänderungen (automatisch)
- Events bereinigen
- Sitemap aktualisieren
- JSON formatieren

### Manuell (bei Bedarf)
- Neue Events hinzufügen → `data/events.json` bearbeiten
- Neue Sounds hinzufügen → `data/sounds.json` bearbeiten
- Gästebucheinträge → `data/guestbook.json` bearbeiten

---

## 🛠️ Problembehebung

### Häufige Probleme

#### 1. `npm install` schlägt fehl

**Lösung:**
```bash
# Node.js-Version prüfen
node -v

# Cache leeren
npm cache clean --force

# Abhängigkeiten neu installieren
rm -rf node_modules package-lock.json
npm install
```

#### 2. Skript schlägt mit "ECONNABORTED" fehl

**Lösung:** Timeout in `validate-urls.js` erhöhen:
```javascript
const TIMEOUT = 10000; // 10 Sekunden
```

#### 3. GitHub Actions schlägt mit "Permission denied" fehl

**Lösung:** Berechtigungen in Workflow-Datei prüfen:
```yaml
permissions:
  contents: write  # Zum Committen nötig
  pages: write     # Für Deployment nötig
```

#### 4. Eleventy findet Templates nicht

**Lösung:** Pfade in `.eleventy.js` prüfen:
```javascript
return {
  dir: {
    input: '.',
    output: '_site',
    includes: 'templates'  // Muss auf templates-Verzeichnis zeigen
  }
};
```

---

## 📚 Nützliche Ressourcen

- [Eleventy Dokumentation](https://www.11ty.dev/docs/)
- [GitHub Actions Dokumentation](https://docs.github.com/en/actions)
- [Prettier Dokumentation](https://prettier.io/docs/en/index.html)
- [ESLint Dokumentation](https://eslint.org/docs/latest/)
- [Axios Dokumentation](https://axios-http.com/docs/intro)

---

## 🤝 Mitwirken

Beiträge zu den Automatisierungsskripten sind willkommen! 

1. **Fork** das Repository
2. **Branch** erstellen (`git checkout -b feature/neue-funktion`)
3. **Änderungen** commiten
4. **Pull Request** erstellen

### Mögliche Erweiterungen

- [ ] **Automatische Bildoptimierung** (Sharp für WebP-Konvertierung)
- [ ] **Gästebuch-Formular** mit Netlify Functions
- [ ] **Event-Formular** für einfache Dateneingabe
- [ ] **Cypress-Tests** für End-to-End-Testing
- [ ] **Daten-Import/Export** aus CSV/Excel

---

## 📄 Lizenz

Alle Automatisierungsskripte stehen unter der **Apache License 2.0** - gleich wie der Rest des Projekts.

© 2024 DJ Jesse Jay & TwoDivision from Zürich
