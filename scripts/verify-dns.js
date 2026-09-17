/**
 * DNS Verification Script
 *
 * Prüft nach einem Nameserver-Wechsel / DNS-Umstellung, ob djjessejay.ch
 * korrekt über Cloudflare ausgeliefert wird und die API an den Origin-Server
 * weitergeleitet wird. Entspricht der Anleitung zur Cloudflare-Konfiguration
 * der Domain djjessejay.ch bei Hosttech.
 *
 * Prüfungen:
 *  - Nameserver delegieren an Cloudflare (ns*.cloudflare.com)
 *  - A-Records für @, www und api sind gesetzt
 *  - A-Records von @ und www liegen in Cloudflare-IP-Bereichen (Proxy aktiv)
 *  - api leitet an den Origin-Server (185.101.158.113) weiter
 *  - HTTPS für djjessejay.ch und /api/test antwortet
 *
 * Ausführung:
 *   node scripts/verify-dns.js                # Standard-Domain
 *   node scripts/verify-dns.js example.ch     # andere Domain
 */

const dns = require('dns').promises;
const fs = require('fs');
const path = require('path');
const axios = require('axios');

// Standard-Domain (anpassbar über ersten CLI-Parameter)
const DOMAIN = process.argv[2] || 'djjessejay.ch';

// Origin-Server laut DNS-Anleitung
const ORIGIN_IP = '185.101.158.113';

// Cloudflare Nameserver (Delegate-Ziel)
const CLOUDFLARE_NS_SUFFIX = '.cloudflare.com';

// Cloudflare IPv4-Präfixe (Auszug, Stand 2025)
// Quelle: https://www.cloudflare.com/ips/
const CLOUDFLARE_IPV4_PREFIXES = [
    '104.16.0.0/13',
    '104.24.0.0/14',
    '172.64.0.0/13',
    '162.158.0.0/15',
    '188.114.96.0/20',
    '190.93.240.0/20',
    '197.234.240.0/22',
    '198.41.128.0/17',
];

// HTTP-Timeout für Live-Checks
const HTTP_TIMEOUT = 8000;

// Hosts, die geprüft werden
const HOSTS = ['@', 'www', 'api'];

function cidrToInt(cidr) {
    const [base, bits] = cidr.split('/');
    const octets = base.split('.').map(Number);
    let ip = 0;
    for (const octet of octets) {
        ip = (ip << 8) + (octet & 0xff);
    }
    return { ip: ip >>> 0, mask: parseInt(bits, 10) };
}

function ipv4ToInt(ip) {
    const octets = ip.split('.').map(Number);
    let value = 0;
    for (const octet of octets) {
        value = (value << 8) + (octet & 0xff);
    }
    return value >>> 0;
}

function isCloudflareIp(ip) {
    if (!ip || !/^\d{1,3}(\.\d{1,3}){3}$/.test(ip)) {
        return false;
    }
    const ipInt = ipv4ToInt(ip);
    return CLOUDFLARE_IPV4_PREFIXES.some((prefix) => {
        const { ip: network, mask } = cidrToInt(prefix);
        const shift = 32 - mask;
        return (ipInt >>> shift) === (network >>> shift);
    });
}

function resolveHost(host) {
    const fqdn = host === '@' ? DOMAIN : `${host}.${DOMAIN}`;
    return fqdn;
}

async function checkNameservers() {
    console.log(`\n🌐 Prüfe Nameserver für ${DOMAIN}...`);
    try {
        const nameservers = await dns.resolveNs(DOMAIN);
        const normalized = nameservers.map((ns) => ns.toLowerCase().replace(/\.$/, ''));
        const cloudflareNs = normalized.filter((ns) => ns.endsWith(CLOUDFLARE_NS_SUFFIX));
        const delegated = cloudflareNs.length > 0;

        normalized.forEach((ns) => {
            const marker = ns.endsWith(CLOUDFLARE_NS_SUFFIX) ? '✅' : '⚠️ ';
            console.log(`   ${marker} ${ns}`);
        });

        console.log(
            delegated
                ? `   → Nameserver delegieren an Cloudflare (${cloudflareNs.join(', ')})`
                : `   → Nameserver delegieren NICHT an Cloudflare (noch Hosttech?)`
        );

        return {
            delegated,
            nameservers: normalized,
            cloudflareNameservers: cloudflareNs,
        };
    } catch (error) {
        console.log(`   ❌ Konnte Nameserver nicht auflösen: ${error.message}`);
        return { delegated: false, nameservers: [], cloudflareNameservers: [], error: error.message };
    }
}

async function checkARecords(host) {
    const fqdn = resolveHost(host);
    console.log(`\n🔍 Prüfe A-Records für ${fqdn}...`);
    try {
        const addresses = await dns.resolve4(fqdn);
        const inCloudflare = addresses.filter((ip) => isCloudflareIp(ip));
        const isOrigin = addresses.includes(ORIGIN_IP);

        addresses.forEach((ip) => {
            const tag = isCloudflareIp(ip) ? '☁️  Cloudflare' : '🏠 Origin/andere';
            console.log(`   → ${ip} (${tag})`);
        });

        const proxied = inCloudflare.length > 0;
        if (host === 'api') {
            console.log(
                isOrigin
                    ? `   ✅ api zeigt auf Origin-Server (${ORIGIN_IP})`
                    : `   ⚠️  api zeigt NICHT auf Origin-Server (${ORIGIN_IP})`
            );
        } else {
            console.log(
                proxied
                    ? `   ✅ Cloudflare-Proxy aktiv (${inCloudflare.length} Cloudflare-IPs)`
                    : `   ⚠️  Kein Cloudflare-Proxy (keine Cloudflare-IPs gefunden)`
            );
        }

        return { host, fqdn, addresses, cloudflareIps: inCloudflare, isOrigin, proxied };
    } catch (error) {
        if (error.code === 'ENOTFOUND' || error.code === 'ESERVFAIL') {
            console.log(`   ❌ Kein A-Record gefunden (${error.code})`);
        } else {
            console.log(`   ❌ Fehler: ${error.message}`);
        }
        return { host, fqdn, addresses: [], cloudflareIps: [], isOrigin: false, proxied: false, error: error.code };
    }
}

