# Projektfahrplan – jessejay.ch

Dieses Dokument beschreibt die wichtigsten Meilensteine für die Pflege und
Modernisierung der Website **jessejay.ch** (DJ Jesse Jay, Zürich). Der Fahrplan
basiert auf dem Ist-Zustand des Repositories und ist als living document gedacht:
Statusangaben werden bei Fortschritt aktualisiert.

Legende: `✅ erledigt` · `🟡 in Arbeit` · `⚪ geplant` · `🚧 blockiert`

---

## Ausgangslage (Ist-Zustand)

| Aspekt | Befund |
| --- | --- |
| Technologie | PHP-Seiten (`news.php`, `events.php`, `contact.php`, `gallery.php`, `music.php`, `links.php`, `biography.php`, Gästebuch `gbook*.php`), SQL-Dumps (`*.sql`), statische HTML/JS/CSS-Assets |
| Repository-Grösse | ~33 MB, dominiert von grossen Binärdateien (`RadioStudio.mov` ~21 MB, `DJPult.gif` ~5 MB, `JesseJayBanner.mov` ~1,5 MB) |
| Defekte Inhalte | Mehrere `.php`-Dateien enthalten Wayback-Machine-Fehlerseiten bzw. hartcodierte `502 Bad Gateway`-Antworten statt echten Quellcode |
| Fehlkonfigurationen | `robots.txt` enthält HTML statt Robots-Anweisungen; `favicon.ico` ist 0 Byte; `.github` enthält mehrere umbenannte/doppelte Dependabot-Konfigurationen (`dependabo.yml`, `dependabotup.yml`, `dependaboupt.yml`, `dependat.yml`, `dependency.yml`) |
| CI-Workflows | Viele unpassende/standardisierte Workflows (`jekyll.yml`, `hugo.yml`, `mdbook.yml`, `nextjs.yml`, `webpack.yml`), die zum Projekt passen bereinigt werden müssen |
| Dokumentation | `README.md` ist nahezu leer (nur Bannerbilder); keine Projektbeschreibung, keine Deploy-Anleitung |
| Sicherheit | `SECURITY.md` ist nur eine Vorlage; die `🔒`-Datei im Root liegt ungeprüft vor |

---

## Meilensteine

### M0 – Stabilisierung & Inventar
**Ziel:** Den Ist-Zustand verlässlich erfassen und das Repository von offensichtlich defekten/duplikaten Inhalten befreien, ohne Funktionalität zu verlieren.

- [ ] **Inventar** aller Dateien erstellen (PHP, HTML, SQL, Media, JS/CSS) mit Zustand (echter Quellcode / Mirror-Fehlerseite / Asset)
- [ ] **Binärdateien** (`*.mov`, `*.gif`, `*.swf`, `*.jpg`) aus dem Git-Historie-Blickwinkel bewerten; prüfen, ob Git-LFS oder Auslagerung in ein Asset-Backend sinnvoll ist
- [ ] **Defekte Mirror-Inhalte** (Wayback-Machine-Seiten, `502 Bad Gateway` in `gbook.php` etc.) identifizieren und gegen echte Quellen/Backups ersetzen oder als deprecated markieren
- [ ] **`robots.txt`** durch gültige Robots-Anweisungen ersetzen
- [ ] **`favicon.ico`** (0 Byte) durch ein gültiges Icon ersetzen
- [ ] **Dependabot-Duplikate** in `.github/` aufräumen (nur eine gültige `dependabot.yml` belassen)
- [ ] **`🔒`-Datei** prüfen: Einsatzzweck klären oder entfernen

**Abnahmekriterium:** Inventar-Dokument liegt vor; Repository enthält keine offensichtlichen Fehlerseiten als Quellcode; nur eine Dependabot-Konfiguration aktiv.

**Status:** 🟡 in Arbeit

---

### M1 – Build & Deployment reproduzierbar machen
**Ziel:** Die Website lässt sich lokal und in CI reproduzierbar bauen und ausliefern.

- [ ] **PHP-Version festlegen** und dokumentieren (aktuell noch Legacy-PHP im SQL-Dump referenziert)
- [ ] **Lokale Umgebung** definieren (z. B. PHP-integrated server oder Docker) und in `README.md`/`CONTRIBUTING.md` beschreiben
- [ ] **Datenbank-Schema** aus `*.sql` als versionierte Migrationen abbilden (statt roher phpMyAdmin-Dumps)
- [ ] **CI-Workflows bereinigen:** unpassende Generatoren (Jekyll, Hugo, mdBook, Next.js, webpack) entfernen oder durch ein zum Projekt passendes Build/Deploy ersetzen
- [ ] **Deploy-Ziel** klären (GitHub Pages vs. PHP-Hosting) und in Workflow abbilden

