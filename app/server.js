//const version = "1.2.1-0" // my lazy ass anti cache: +'-'+Math.random().toString();
const express = require("express");
const crypto = require("crypto");
const SESSION_SECRET = crypto.randomBytes(32).toString("hex");
const sessions = new Map();



const fs = require("fs");
const path = require("path");
const pkg = require('./package.json');
const APP_VERSION = pkg.version;
function initDefaultData() {
    const source = '/app/default-data';
    const target = '/data';
    fs.mkdirSync(target, { recursive: true });
    fs.cpSync(source, target, { recursive: true });
}
initDefaultData();
// initDataDir();
const { CONFIG_DIR } = require('./lib/paths');
const { resolveAssetPath } = require('./lib/asset-resolver');
const app = express();
const CARD_EXTS = ['jpg', 'gif', 'webp', 'png'];
const cardCache = new Map();
const USER_CARDS = path.join(CONFIG_DIR, 'assets/cards/sections');
const APP_CARDS  = path.join(__dirname, '../data/assets/cards/sections');

const {getStats} = require("./server/stats");

const { normalizeRamModules } = require('./lib/ramsize-util');
const { initI18n } = require('./lib/i18n-config');
initI18n({ app });
const { translateTextI18n } = require('./lib/i18n-util');
const {loadServices} = require("./lib/load-services");
const { loadConfiguration, saveConfiguration } = require('./lib/load-config');
const config = loadConfiguration();
(async () => {
    await initAdminPassword(config);
})();
const PORT =
    Number(process.env.PORT) ||
    Number(config.port) ||
    3000;


const mime = require('mime-types');
const {saveServices} = require("./lib/save-services");

function sendAsset(res, file) {
    res.type(mime.lookup(file) || 'application/octet-stream');
    fs.createReadStream(file).pipe(res);
}

/**
 * Load all data from disk and return it as a single object.
 * @returns {any}
 */
function loadData() {
    // const { loadServices } = require('./lib/load-services');
    return loadServices();
}

function sessionMiddleware(req, res, next) {
    const cookie = req.headers.cookie
        ?.split("; ")
        .find(c => c.startsWith("omv_session="));

    if (cookie) {
        const sid = cookie.split("=")[1];
        if (sessions.has(sid)) {
            req.session = sessions.get(sid);
        }
    }

    next();
}
app.use(sessionMiddleware);

app.use(sessionMiddleware);

function hashPassword(password) {
    const salt = crypto.randomBytes(16).toString("hex");
    const hash = crypto.pbkdf2Sync(
        password,
        salt,
        100_000,
        32,
        "sha256"
    ).toString("hex");

    return `${salt}:${hash}`;
}

function verifyPassword(password, stored) {
    const [salt, hash] = stored.split(":");
    const test = crypto.pbkdf2Sync(password, salt, 100_000, 32, "sha256")
        .toString("hex");
    return test === hash;
}

function requireAdmin(req, res, next) {
    if (!req.session?.isAdmin) {
        return res.redirect("/admin/login");
    }
    next();
}

