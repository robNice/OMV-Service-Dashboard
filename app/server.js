//const version = "1.2.1-0" // my lazy ass anti cache: +'-'+Math.random().toString();
const UPLOAD_MAP = {
    "section-card": {
        tmpSubDir: "cards/sections",
        prefix: "sec-card-"
    },
    "section-background": {
        tmpSubDir: "backgrounds",
        prefix: "sec-bg-"
    },
    "service-card": {
        tmpSubDir: "cards/services",
        prefix: "svc-card-"
    }
};
const express = require("express");
const crypto = require("crypto");
const SESSION_SECRET = crypto.randomBytes(32).toString("hex");
const sessions = new Map();
const {getServiceCardImages} = require("./lib/service-card-images");
const {
    resolveSectionCardImage,
    resolveSectionBackgroundImage,
    resolveServiceCardImage,
    resolveAppSectionCardImage,
    resolveAppSectionBackgroundImage,
    resolveAppServiceCardImage
} = require('./lib/image-resolver');
const TMP_DIR = "/data/tmp/assets/";
// const TMP_SECTION_BG_DIR = TMP_DIR+"/data/tmp/assets/backgrounds/";

const fs = require("fs");
const path = require("path");
const pkg = require('./package.json');
const APP_VERSION = pkg.version;

function initDefaultData() {
    const source = '/app/default-data';
    const target = '/data';
    fs.mkdirSync(target, {recursive: true});
    fs.cpSync(source, target, {recursive: true});
}

initDefaultData();
// initDataDir();
const {CONFIG_DIR} = require('./lib/paths');
const {resolveAssetPath} = require('./lib/asset-resolver');
const app = express();

const {getStats} = require("./server/stats");

const {normalizeRamModules} = require('./lib/ramsize-util');
const {initI18n} = require('./lib/i18n-config');
initI18n({app});
const {translateTextI18n} = require('./lib/i18n-util');
const {loadServices} = require("./lib/load-services");
const {loadConfiguration, saveConfiguration} = require('./lib/load-config');
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
function withVersion(image, absPath) {
    if (!image || !absPath || !fs.existsSync(absPath)) return image;

    const stat = fs.statSync(absPath);
    return {
        ...image,
        v: stat.mtimeMs
    };
}

app.use(sessionMiddleware);

function ensureTmpDirs() {
    for (const cfg of Object.values(UPLOAD_MAP)) {
        fs.mkdirSync(path.join(TMP_DIR, cfg.tmpSubDir), {recursive: true});
    }
}

function isImage(filename) {
    return /\.(png|jpe?g|gif|webp)$/i.test(filename);
}


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