**Abnahmekriterium:** Ein neu geklonter Klon lässt sich mit einem dokumentierten Befehl lokal starten; CI läuft grün und deployt erfolgreich.

**Status:** ⚪ geplant

---

### M2 – Quellcode-Inventarisierung & technische Schuldenabbau
**Ziel:** Echte PHP-Logik von statischen Inhalten trennen; offensichtliche technische Schulden beheben.

- [ ] **PHP-Dateien klassifizieren:** echte Logik (z. B. Gästebuch-Eingabe über `gbook02.php`) vs. reine HTML-Ausgaben
- [ ] **Hardcodierte Fehlerseiten** (`gbook.php`, `news.php`, `contact.php`) durch echten Quellcode ersetzen oder als deprecated entfernen
- [ ] **Eingabevalidierung / Spam-Schutz** im Gästebuch prüfen und ggf. nachziehen
- [ ] **SQL-Injection-Risiken** in PHP-Dateien reviewen (parameterisierte Queries)
- [ ] **Inline-Styles** auflösen in `jessejay.css` bzw. ein modernes Stylesheet
- [ ] **Veraltete Plugins/`get_flashplayer`**-Referenzen und `.swf`-Nutzung evaluieren (Flash ist EOL)

**Abnahmekriterium:** Keine PHP-Datei enthält eine Mirror-Fehlerseite; Sicherheits-Review der Eingaben durchgeführt.

**Status:** ⚪ geplant

---

### M3 – Responsive & barrierearmes Frontend
**Ziel:** Die Website ist auf Mobilgeräten nutzbar und entspricht Grundanforderungen an Barrierearmut.

- [ ] **Viewport/Meta-Tags** konsistent in allen Seiten setzen
- [ ] **Responsives Layout** auf Basis von W3.CSS bzw. einem modernen Ansatz umsetzen
- [ ] **Medien responsiv einbinden** (Bilder, Banner, mov) inkl. Lazy-Loading
- [ ] **Kontraste & Schriftgrössen** prüfen (aktuell sehr kleine Schriften in `home.html`)
- [ ] **Tastaturnavigation & Fokus-States** sicherstellen

**Abnahmekriterium:** Lighthouse-Report Mobile ≥ 80 für Performance/Accessibility auf der Startseite.

**Status:** ⚪ geplant

---

### M4 – Content & SEO
**Ziel:** Inhalte sind aktuell, strukturiert und auffindbar.

- [ ] **News/Events/Biografie** auf Aktualität prüfen und Pflegeprozess definieren
- [ ] **Gästebuch** als funktionierende Seite wiederherstellen oder durch eine zeitgemässe Lösung ersetzen
- [ ] **Sitemap.xml** generieren und bei Suchmaschinen einreichen
- [ ] **Meta-Tags** (Title, Description, OG) konsistent pflegen
- [ ] **Broken Links** in `links.php` / News-Einträgen prüfen

**Abnahmekriterium:** Keine Broken Links auf den Hauptseiten; Sitemap vorhanden und eingereicht.

**Status:** ⚪ geplant

---

### M5 – Sicherheit & Governance
**Ziel:** Sicherheitsrichtlinien sind konkret und das Repository ist gepflegt.

- [ ] **`SECURITY.md`** mit projektspezifischen Versions-/Reporting-Angaben ausfüllen
- [ ] **Secrets/Credentials** prüfen (keine fest codierten DB-Zugänge im Repo)
- [ ] **`CONTRIBUTING.md`** Kontaktmethode für Verhaltenskodex-Meldungen ergänzen (`[KONTAKTMETHODE EINFÜGEN]`)
- [ ] **Branch-Schutz & Review-Regeln** für `main` definieren
- [ ] **Abhängigkeits-Updates** (Renovate/Dependabot) konfigurieren und prüfen

**Abnahmekriterium:** `SECURITY.md` ist ausgefüllt; keine Secrets im Repo; Branch-Schutz aktiv.

**Status:** ⚪ geplant

---

## Zeitliche Übersicht (indikativ)

| Meilenstein | Priorität | Abhängigkeit |
| --- | --- | --- |
| M0 Stabilisierung & Inventar | Hoch | – |
| M1 Build & Deployment | Hoch | M0 |
| M2 Quellcode-Schuldenabbau | Mittel | M1 |
| M3 Responsive Frontend | Mittel | M2 |
| M4 Content & SEO | Mittel | M1 |
| M5 Sicherheit & Governance | Hoch | M0 |

Meilensteine können parallel vorangetrieben werden, sofern Abhängigkeiten respektiert werden.

---

## Pflege dieses Dokuments

- Status und Haken bei jedem Fortschritt aktualisieren.
- Neue Meilensteine nur aufnehmen, wenn sie einen klaren Mehrwert und Abnahmekriterien haben.
- Änderungen am Fahrplan im Rahmen eines Pull Requests reviewen lassen.
