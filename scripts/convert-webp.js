/**
 * WebP Converter
 * Konvertiert Rasterbilder (gif, jpg, jpeg, png) im Repository zu WebP,
 * um Ladezeiten und Bandbreite zu reduzieren.
 *
 * Nutzung:
 *   npm run build:webp
 *
 * Voraussetzung: sharp (wird via `npm install` aus devDependencies bereitgestellt).
 * Originaldateien bleiben erhalten; WebP-Varianten werden nebenbei abgelegt.
 */
const fs = require('fs');
const path = require('path');

const sharp = require('sharp');

const ROOT = path.join(__dirname, '..');
const EXTENSIONS = ['.gif', '.jpg', '.jpeg', '.png'];

// Verzeichnisse, die nicht durchsucht werden (z.B. Build-Output, Node-Module).
const SKIP_DIRS = new Set(['.git', 'node_modules', '_site', 'assets/fonts']);

function walk(dir, found) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) {
            if (SKIP_DIRS.has(entry.name)) continue;
            walk(full, found);
        } else if (entry.isFile()) {
            const ext = path.extname(entry.name).toLowerCase();
            if (EXTENSIONS.includes(ext)) found.push(full);
        }
    }
}

async function convert(file) {
    const out = file.replace(/\.(gif|jpg|jpeg|png)$/i, '.webp');
    try {
        const info = await sharp(file).webp({ quality: 80 }).toFile(out);
        const origSize = fs.statSync(file).size;
        const saved = origSize > 0 ? Math.round((1 - info.size / origSize) * 100) : 0;
        console.log(`  ${path.relative(ROOT, file)} -> ${path.relative(ROOT, out)} (${origSize} -> ${info.size} bytes, -${saved}%)`);
        return true;
    } catch (error) {
        console.error(`  FEHLER ${path.relative(ROOT, file)}: ${error.message}`);
        return false;
    }
}

async function main() {
    console.log('🖼️  Konvertiere Rasterbilder zu WebP...');
    const images = [];
    walk(ROOT, images);

    if (images.length === 0) {
        console.log('   Keine Rasterbilder gefunden.');
        return;
    }

    let ok = 0;
    let failed = 0;
    for (const file of images) {
        if (await convert(file)) ok++; else failed++;
    }

    console.log('\n📊 Statistik:');
    console.log(`   - Konvertiert: ${ok}`);
    console.log(`   - Fehlgeschlagen: ${failed}`);
    console.log(`   - Gesamt: ${images.length}`);

    if (failed > 0) process.exitCode = 1;
}

main();