async function initAdminPassword(config) {
    if (config.admin?.passwordHash) {
        return;
    }

    config.admin = {
        passwordHash: hashPassword("dashboard"),
        passwordInitialized: true
    };

    saveConfiguration(config);
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
// function loadConfig() {
//     const { loadServices } = require('./lib/load-config');
//     return loadConfiguration();
// }

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

function renderAdminServices(data) {
    return data.sections.map(section => {
        const services = (section.services || []).map(service => `
            <li>
                <img src="/assets/cards/services/${service.logo || '_default.png'}" alt="">
                <span class="service-title">${service.title}</span>
                <span class="service-url">${service.url}</span>
            </li>
        `).join("");

        return `
            <div class="section">
                <h2>${section.title} <small>(${section.id})</small></h2>
                <ul>
                    ${services || '<li><em>No services</em></li>'}
                </ul>
            </div>
        `;
    }).join("\n");
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

app.get("/admin/login", (req, res) => {
    if (req.session?.isAdmin) {
        return res.redirect("/admin");
    }

    const tpl = fs.readFileSync(
        "/app/templates/admin-login.html",
        "utf8"
    );

    res.send(
        tpl.replace("{{MESSAGE}}", "")
    );
});
app.post("/admin/login", express.urlencoded({ extended: false }), (req, res) => {
    const { password } = req.body;
    const config = loadConfiguration();

    if (!verifyPassword(password, config.admin.passwordHash)) {
        return res.status(401).send("Invalid password");
    }

    const sid = crypto.randomBytes(16).toString("hex");
    sessions.set(sid, { isAdmin: true });


    res.setHeader(
        "Set-Cookie",
        `omv_session=${sid}; HttpOnly; SameSite=Lax`
    );

    res.redirect("/admin");
});


app.get("/admin/logout", (req, res) => {
    const cookie = req.headers.cookie
        ?.split("; ")
        .find(c => c.startsWith("omv_session="));

    if (cookie) {
        const sid = cookie.split("=")[1];
        sessions.delete(sid);
    }

    res.setHeader(
        "Set-Cookie",
        "omv_session=; Max-Age=0"
    );

    res.redirect("/admin/login");
});


app.get("/admin", requireAdmin, (req, res) => {
    res.send(`
        <h1>Admin</h1>
        <ul>
            <li><a href="/admin/services">Services</a></li>
            <li><a href="/admin/setpassword">Change password</a></li>
            <li><a href="/admin/logout">Logout</a></li>
        </ul>
    `);
});

app.post("/admin/setpassword", requireAdmin, express.urlencoded({ extended: false }), (req, res) => {
    const { password, passwordRepeat } = req.body;

    if (password !== passwordRepeat || password.length < 8) {
        return res.send("Invalid password");
    }

    const config = loadConfiguration();
    config.admin.passwordHash = hashPassword(password);
    config.admin.passwordInitialized = false;
    saveConfiguration(config);

    res.redirect("/admin");
});

app.get("/admin/services", requireAdmin, (req, res) => {
    const tpl = fs.readFileSync(
        "/app/templates/admin-services.html",
        "utf8"
    );

    const html = translateTextI18n(tpl, {
        locale: req.getLocale()
    });

    res.send(html);
});


app.get("/admin/api/services", requireAdmin, (req, res) => {
    res.json(loadServices());
});
app.post(
    "/admin/api/services",
    requireAdmin,
    express.json(),
    (req, res) => {
        const data = req.body;

        if (!data || !Array.isArray(data.sections)) {
            return res.status(400).json({ error: "invalid_format" });
        }

        const normalized = {
            sections: data.sections.map(sec => ({
                id: String(sec.id || "").trim(),
                title: String(sec.title || "").trim(),
                services: Array.isArray(sec.services)
                    ? sec.services.map(s => ({
                        title: String(s.title || "").trim(),
                        url: String(s.url || "").trim(),
                        ...(s.logo ? { logo: s.logo } : {})
                    }))
                    : []
            }))
        };

        saveServices(normalized);
        res.json({ ok: true });
    }
);



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
    sendAsset(res, file);
});

app.get("/", (req, res) => {
    const data = loadData();
    const config = loadConfiguration()
    const sections = data.sections.map(renderSection).join("\n");
    const html = setTemplate( req, loadTemplate(), '', APP_VERSION, config.title, sections );

    res.send(html);
});


app.get("/section/:id", (req, res) => {
    const data = loadData();
    const config = loadConfiguration()
    const section = data.sections.find(s => s.id === req.params.id);
    if (!section) {
        return res.status(404).send("Sektion nicht gefunden");
    }
    const services = (section.services || []).map(renderService).join("\n");
    const html = setTemplate(
        req,
        loadTemplate(),
        '<a href="/" style="margin: 1rem; display: inline-block;">← '+__('label.back')+'</a>',
        APP_VERSION,
        config.title + ' - ' + section.title,
        services
    );
    res.send(html);
});

app.listen(PORT, () => {
    console.log('Service Dashboard listening on port '+PORT);
});