async function checkHttps(url) {
    console.log(`\n🔐 Prüfe HTTPS: ${url}`);
    try {
        const response = await axios.get(url, {
            timeout: HTTP_TIMEOUT,
            maxRedirects: 5,
            validateStatus: (status) => status < 500,
        });
        const server = response.headers.server || 'unbekannt';
        const isCloudflare = /cloudflare/i.test(server);
        console.log(`   ✅ HTTP ${response.status} (Server: ${server})`);
        console.log(
            isCloudflare
                ? `   ☁️  Antwort kommt über Cloudflare`
                : `   ℹ️  Server-Header ohne Cloudflare-Hinweis (Proxy evtl. nicht aktiv)`
        );
        return { url, ok: true, status: response.status, server, isCloudflare };
    } catch (error) {
        if (error.response) {
            console.log(`   ⚠️  HTTP ${error.response.status} (Server: ${error.response.headers.server || 'unbekannt'})`);
            return {
                url,
                ok: false,
                status: error.response.status,
                server: error.response.headers.server,
                isCloudflare: /cloudflare/i.test(error.response.headers.server || ''),
            };
        }
        if (error.code === 'ECONNABORTED') {
            console.log(`   ❌ Timeout nach ${HTTP_TIMEOUT}ms`);
        } else {
            console.log(`   ❌ ${error.message}`);
        }
        return { url, ok: false, error: error.code || error.message };
    }
}

async function generateReport(results) {
    const report = {
        timestamp: new Date().toISOString(),
        domain: DOMAIN,
        originIp: ORIGIN_IP,
        nameservers: results.nameservers,
        dns: results.dns,
        https: results.https,
        summary: {
            nsDelegatedToCloudflare: results.nameservers.delegated,
            proxiedHosts: results.dns.filter((r) => r.proxied).map((r) => r.fqdn),
            apiPointsToOrigin: results.dns.find((r) => r.host === 'api')?.isOrigin || false,
            httpsOk: results.https.filter((r) => r.ok).map((r) => r.url),
        },
    };

    const reportPath = path.join(__dirname, '..', 'data', 'dns-verification-report.json');
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2), 'utf8');
    console.log(`\n📝 Bericht gespeichert: ${reportPath}`);
    return report;
}

async function main() {
    console.log('╔══════════════════════════════════════════════════════════════════╗');
    console.log('║        DNS-Verifikation für Cloudflare-Konfiguration              ║');
    console.log(`║        Domain: ${DOMAIN.padEnd(49)}║`);
    console.log('╚══════════════════════════════════════════════════════════════════╝\n');

    const nameservers = await checkNameservers();
    const dnsResults = [];
    for (const host of HOSTS) {
        dnsResults.push(await checkARecords(host));
    }

    const httpsResults = [
        await checkHttps(`https://${DOMAIN}`),
        await checkHttps(`https://www.${DOMAIN}`),
        await checkHttps(`https://api.${DOMAIN}/test`),
    ];

    const results = { nameservers, dns: dnsResults, https: httpsResults };
    const report = await generateReport(results);

    console.log('\n────────────────────────── Zusammenfassung ──────────────────────────');
    console.log(
        report.summary.nsDelegatedToCloudflare
            ? `✅ Nameserver → Cloudflare`
            : `⚠️  Nameserver → noch NICHT Cloudflare`
    );
    console.log(
        report.summary.proxiedHosts.length > 0
            ? `✅ Proxy aktiv für: ${report.summary.proxiedHosts.join(', ')}`
            : `⚠️  Kein Cloudflare-Proxy erkannt (DNS-Propagation evtl. noch läuft)`
    );
    console.log(
        report.summary.apiPointsToOrigin
            ? `✅ api → Origin (${ORIGIN_IP})`
            : `⚠️  api → noch NICHT am Origin (${ORIGIN_IP})`
    );
    console.log(
        report.summary.httpsOk.length > 0
            ? `✅ HTTPS erreichbar: ${report.summary.httpsOk.join(', ')}`
            : `❌ Kein HTTPS-Endpunkt erreichbar`
    );

    const fullyOk =
        report.summary.nsDelegatedToCloudflare &&
        report.summary.proxiedHosts.length >= 2 &&
        report.summary.apiPointsToOrigin &&
        report.summary.httpsOk.length >= 1;

    if (fullyOk) {
        console.log('\n🎉 DNS-Verifikation erfolgreich: Cloudflare-Setup ist aktiv.');
    } else {
        console.log('\n⏳ DNS-Verifikation noch nicht vollständig. DNS-Propagation kann 24–48h dauern.');
    }

    process.exit(fullyOk ? 0 : 1);
}

main().catch((error) => {
    console.error('\n❌ Unerwarteter Fehler bei der DNS-Verifikation:', error.message);
    process.exit(1);
});
