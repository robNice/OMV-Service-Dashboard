const express = require("express");
const fs = require("fs");
const path = require("path");

const app = express();
const { getStats } = require("./server/stats"); // <— neu

const PORT = 3000;



app.use("/assets", express.static("/data/assets", {
    maxAge: "1h",
    etag: false,
}));


function loadData() {
  const raw = fs.readFileSync("/data/services.json", "utf-8");
  return JSON.parse(raw);
}

function renderService(service) {
  return `
    <div class="service">
      <a href="${service.url}" target="_blank">
        <img src="/${service.logo}" alt="${service.title}" />
        <div class="service-title">${service.title}</div>
      </a>
    </div>`;
}

// Hilfsfunktion: eine Sektion als Kachel auf der Startseite
function renderSection(section) {
  return `
    <div class="service">
      <a href="/section/${encodeURIComponent(section.id)}">
        <img src="/${section.thumbnail}" alt="${section.title}" />
        <div class="service-title">${section.title}</div>
      </a>
    </div>`;
}

app.get("/favicon.ico", (req, res) => {
    res.type("image/x-icon");
    res.set("Cache-Control", "public, max-age=31536000, immutable");
    res.sendFile("favicon.ico", { root: "/data/assets" }, (err) => {
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
        res.status(500).json({ error: "stats_failed" });
    }
});


app.get("/", (req, res) => {
  const data = loadData();
  const sections = data.sections.map(renderSection).join("\n");
  const template = fs.readFileSync("/app/templates/index.html", "utf-8");

    const html = template
        .replace(/{{BACKLINK}}/g, '')
        .replace(/{{SECTION_NAME}}/g, 'Dein Cube')
        .replace(/{{SECTIONS_SERVICES}}/g, sections);
    res.send(html);
  //res.send(template.replace("{{SECTIONS}}", sections));
});

app.get("/section/:id", (req, res) => {
  const data = loadData();
  const section = data.sections.find(s => s.id === req.params.id);

  if (!section) {
    return res.status(404).send("Sektion nicht gefunden");
  }

  const services = (section.services || []).map(renderService).join("\n");
  const template = fs.readFileSync("/app/templates/index.html", "utf-8");
  const html = template
    .replace(/{{BACKLINK}}/g, '<a href="/" style="margin: 1rem; display: inline-block;">← Zurück</a>')
    .replace(/{{SECTION_NAME}}/g, section.title)
    .replace(/{{SECTIONS_SERVICES}}/g, services);

  res.send(html);
});

app.listen(PORT, () => {
  console.log(`Landingpage läuft auf Port ${PORT}`);
});
