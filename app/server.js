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
const {
    getServiceCardImages,
    resolveSectionCardImage,
    resolveSectionBackgroundImage,
    resolveServiceCardImage,
    resolveAppSectionCardImage,
    resolveAppSectionBackgroundImage,
    resolveAppServiceCardImage
} = require('./lib/image-resolver');
const {createAdminPagesRouter} = require("./routes/admin-pages");
const {createAdminApiRouter} = require("./routes/admin-api");
// const TMP_SECTION_BG_DIR = TMP_DIR+"/data/tmp/assets/backgrounds/";

const fs = require("fs");
const path = require("path");
const pkg = require('./package.json');
const APP_VERSION = pkg.version;
const PROJECT_NAME = 'NAS Portal';
const PROJECT_URL = 'https://github.com/robNice/OMV-Service-Dashboard';
const {APP_DATA, APP_DEFAULT_DATA, CONFIG_DIR, CONFIG_DIR_SOURCE} = require('./lib/paths');
const TMP_DIR = path.join(APP_DATA, "tmp/assets");

function initDefaultData() {
    const source = APP_DEFAULT_DATA;
    const target = APP_DATA;
    const targetThemes = path.join(target, 'assets', 'themes');
    fs.mkdirSync(target, {recursive: true});

    // Built-in themes are fully managed by the app image. Remove stale
    // directories first so renamed/removed defaults do not linger in /data.
    fs.rmSync(targetThemes, {recursive: true, force: true});
    fs.cpSync(source, target, {recursive: true});
}

initDefaultData();
// initDataDir();
const {resolveAssetPath} = require('./lib/asset-resolver');
const app = express();

const {getStats} = require("./server/stats");

const {normalizeRamModules} = require('./lib/ramsize-util');
const {initI18n} = require('./lib/i18n-config');
initI18n({app});
const {loadServices, saveServices} = require("./lib/services-store");
const {getTheme, listThemes, normalizeTheme, sanitizeThemeSettings} = require('./lib/theme-registry');
const {loadConfiguration, saveConfiguration} = require('./lib/load-config');
const {getFreshStatsCache, writeStatsCache} = require('./lib/stats-cache');
const {
    renderService,
    renderSection,
    renderSectionNavItem,
    setTemplate,
    renderAdminTemplate,
    renderThemeAdminTemplate,
    listAvailableAdminLocales,
    loadTemplate
} = require('./lib/template-renderer');
const {
    ensureTmpDirs,
    isImage,
    cleanupDeletedEntityImages,
    commitImage
} = require('./lib/upload-utils');
const { _internals: { normalizeTag } } = require('./lib/i18n-config');
const config = loadConfiguration();
(async () => {
    await initAdminPassword(config);
})();
const PORT =
    Number(process.env.PORT) ||
    Number(config.port) ||
    3000;


const mime = require('mime-types');

if (CONFIG_DIR_SOURCE === 'default') {
    console.log(`[startup] No config directory provided; using default: ${CONFIG_DIR}`);
} else if (CONFIG_DIR_SOURCE === 'cli') {
    console.log(`[startup] Using config directory from --config-dir: ${CONFIG_DIR}`);
} else {
    console.log(`[startup] Using config directory from OMV_SERVICE_DASHBOARD_CONFIG: ${CONFIG_DIR}`);
}
console.log(`[startup] App data directory: ${APP_DATA}`);

