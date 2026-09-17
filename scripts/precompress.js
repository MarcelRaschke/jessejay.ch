/**
 * Precompress Assets (Brotli + Gzip)
 * Erzeugt vorkomprimierte `.br`- und `.gz`-Varianten fuer Text-Assets
 * (html, css, js, json, xml, txt, svg, woff2), damit ein kompatibler
 * Webserver diese direkt ausliefern kann (siehe `.htaccess` / `_headers`).
 *
 * Nutzung:
 *   npm run build:compress
 */
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const ROOT = path.join(__dirname, '..');
const EXTENSIONS = new Set(['.html', '.css', '.js', '.json', '.xml', '.txt', '.svg', '.woff2', '.ttf']);
const SKIP_DIRS = new Set(['.git', 'node_modules', '_site', 'assets/fonts/webfonts']);

function walk(dir, found) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) {
            if (SKIP_DIRS.has(entry.name)) continue;
            walk(full, found);
        } else if (entry.isFile()) {
            const ext = path.extname(entry.name).toLowerCase();
            if (EXTENSIONS.has(ext)) found.push(full);
        }
    }
}

function compress(file, method, ext, level) {
    return new Promise((resolve) => {
        const out = file + ext;
        const source = fs.createReadStream(file);
        const dest = fs.createWriteStream(out);
        const compressor = method === 'br'
            ? zlib.createBrotliCompress({ params: { [zlib.constants.BROTLI_PARAM_QUALITY]: level } })
            : zlib.createGzip({ level });
        source.pipe(compressor).pipe(dest);
        dest.on('finish', () => resolve(out));
        dest.on('error', () => resolve(null));
    });
}

async function main() {
    console.log('🗜️  Erzeuge vorkomprimierte Assets (Brotli + Gzip)...');
    const files = [];
    walk(ROOT, files);
    if (files.length === 0) {
        console.log('   Keine komprimierbaren Dateien gefunden.');
        return;
    }

    let count = 0;
    for (const file of files) {
        const rel = path.relative(ROOT, file);
        try {
            await compress(file, 'br', '.br', 11);
            await compress(file, 'gzip', '.gz', 9);
            count++;
            console.log(`  ${rel} -> .br, .gz`);
        } catch (error) {
            console.error(`  FEHLER ${rel}: ${error.message}`);
        }
    }
    console.log(`\n📊 ${count} Dateien komprimiert.`);
}

main();
