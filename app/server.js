const version = "1.0.0-19";  // my lazy ass anti cache: +'-'+Math.random().toString();
const express = require("express");
const fs = require("fs");
const path = require("path");

const app = express();
const {getStats} = require("./server/stats"); // <— neu

const PORT = 3000;
const { normalizeRamModules } = require('./lib/ramsize-util');
const { initI18n } = require('./lib/i18n-config');
initI18n({ app });
const { translateTextI18n } = require('./lib/i18n-util');
const {loadServices} = require("./lib/load-services");
const {loadConfiguration} = require("./lib/load-config");

app.use("/assets", express.static("/data/assets", {
    maxAge: "1h",
    etag: false,
}));


/**
 *
 * @returns {any}
 */
function loadData() {
    const { loadServices } = require('./lib/load-services');
    return loadServices();
}

/**
 *
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
        <img src="/assets/cards/sections/${section.id}.png" alt="${section.title}" />
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
    console.log('Landingpage listening on port '+PORT);
});