function sendAsset(res, file) {
    res.type(mime.lookup(file) || 'application/octet-stream');
    fs.createReadStream(file).pipe(res);
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

function withVersion(image) {
    const absPath = image?.resolvedPath;
    if (!image || !absPath || !fs.existsSync(absPath)) return image;

    const stat = fs.statSync(absPath);
    return {
        ...image,
        v: stat.mtimeMs
    };
}

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
        if (req.get("X-Admin-Request") === "1") {
            res.set("X-Admin-Redirect", "/admin/login");
            return res.status(401).json({error: "admin_auth_required", redirect: "/admin/login"});
        }
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

function isMutableImageAsset(relPath) {
    return relPath.startsWith('backgrounds/')
        || relPath.startsWith('cards/sections/')
        || relPath.startsWith('cards/services/');
}

/**
 *
 * @param service
 * @returns {string}
 */
app.get("/favicon.ico", (req, res) => {
    res.type("image/x-icon");
    res.set("Cache-Control", "public, max-age=31536000, immutable");
    res.sendFile("favicon.ico", {root: path.join(APP_DATA, "assets")}, (err) => {
        if (err) {
            res.status(404).end();
        }
    });
});

app.head("/favicon.ico", (req, res) => res.status(200).end());

app.get("/api/stats", async (req, res) => {
    try {

        const data = await getStats();
        writeStatsCache(data);
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

    if (relPath.startsWith('admin/')) {
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

    if (isMutableImageAsset(relPath)) {
        res.setHeader('Cache-Control', 'no-cache, must-revalidate');
    } else if (file === CONFIG_DIR || file.startsWith(CONFIG_DIR + path.sep)) {
        res.setHeader('Cache-Control', 'no-cache');
    } else {
        res.setHeader('Cache-Control', 'public, max-age=3600');
    }
    sendAsset(res, file);
});


app.use("/admin", createAdminPagesRouter({
    sessions,
    requireAdmin,
    verifyPassword,
    hashPassword,
    loadConfiguration,
    saveConfiguration,
    renderAdminTemplate,
    renderThemeAdminTemplate,
    normalizeTheme,
    loadTemplate,
    projectName: PROJECT_NAME,
    projectUrl: PROJECT_URL,
    appVersion: APP_VERSION,
    crypto
}));

app.use("/admin/api", createAdminApiRouter({
    requireAdmin,
    loadConfiguration,
    saveConfiguration,
    listAvailableAdminLocales,
    normalizeTag,
    normalizeTheme,
    sanitizeThemeSettings,
    getTheme,
    listThemes,
    getServiceCardImages,
    loadServices,
    saveServices,
    resolveSectionCardImage,
    resolveSectionBackgroundImage,
    resolveServiceCardImage,
    resolveAppSectionCardImage,
    resolveAppSectionBackgroundImage,
    resolveAppServiceCardImage,
    withVersion,
    ensureTmpDirs,
    isImage,
    cleanupDeletedEntityImages,
    commitImage,
    uploadMap: UPLOAD_MAP,
    tmpDir: TMP_DIR,
    configDir: CONFIG_DIR,
    slugify,
    crypto,
    port: PORT
}));


app.get("/", (req, res) => {
    const data = loadServices();
    const config = loadConfiguration();
    const initialStats = getFreshStatsCache(config.infoDrawerRefreshInterval);
    const homeBackground = withVersion(resolveSectionBackgroundImage({id: '_home'}));

    const sections = data.sections.map(section => ({
        ...section,
        cardImage: withVersion(resolveSectionCardImage(section)),
        backgroundImage: withVersion(resolveSectionBackgroundImage(section))
    })).map(renderSection).join("\n");

    const html = setTemplate(req, loadTemplate(), {
        backlink: '',
        version: APP_VERSION,
        title: config.title,
        cards: sections,
        sectionNav: '',
        theme: config.theme,
        config,
        initialStats,
        backgroundUrl: homeBackground?.src ? `${homeBackground.src}?v=${homeBackground.v || 0}` : ''
    });

    res.send(html);
});


app.get("/section/:id", (req, res) => {
    const data = loadServices();
    const config = loadConfiguration()
    const initialStats = getFreshStatsCache(config.infoDrawerRefreshInterval);
    const sections = data.sections.map(item => ({
        ...item,
        cardImage: withVersion(resolveSectionCardImage(item)),
        backgroundImage: withVersion(resolveSectionBackgroundImage(item))
    }));
    const section = sections.find(s => s.id === req.params.id);
    if (!section) {
        return res.status(404).send("Sektion nicht gefunden");
    }
    const services = Object.entries(section.services || {})
        .map(([id, service]) =>
            renderService({
                ...service,
                id,
                cardImage: withVersion(resolveServiceCardImage({...service, id}))
            })
        )
        .join("\n");
    const sectionNav = `
        <div class="section-nav" aria-label="Sektionen">
            ${sections.map(item => renderSectionNavItem(item, item.id === section.id)).join("\n")}
        </div>
    `;

    const html = setTemplate(req, loadTemplate(), {
        backlink: '<a class="back-link" href="/">' + __('label.back') + '</a>',
        version: APP_VERSION,
        title: config.title + ' - ' + section.title,
        cards: services,
        sectionNav,
        theme: config.theme,
        config,
        initialStats,
        backgroundUrl: section.backgroundImage?.src ? `${section.backgroundImage.src}?v=${section.backgroundImage.v || 0}` : ''
    });
    res.send(html);
});

app.listen(PORT, () => {
    console.log('Service Dashboard listening on port ' + PORT);
});
