const express = require("express");
const fs = require("fs");
const path = require("path");

const app = express();
const {getStats} = require("./server/stats"); // <— neu

const PORT = 3000;


app.use("/assets", express.static("/data/assets", {
    maxAge: "1h",
    etag: false,
}));


function loadData() {
    const raw = fs.readFileSync("/data/services.json", "utf-8");
    return JSON.parse(raw);
}

function loadConfig() {
    const raw = fs.readFileSync("/data/config.json", "utf-8");
    return JSON.parse(raw);
}

function renderService(service) {
    return `
    <div class="service">
      <a href="${service.url}" target="_blank">
        <img src="/assets/cards/services/${service.logo}" alt="${service.title}" />
        <div class="service-title">${service.title}</div>
      </a>
    </div>`;
}

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
function setTemplate( template, backlink, version, title, cards )  {
    return  template
        .replace(/{{BACKLINK}}/g, backlink)
        .replace(/{{VERSION}}/g, version)
        .replace(/{{TITLE}}/g, title)
        .replace(/{{SECTION_NAME}}/g, title)
        .replace(/{{SECTIONS_SERVICES}}/g, cards);
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
    const template = fs.readFileSync("/app/templates/index.html", "utf-8");

    const html = setTemplate( template, '', config.version, config.title, sections );
    // const html = template
    //     .replace(/{{BACKLINK}}/g, '')
    //     .replace(/{{VERSION}}/g, config.version)
    //     .replace(/{{TITLE}}/g, config.title)
    //     .replace(/{{SECTION_NAME}}/g, config.title)
    //     .replace(/{{SECTIONS_SERVICES}}/g, sections);
    res.send(html);
});

app.get("/section/:id", (req, res) => {
    const data = loadData();
    const config = loadConfig()
    const section = data.sections.find(s => s.id === req.params.id);
    const template = fs.readFileSync("/app/templates/index.html", "utf-8");

    if (!section) {
        return res.status(404).send("Sektion nicht gefunden");
    }

    const services = (section.services || []).map(renderService).join("\n");

    const html = setTemplate(
        template,
        '<a href="/" style="margin: 1rem; display: inline-block;">← Zurück</a>',
        config.version,
        config.title + ' - ' + section.title,
        services
    );

    // const html = template
    //     .replace(/{{BACKLINK}}/g, '<a href="/" style="margin: 1rem; display: inline-block;">← Zurück</a>')
    //     .replace(/{{VERSION}}/g, config.version)
    //     .replace(/{{TITLE}}/g, config.title + ' - ' + section.title)
    //     .replace(/{{SECTION_NAME}}/g, config.title + ' - ' + section.title)
    //     .replace(/{{SECTIONS_SERVICES}}/g, services);

    res.send(html);
});

app.listen(PORT, () => {
    console.log(`Landingpage läuft auf Port ${PORT}`);
});
