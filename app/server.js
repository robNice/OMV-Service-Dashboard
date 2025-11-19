const express = require("express");
const fs = require("fs");
const path = require("path");

const app = express();
const {getStats} = require("./server/stats"); // <— neu

const PORT = 3000;

const i18n = require('i18n');
i18n.configure({
    locales: ['en-GB', 'de-DE'],
    defaultLocale: 'en-GB',
    directory: '/data/i18n',
    objectNotation: true,
    header: 'accept-language',
    register: global,
    fallbacks: {
        'en': 'en-GB',
        'en-US': 'en-GB',
        'de': 'de-DE'
    },
    updateFiles: false,
    syncFiles: false
});
app.use(i18n.init);

app.use("/assets", express.static("/data/assets", {
    maxAge: "1h",
    etag: false,
}));


/**
 *
 * @returns {any}
 */
function loadData() {
    const raw = fs.readFileSync("/data/services.json", "utf-8");
    return JSON.parse(raw);
}

/**
 *
 * @returns {any}
 */
function loadConfig() {
    const raw = fs.readFileSync("/data/config.json", "utf-8");
    return JSON.parse(raw);
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
        <img src="/assets/cards/services/${service.logo}" alt="${service.title}" />
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
        <img src="/assets/cards/sections/${section.thumbnail}" alt="${section.title}" />
        <div class="service-title">${section.title}</div>
      </a>
    </div>`;
}

/**
 *
 * @param template
 * @param backlink
 * @param version
 * @param title
 * @param cards
 * @returns {*}
 */
function setTemplate( req, template, backlink, version, title, cards )  {
    return  translateHtmlI18n(
        template
        .replace(/{{BACKLINK}}/g, backlink)
        .replace(/{{VERSION}}/g, version)
        .replace(/{{TITLE}}/g, title)
        .replace(/{{SECTION_NAME}}/g, title)
        .replace(/{{SECTIONS_SERVICES}}/g, cards),
        { locale: req.getLocale() }
    );
}

function translateHtmlI18n(html, { locale } = {}) {
    if (typeof html !== 'string' || html.length === 0) return html || '';

    // Optional temporär die Locale umschalten
    let prevLocale;
    if (locale) {
        prevLocale = i18n.getLocale();
        i18n.setLocale(locale);
    }

    // {{__.key.path}} oder {{__.key.path|{"name":"Manfred"}} (JSON-Args optional)
    const rx = /\{\{\s*__\.([a-zA-Z0-9_.-]+)(?:\s*\|\s*(\{[\s\S]*?\}))?\s*\}\}/g;

    const out = html.replace(rx, (_m, key, jsonArgs) => {
        let vars;
        if (jsonArgs) {
            try { vars = JSON.parse(jsonArgs); } catch { /* ignore bad args */ }
        }
        const val = __(key, vars); // global __
        return (typeof val === 'string' && val.length) ? val : `??${key}??`;
    });

    if (locale) i18n.setLocale(prevLocale);
    return out;
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
        res.set("Cache-Control", "no-store");
        res.json(data);
    } catch (err) {
        console.error("GET /api/stats failed:", err);
        res.status(500).json({error: "stats_failed"});
    }
});


app.get("/", (req, res) => {
    const data = loadData();
    const config = loadConfig()
    const sections = data.sections.map(renderSection).join("\n");
    const html = setTemplate( req, loadTemplate(), '', config.version, config.title, sections );

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
        config.version,
        config.title + ' - ' + section.title,
        services
    );
    res.send(html);
});

app.listen(PORT, () => {
    console.log(i18n.__('log.listening', { port: PORT }));
});
