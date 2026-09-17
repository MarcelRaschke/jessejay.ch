/**
 * URL Validation Script
 * Überprüft, ob URLs in sounds.json und images.json noch gültig sind
 */

const fs = require('fs');
const path = require('path');
const axios = require('axios');

// Timeout für HTTP-Requests in Millisekunden
const TIMEOUT = 5000;

// Pfade
const soundsPath = path.join(__dirname, '..', 'data', 'sounds.json');
const imagesPath = path.join(__dirname, '..', 'data', 'images.json');

async function checkUrl(url) {
    try {
        if (!url || url === '') {
            return { valid: false, reason: 'URL ist leer' };
        }
        
        // URL normalisieren
        let normalizedUrl = url;
        if (normalizedUrl.startsWith('www.')) {
            normalizedUrl = `https://${normalizedUrl}`;
        }
        
        // HEAD-Request für schnelle Überprüfung
        const response = await axios.head(normalizedUrl, {
            timeout: TIMEOUT,
            validateStatus: function (status) {
                // Akzeptiere alle Status-Codes < 500
                return status < 500;
            }
        });
        
        if (response.status >= 200 && response.status < 400) {
            return { valid: true, status: response.status };
        } else if (response.status >= 400 && response.status < 500) {
            return { valid: false, status: response.status, reason: `HTTP ${response.status}` };
        } else {
            return { valid: false, status: response.status, reason: `HTTP ${response.status}` };
        }
    } catch (error) {
        if (error.code === 'ECONNABORTED') {
            return { valid: false, reason: 'Timeout' };
        } else if (error.response) {
            return { valid: false, status: error.response.status, reason: `HTTP ${error.response.status}` };
        } else {
            return { valid: false, reason: error.message || 'Unbekannter Fehler' };
        }
    }
}

async function validateSounds() {
    const rawData = fs.readFileSync(soundsPath, 'utf8');
    const sounds = JSON.parse(rawData);
    
    console.log(`\n🔍 Überprüfe ${sounds.length} Sounds auf gültige URLs...`);
    
    let validCount = 0;
    let invalidCount = 0;
    const invalidSounds = [];
    
    for (const sound of sounds) {
        if (sound.urlAbspielen) {
            const result = await checkUrl(sound.urlAbspielen);
            
            if (result.valid) {
                validCount++;
                console.log(`✅ Sound #${sound.soundID}: ${sound.urlAbspielen} (${result.status})`);
            } else {
                invalidCount++;
                console.log(`❌ Sound #${sound.soundID}: ${sound.urlAbspielen} - ${result.reason}`);
                invalidSounds.push({
                    ...sound,
                    validation: result
                });
            }
        } else {
            console.log(`⚠️  Sound #${sound.soundID}: Keine URL vorhanden`);
            invalidCount++;
            invalidSounds.push(sound);
        }
    }
    
    console.log('\n📊 Sounds-Statistik:');
    console.log(`   - Gültige URLs: ${validCount}`);
    console.log(`   - Ungültige/fehlende URLs: ${invalidCount}`);
    
    return invalidSounds;
}

async function validateImages() {
    // Hinweis: Bilder sind lokal gespeichert, also prüfen wir nur die Dateipfade
    const rawData = fs.readFileSync(imagesPath, 'utf8');
    const images = JSON.parse(rawData);
    
    console.log(`\n🔍 Überprüfe ${images.length} Bilder...`);
    
    let validCount = 0;
    let invalidCount = 0;
    const invalidImages = [];
    
    // Da die Bilder lokal sind, prüfen wir nur die Dateipfade
    for (const image of images) {
        if (image.imgName) {
            // Prüfe, ob die Datei existiert (relativer Pfad)
            const imagePath = path.join(__dirname, '..', image.imgName);
            
            try {
                // Überprüfe, ob die Datei existiert
                if (fs.existsSync(imagePath)) {
                    validCount++;
                    console.log(`✅ Bild #${image.imgID}: ${image.imgName} (existiert)`);
                } else {
                    invalidCount++;
                    console.log(`❌ Bild #${image.imgID}: ${image.imgName} (nicht gefunden)`);
                    invalidImages.push(image);
                }
            } catch (error) {
                invalidCount++;
                console.log(`❌ Bild #${image.imgID}: ${image.imgName} - Fehler: ${error.message}`);
                invalidImages.push(image);
            }
        } else {
            console.log(`⚠️  Bild #${image.imgID}: Kein Dateiname vorhanden`);
            invalidCount++;
            invalidImages.push(image);
        }
    }
    
    console.log('\n📊 Bilder-Statistik:');
    console.log(`   - Vorhandene Bilder: ${validCount}`);
    console.log(`   - Fehlende/ungültige Bilder: ${invalidCount}`);
    
    return invalidImages;
}

async function generateReport(invalidSounds, invalidImages) {
    const report = {
        timestamp: new Date().toISOString(),
        sounds: {
            total: invalidSounds.length,
            invalid: invalidSounds
        },
        images: {
            total: invalidImages.length,
            invalid: invalidImages
        }
    };
    
    const reportPath = path.join(__dirname, '..', 'data', 'url-validation-report.json');
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2), 'utf8');
    
    console.log(`\n📝 Bericht gespeichert: ${reportPath}`);
    
    return report;
}

async function main() {
    console.log('╔════════════════════════════════════════════════════════════╗');
    console.log('║         URL-Validierung für DJ Jesse Jay Website             ║');
    console.log('╚════════════════════════════════════════════════════════════╝\n');
    
    try {
        const invalidSounds = await validateSounds();
        const invalidImages = await validateImages();
        await generateReport(invalidSounds, invalidImages);
        
        console.log('\n✅ URL-Validierung abgeschlossen!');
        
        if (invalidSounds.length > 0 || invalidImages.length > 0) {
            console.log('⚠️  Es wurden ungültige URLs/Dateien gefunden. Siehe Bericht.');
            process.exit(1);
        } else {
            console.log('🎉 Alle URLs sind gültig!');
        }
    } catch (error) {
        console.error('\n❌ Fehler bei der URL-Validierung:', error.message);
        process.exit(1);
    }
}

// Führe das Hauptprogramm aus
main();
