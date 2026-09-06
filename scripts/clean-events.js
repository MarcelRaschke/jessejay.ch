/**
 * Clean Events Script
 * Bereinigt events.json: entfernt HTML-Tags, validiert Daten, sortiert nach Datum
 */

const fs = require('fs');
const path = require('path');

// Pfade
const eventsPath = path.join(__dirname, '..', 'data', 'events.json');

function cleanEvents() {
    // Lese die aktuelle events.json
    const rawData = fs.readFileSync(eventsPath, 'utf8');
    const events = JSON.parse(rawData);
    
    console.log(`Verarbeite ${events.length} Events...`);
    
    // Bereinigung
    const cleanedEvents = events
        .map(event => {
            // Erstelle eine Kopie des Events
            const cleaned = { ...event };
            
            // 1. HTML-Tags aus event-Feld entfernen (z.B. <br>)
            if (cleaned.event) {
                cleaned.event = cleaned.event
                    .replace(/<br\s*\/?>/gi, ' ')
                    .replace(/<\/br>/gi, ' ')
                    .replace(/<[^>]*>/g, '')
                    .trim();
            }
            
            // 2. HTML-Tags aus lineup-Feld entfernen (falls vorhanden)
            if (cleaned.lineup) {
                cleaned.lineup = cleaned.lineup
                    .replace(/<br\s*\/?>/gi, ', ')
                    .replace(/<\/br>/gi, ', ')
                    .replace(/<[^>]*>/g, '')
                    .trim();
            }
            
            // 3. Datum validieren
            if (cleaned.date === '0000-00-00' || !cleaned.date) {
                cleaned.date = null;
            } else {
                // Prüfe, ob das Datum gültig ist
                const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
                if (!dateRegex.test(cleaned.date)) {
                    console.log(`Ungültiges Datum gefunden: ${cleaned.date} (Event ID: ${cleaned.eventID})`);
                    cleaned.date = null;
                }
            }
            
            // 4. eventURL normalisieren
            if (cleaned.eventURL) {
                // http:// ohne :// ergänzen
                if (cleaned.eventURL.startsWith('www.')) {
                    cleaned.eventURL = `https://${cleaned.eventURL}`;
                }
                // Leere Strings zu null
                if (cleaned.eventURL === '' || cleaned.eventURL === 'null') {
                    cleaned.eventURL = null;
                }
            }
            
            // 5. lineup normalisieren
            if (cleaned.lineup === '' || cleaned.lineup === 'null') {
                cleaned.lineup = null;
            }
            
            return cleaned;
        })
        .filter(event => {
            // Optional: Events ohne Datum entfernen
            // return event.date !== null;
            return true; // Behalte alle Events
        });
    
    // Nach Datum sortieren (absteigend - neueste zuerst)
    cleanedEvents.sort((a, b) => {
        if (!a.date && !b.date) return 0;
        if (!a.date) return 1; // a kommt nach b
        if (!b.date) return -1; // b kommt nach a
        return new Date(b.date) - new Date(a.date);
    });
    
    // Speichere die bereinigte Version
    const outputPath = path.join(__dirname, '..', 'data', 'events-cleaned.json');
    fs.writeFileSync(outputPath, JSON.stringify(cleanedEvents, null, 2), 'utf8');
    
    // Überschreibe auch die Originaldatei
    fs.writeFileSync(eventsPath, JSON.stringify(cleanedEvents, null, 2), 'utf8');
    
    console.log(`✅ Bereinigung abgeschlossen!`);
    console.log(`   - ${events.length} Events verarbeitet`);
    console.log(`   - ${cleanedEvents.length} Events behalten`);
    console.log(`   - Ausgabe: ${outputPath}`);
    
    // Statistik
    const withDate = cleanedEvents.filter(e => e.date).length;
    const withoutDate = cleanedEvents.filter(e => !e.date).length;
    console.log(`   - Events mit Datum: ${withDate}`);
    console.log(`   - Events ohne Datum: ${withoutDate}`);
}

// Führe die Bereinigung aus
try {
    cleanEvents();
} catch (error) {
    console.error('❌ Fehler bei der Bereinigung:', error.message);
    process.exit(1);
}
