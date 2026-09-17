/**
 * Sitemap Generator
 * Erstellt eine sitemap.xml basierend auf den Seiten und Daten der Website
 */

const fs = require('fs');
const path = require('path');

// Website-Basis-URL
const BASE_URL = 'https://djjessejay.ch';

// Pfade
const eventsPath = path.join(__dirname, '..', 'data', 'events.json');
const soundsPath = path.join(__dirname, '..', 'data', 'sounds.json');
const imagesPath = path.join(__dirname, '..', 'data', 'images.json');
const guestbookPath = path.join(__dirname, '..', 'data', 'guestbook.json');

function generateSitemap() {
    console.log('🔧 Generiere Sitemap...');
    
    // Statische Seiten
    const staticPages = [
        { url: '/', changefreq: 'daily', priority: 1.0 },
        { url: '/index.html', changefreq: 'daily', priority: 1.0 },
        { url: '/events.html', changefreq: 'weekly', priority: 0.8 },
        { url: '/music.html', changefreq: 'weekly', priority: 0.8 },
        { url: '/guestbook.html', changefreq: 'monthly', priority: 0.7 },
        { url: '/contact.html', changefreq: 'monthly', priority: 0.7 },
    ];
    
    // Dynamische URLs aus JSON-Dateien
    const dynamicUrls = [];
    
    try {
        // Events
        if (fs.existsSync(eventsPath)) {
            const events = JSON.parse(fs.readFileSync(eventsPath, 'utf8'));
            events.forEach(event => {
                if (event.eventID && event.date) {
                    dynamicUrls.push({
                        url: `/event/${event.eventID}.html`,
                        changefreq: 'yearly',
                        priority: 0.6
                    });
                }
            });
        }
        
        // Sounds
        if (fs.existsSync(soundsPath)) {
            const sounds = JSON.parse(fs.readFileSync(soundsPath, 'utf8'));
            sounds.forEach(sound => {
                if (sound.soundID) {
                    dynamicUrls.push({
                        url: `/sound/${sound.soundID}.html`,
                        changefreq: 'yearly',
                        priority: 0.5
                    });
                }
            });
        }
        
        // Guestbook entries (nur die ersten 50 für Performance)
        if (fs.existsSync(guestbookPath)) {
            const guestbook = JSON.parse(fs.readFileSync(guestbookPath, 'utf8'));
            guestbook.slice(0, 50).forEach(entry => {
                if (entry.id) {
                    dynamicUrls.push({
                        url: `/guestbook/${entry.id}.html`,
                        changefreq: 'yearly',
                        priority: 0.4
                    });
                }
            });
        }
    } catch (error) {
        console.warn('⚠️  Fehler beim Lesen der JSON-Dateien:', error.message);
    }
    
    // Kombiniere alle URLs
    const allUrls = [...staticPages, ...dynamicUrls];
    
    // Erstelle XML
    let xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
`;
    
    allUrls.forEach(page => {
        const url = page.url.startsWith('/') ? page.url : `/${page.url}`;
        const fullUrl = BASE_URL + url;
        xml += `    <url>
        <loc>${fullUrl}</loc>
        <changefreq>${page.changefreq}</changefreq>
        <priority>${page.priority}</priority>
    </url>
`;
    });
    
    xml += '</urlset>';
    
    // Speichere sitemap.xml
    const sitemapPath = path.join(__dirname, '..', 'sitemap.xml');
    fs.writeFileSync(sitemapPath, xml, 'utf8');
    
    console.log(`✅ Sitemap generiert: ${sitemapPath}`);
    console.log(`   - ${allUrls.length} URLs enthalten`);
    
    return allUrls.length;
}

function generateRobotsTxt() {
    console.log('🔧 Generiere robots.txt...');
    
    const robotsTxt = `User-agent: *
Allow: /

Sitemap: ${BASE_URL}/sitemap.xml

# Crawl-delay für Suchmaschinen
Crawl-delay: 2

# Disallow bestimmte Verzeichnisse
Disallow: /data/
Disallow: /scripts/
Disallow: /js/
Disallow: /css/
`;
    
    const robotsPath = path.join(__dirname, '..', 'robots.txt');
    fs.writeFileSync(robotsPath, robotsTxt, 'utf8');
    
    console.log(`✅ robots.txt generiert: ${robotsPath}`);
}

function main() {
    console.log('╔════════════════════════════════════════════════════════════╗');
    console.log('║          Sitemap & robots.txt Generator für DJ Jesse Jay        ║');
    console.log('╚════════════════════════════════════════════════════════════╝\n');
    
    try {
        const urlCount = generateSitemap();
        generateRobotsTxt();
        
        console.log('\n✅ Sitemap und robots.txt erfolgreich generiert!');
        console.log(`   ${urlCount} URLs in der Sitemap`);
    } catch (error) {
        console.error('\n❌ Fehler bei der Generierung:', error.message);
        process.exit(1);
    }
}

// Führe das Hauptprogramm aus
main();
