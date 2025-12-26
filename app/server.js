const version = "1.2.0-0" // my lazy ass anti cache: +'-'+Math.random().toString();
const express = require("express");
const fs = require("fs");
const path = require("path");
const { CONFIG_DIR } = require('./lib/paths');
const { resolveAssetPath } = require('./lib/asset-resolver');
const app = express();
const CARD_EXTS = ['jpg', 'gif', 'webp', 'png'];
const cardCache = new Map();
const USER_CARDS = path.join(CONFIG_DIR, 'assets/cards/sections');
const APP_CARDS  = path.join(__dirname, '../data/assets/cards/sections');


if (!fs.existsSync('/config')) {
    console.log('[config] No /config directory found.');
    console.log('[config] Copy config.example to config to customize the dashboard.');
}

const {getStats} = require("./server/stats");

const { normalizeRamModules } = require('./lib/ramsize-util');
const { initI18n } = require('./lib/i18n-config');
initI18n({ app });
const { translateTextI18n } = require('./lib/i18n-util');
const {loadServices} = require("./lib/load-services");
const {loadConfiguration} = require("./lib/load-config");

const config = loadConfig();

const PORT =
    Number(process.env.PORT) ||
    Number(config.port) ||
    3000;


const mime = require('mime-types');

function sendAsset(res, file) {
    res.type(mime.lookup(file) || 'application/octet-stream');
    fs.createReadStream(file).pipe(res);
}

/**
 * Load all data from disk and return it as a single object.
 * @returns {any}
 */
function loadData() {
    const { loadServices } = require('./lib/load-services');
    return loadServices();
}

/**
 * Resolve a section card image path for a given section ID.
 * @param id
 * @returns {string}
 */
function resolveSectionCard(id) {
    const cached = cardCache.get(id);

    if (cached) {
        const { fsPath, mtimeMs, url } = cached;
        if (fs.existsSync(fsPath)) {
            const stat = fs.statSync(fsPath);
            if (stat.mtimeMs === mtimeMs) {
                return url;
            }
        }
        cardCache.delete(id);
    }

    if (cardCache.has(id)) {
        return cardCache.get(id);
    }

    const bases = [
        { fs: USER_CARDS, url: '/assets/cards/sections' },
        { fs: APP_CARDS,  url: '/assets/cards/sections' }
    ];

    for (const base of bases) {
        if (!fs.existsSync(base.fs)) continue;

        for (const ext of CARD_EXTS) {
            const file = `${id}.${ext}`;
            const fsPath = path.join(base.fs, file);
            if (fs.existsSync(fsPath)) {
                const url = `${base.url}/${file}`;
                cardCache.set(id, url);
                return url;
            }
        }
    }
    const fallback = '/assets/cards/sections/_default.png';
    cardCache.set(id, fallback);
    return fallback;
}

/**
 * Build an ETag header value for a given stat object.
 * @param stat
 * @returns {string}
 */
function buildEtag(stat) {
    return `"${stat.size}-${stat.mtimeMs}"`;
}

/**
 * Load the configuration from disk and return it as a single object.
 * @returns {any}
 */
function loadConfig() {
    const { loadServices } = require('./lib/load-config');
    return loadConfiguration();
}

/**
 *
 * @param service
 * @returns {string}
 */
function renderService(service) {
    return `
    <div class="service">
      <a href="${service.url}" target="_blank">
        <img src="/assets/cards/services/${service.logo || '_default.png'}" alt="${service.title}" />
        <div class="service-title">${service.title}</div>
      </a>
    </div>`;
}

/**
 *
 * @param section
 * @returns {string}
 */
function renderSection(section) {
    return `
    <div class="service">
      <a href="/section/${encodeURIComponent(section.id)}">
        <img src="${resolveSectionCard(section.id)}" alt="${section.title}" />
        <div class="service-title">${section.title}</div>
      </a>
    </div>`;
}

/**
 *
 * @param req
 * @param template
 * @param backlink
 * @param version
 * @param title
 * @param cards
 * @returns {*}
 */
function setTemplate( req, template, backlink, version, title, cards )  {
    return  translateTextI18n(
        template
        .replace(/{{BACKLINK}}/g, backlink)
        .replace(/{{VERSION}}/g, version)
        .replace(/{{TITLE}}/g, title)
        .replace(/{{SECTION_NAME}}/g, title)
        .replace(/{{SECTIONS_SERVICES}}/g, cards),
        { locale: req.getLocale() }
    );
}

/**
 *
 * @returns {string}
 */
function loadTemplate() {
    return fs.readFileSync("/app/templates/index.html", "utf-8");
}

app.get("/favicon.ico", (req, res) => {
    res.type("image/x-icon");
    res.set("Cache-Control", "public, max-age=31536000, immutable");
    res.sendFile("favicon.ico", {root: "/data/assets"}, (err) => {
        if (err) {
            console.error("favicon send failed:", err);
            res.status(404).end();
        }
    });
});

app.head("/favicon.ico", (req, res) => res.status(200).end());

app.get("/api/stats", async (req, res) => {
    try {

        const data = await getStats();
        const locale = req.getLocale ? req.getLocale() : 'en-GB';
        if (data.system && Array.isArray(data.system.ram)) {
            data.system.ram = normalizeRamModules(data.system.ram, { locale });
        }
        res.set("Cache-Control", "no-store");
        res.json(data);
    } catch (err) {
        console.error("GET /api/stats failed:", err);
        res.status(500).json({error: "stats_failed"});
    }
});

app.get('/assets/*', (req, res) => {
    const relPath = req.params[0];

    if (relPath.includes('..')) {
        return res.status(400).end();
    }

    const file = resolveAssetPath(relPath);
    if (!file) {
        return res.status(404).end();
    }

    const stat = fs.statSync(file);
    const etag = buildEtag(stat);

    if (req.headers['if-none-match'] === etag) {
        return res.status(304).end();
    }
    res.setHeader('ETag', etag);

    if (file === CONFIG_DIR || file.startsWith(CONFIG_DIR + path.sep)) {
        res.setHeader('Cache-Control', 'no-cache');
    } else {
        res.setHeader('Cache-Control', 'public, max-age=3600');
    }

    //res.sendFile(file)
    sendAsset(res, file);
});

app.get("/", (req, res) => {
    const data = loadData();
    const config = loadConfig()
    const sections = data.sections.map(renderSection).join("\n");
    const html = setTemplate( req, loadTemplate(), '', version, config.title, sections );

    res.send(html);
});


app.get("/section/:id", (req, res) => {
    const data = loadData();
    const config = loadConfig()
    const section = data.sections.find(s => s.id === req.params.id);
    if (!section) {
        return res.status(404).send("Sektion nicht gefunden");
    }
    const services = (section.services || []).map(renderService).join("\n");
    const html = setTemplate(
        req,
        loadTemplate(),
        '<a href="/" style="margin: 1rem; display: inline-block;">← '+__('label.back')+'</a>',
        version,
        config.title + ' - ' + section.title,
        services
    );
    res.send(html);
});

app.listen(PORT, () => {
    console.log('Service Dashboard listening on port '+PORT);
});