function slugify(str) {
    return String(str || "")
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "");
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
    const card = resolveServiceCardImage(service);
    return `
    <div class="service">
      <a href="${service.url}" target="_blank">
      <img src="${card.src}" alt="${service.title}" />
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
        <img src="${section.cardImage.src}" alt="${section.title}" />
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
function setTemplate(req, template, backlink, version, title, cards) {
    return translateTextI18n(
        template
            .replace(/{{BACKLINK}}/g, backlink)
            .replace(/{{VERSION}}/g, version)
            .replace(/{{TITLE}}/g, title)
            .replace(/{{SECTION_NAME}}/g, title)
            .replace(/{{SECTIONS_SERVICES}}/g, cards),
        {locale: req.getLocale()}
    );
}

/**
 *
 * @returns {string}
 */
function loadTemplate() {
    return fs.readFileSync("/app/templates/index.html", "utf-8");
}


function renderImageSourceBadge(image) {
    const map = {
        explicit: {label: 'explizit', class: 'badge-explicit'},
        id: {label: 'id-fallback', class: 'badge-id'},
        default: {label: 'default', class: 'badge-default'}
    };

    const cfg = map[image.source];
    if (!cfg) return '';

    return `<span class="image-badge ${cfg.class}">${cfg.label}</span>`;
}


function findTmpUpload(dir, uploadId) {
    if (!fs.existsSync(dir)) return null;

    const files = fs.readdirSync(dir);
    return files.find(f => f.startsWith(uploadId)) || null;
}

function deleteUserSectionCard(sectionId) {
    const dir = path.join(CONFIG_DIR, "assets/cards/sections");
    if (!fs.existsSync(dir)) return;

    const files = fs.readdirSync(dir);
    for (const f of files) {
        if (f.startsWith(sectionId + ".")) {
            fs.unlinkSync(path.join(dir, f));
        }
    }
}

function deleteUserImage(dir, baseName) {
    if (!fs.existsSync(dir)) return;

    const files = fs.readdirSync(dir);
    for (const f of files) {
        if (f.startsWith(baseName + ".")) {
            fs.unlinkSync(path.join(dir, f));
        }
    }
}

function commitImage({
                         image,
                         uploadDir,
                         targetDir,
                         targetBaseName
                     }) {
    if (!image || image.source === 'default') {
        deleteUserImage(targetDir, targetBaseName);
        return;
    }

    if (!image.uploadId) {
        return;
    }

    const tmpFile = findTmpUpload(uploadDir, image.uploadId);
    if (!tmpFile) return;

    fs.mkdirSync(targetDir, { recursive: true });

    deleteUserImage(targetDir, targetBaseName);

    const ext = path.extname(tmpFile);
    const target = path.join(targetDir, targetBaseName + ext);
    const src = path.join(uploadDir, tmpFile);

    fs.copyFileSync(src, target);
    fs.unlinkSync(src);
    return target;
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
            data.system.ram = normalizeRamModules(data.system.ram, {locale});
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
app.post(
    "/admin/login",
    express.urlencoded({extended: false}),
    (req, res) => {

        const {password} = req.body;
        const config = loadConfiguration();

        if (!verifyPassword(password, config.admin.passwordHash)) {
            const tpl = fs.readFileSync(
                "/app/templates/admin-login.html",
                "utf8"
            );

            const html = translateTextI18n(
                tpl.replace(
                    "{{MESSAGE}}",
                    '<div class="error">{{__.admin.login.invalid}}</div>'
                ),
                {locale: req.getLocale()}
            );

            return res.status(401).send(html);
        }

        const sid = crypto.randomBytes(16).toString("hex");
        sessions.set(sid, {isAdmin: true});

        res.setHeader(
            "Set-Cookie",
            `omv_session=${sid}; HttpOnly; SameSite=Lax`
        );

        res.redirect("/admin");
    }
);


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
    const tpl = fs.readFileSync(
        "/app/templates/admin-index.html",
        "utf8"
    );

    const html = translateTextI18n(tpl, {
        locale: req.getLocale()
    });

    res.send(html);
});


app.get("/admin/setpassword", requireAdmin, (req, res) => {
    const tpl = fs.readFileSync(
        "/app/templates/admin-setpassword.html",
        "utf8"
    );

    const html = translateTextI18n(tpl, {
        locale: req.getLocale()
    });

    res.send(html);
});


app.post("/admin/setpassword", requireAdmin, express.urlencoded({extended: false}), (req, res) => {
    const {password, passwordRepeat} = req.body;

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

app.get("/admin/api/service-card-images", requireAdmin, (req, res) => {
    res.json({
        images: getServiceCardImages()
    });
});

app.get("/admin/api/services", requireAdmin, (req, res) => {
    const data = loadServices();
    let needsMigration = false;
    const enriched = {
        sections: data.sections.map(section => {

            const card = resolveSectionCardImage(section);
            const cardAbsPath = path.join(CONFIG_DIR, 'assets/cards/sections', card.resolvedFile);
            const appDefault = resolveAppSectionCardImage(section);

            const bg = resolveSectionBackgroundImage(section);
            const bgAbsPath = path.join(CONFIG_DIR, 'assets/backgrounds', bg.resolvedFile);
            const bgAppDefault = resolveAppSectionBackgroundImage(section);

            return {
                ...section,
                cardImage: withVersion(card, cardAbsPath),
                cardImageDefault: appDefault.src,
                backgroundImage: withVersion(bg, bgAbsPath),
                backgroundImageDefault: bgAppDefault.src,


                services: Object.fromEntries(
                    Object.entries(section.services || {}).map(([id, service]) => {
                        if (service.logo) {
                            needsMigration = true;
                        }
                        const svcCard = resolveServiceCardImage({ ...service, id });
                        const svcAbsPath = path.join(CONFIG_DIR, 'assets/cards/services', svcCard.resolvedFile);
                        const svcAppDefault = resolveAppServiceCardImage({ id });
                        return [
                            id,
                            {
                                ...service,
                                id,
                                cardImage: withVersion(svcCard, svcAbsPath),
                                serviceCardImageDefault: svcAppDefault.src
                            }
                        ];
                    })
                )
            };
        })
    };

    // res.json(enriched);
    res.json({
        sections: enrichedSections,
        needsMigration
    });
});


app.post(
    "/admin/api/services",
    requireAdmin,
    express.json(),
    (req, res) => {
        const data = req.body;

        if (!data || !Array.isArray(data.sections)) {
            return res.status(400).json({error: "invalid_format"});
        }

        for (const section of data.sections) {

            commitImage({
                image: section.cardImage,
                uploadDir: path.join(TMP_DIR, "cards/sections"),
                targetDir: path.join(CONFIG_DIR, "assets/cards/sections"),
                targetBaseName: section.id
            });

            commitImage({
                image: section.backgroundImage,
                uploadDir: path.join(TMP_DIR, "backgrounds"),
                targetDir: path.join(CONFIG_DIR, "assets/backgrounds"),
                targetBaseName: section.id
            });

            for (const [serviceId, service] of Object.entries(section.services || {})) {
                commitImage({
                    image: service.cardImage,
                    uploadDir: path.join(TMP_DIR, "cards/services"),
                    targetDir: path.join(CONFIG_DIR, "assets/cards/services"),
                    targetBaseName: serviceId
                });
            }

        }

        const normalized = {
            sections: data.sections.map(sec => {

                const services = {};
                const serviceOrder = [];

                for (const serviceId of sec.serviceOrder || []) {
                    const svc = sec.services?.[serviceId];
                    if (!svc) continue;

                    let finalId = serviceId;

                    if (svc.logo && !serviceId.startsWith("tmp-")) {
                        finalId = slugify(
                            path.basename(svc.logo, path.extname(svc.logo))
                        );
                    }

                    if (serviceId.startsWith("tmp-")) {
                        finalId = slugify(svc.title);

                        let i = 1;
                        const base = finalId;
                        while (services[finalId]) {
                            finalId = `${base}-${i++}`;
                        }
                    }

                    services[finalId] = {
                        title: String(svc.title || "").trim(),
                        url: String(svc.url || "").trim()
                    };

                    serviceOrder.push(finalId);
                }

                return {
                    id: String(sec.id || "").trim(),
                    title: String(sec.title || "").trim(),
                    services,
                    serviceOrder
                };
            })
        };


        saveServices(normalized);
        res.json({ok: true});
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

    if (file.startsWith(CONFIG_DIR + path.sep)) {
        res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
        res.setHeader('Pragma', 'no-cache');
        res.setHeader('Expires', '0');
        return sendAsset(res, file);
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


app.post(
    "/admin/api/upload/:kind",
    requireAdmin,
    (req, res) => {

        const kind = req.params.kind;
        const cfg = UPLOAD_MAP[kind];

        if (!cfg) {
            return res.status(400).json({error: "invalid_upload_type"});
        }

        ensureTmpDirs();

        if (!req.headers["content-type"]?.startsWith("multipart/form-data")) {
            return res.status(400).json({error: "invalid_content_type"});
        }

        let buffer = Buffer.alloc(0);

        req.on("data", chunk => {
            buffer = Buffer.concat([buffer, chunk]);
        });

        req.on("end", () => {
            const match = buffer.toString("binary").match(/filename="([^"]+)"/);
            if (!match) {
                return res.status(400).json({error: "no_file"});
            }

            const filename = match[1];
            if (!isImage(filename)) {
                return res.status(400).json({error: "invalid_filetype"});
            }

            const ext = path.extname(filename);
            const uploadId = cfg.prefix + crypto.randomBytes(6).toString("hex");

            const target = path.join(
                TMP_DIR,
                cfg.tmpSubDir,
                uploadId + ext
            );

            const fileStart = buffer.indexOf("\r\n\r\n") + 4;
            const fileEnd = buffer.lastIndexOf("\r\n------");

            fs.writeFileSync(target, buffer.slice(fileStart, fileEnd));

            res.json({
                uploadId,
                filename,
                previewUrl: `/admin/api/tmp/${kind}/${uploadId}${ext}`
            });
        });
    }
);


app.get(
    "/admin/api/tmp/:kind/:file",
    requireAdmin,
    (req, res) => {

        const {kind, file} = req.params;
        const cfg = UPLOAD_MAP[kind];

        if (!cfg) {
            return res.status(400).end();
        }

        const p = path.join(TMP_DIR, cfg.tmpSubDir, file);

        if (!fs.existsSync(p)) {
            return res.status(404).end();
        }

        res.setHeader("Cache-Control", "no-store");
        sendAsset(res, p);
    }
);


app.get("/", (req, res) => {
    const data = loadData();
    const config = loadConfiguration();

    const sections = data.sections.map(section => ({
        ...section,
        cardImage: resolveSectionCardImage(section),
        backgroundImage: resolveSectionBackgroundImage(section)
    })).map(renderSection).join("\n");

    const html = setTemplate(
        req,
        loadTemplate(),
        '',
        APP_VERSION,
        config.title,
        sections
    );

    res.send(html);
});


app.get("/section/:id", (req, res) => {
    const data = loadData();
    const config = loadConfiguration()
    const section = data.sections.find(s => s.id === req.params.id);
    if (!section) {
        return res.status(404).send("Sektion nicht gefunden");
    }
    const services = Object.entries(section.services || {})
        .map(([id, service]) =>
            renderService({ ...service, id })
        )
        .join("\n");

    const html = setTemplate(
        req,
        loadTemplate(),
        '<a href="/" style="margin: 1rem; display: inline-block;">← ' + __('label.back') + '</a>',
        APP_VERSION,
        config.title + ' - ' + section.title,
        services
    );
    res.send(html);
});

app.listen(PORT, () => {
    console.log('Service Dashboard listening on port ' + PORT);
});
