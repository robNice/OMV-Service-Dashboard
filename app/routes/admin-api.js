const express = require("express");
const fs = require("fs");
const path = require("path");

function createAdminApiRouter({
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
    uploadMap,
    tmpDir,
    configDir,
    slugify,
    crypto,
    port
}) {
    const router = express.Router();

    router.get("/service-card-images", requireAdmin, (req, res) => {
        res.json({
            images: getServiceCardImages()
        });
    });

    router.get("/themes", requireAdmin, (req, res) => {
        const config = loadConfiguration();
        res.set("Cache-Control", "no-store");
        res.json({
            currentTheme: normalizeTheme(config.theme),
            themeSettings: config.themeSettings || {},
            themes: listThemes()
        });
    });

    router.post("/theme", requireAdmin, express.json(), (req, res) => {
        const theme = normalizeTheme(req.body?.theme);
        const config = loadConfiguration();
        const themeDefinition = getTheme(theme);

        config.theme = theme;
        config.themeSettings = {
            ...(config.themeSettings || {}),
            [theme]: sanitizeThemeSettings(themeDefinition, req.body?.settings)
        };
        saveConfiguration(config);
        res.json({
            ok: true,
            theme,
            settings: config.themeSettings[theme]
        });
    });

    router.get("/config", requireAdmin, (req, res) => {
        const config = loadConfiguration();
        const availableLanguages = listAvailableAdminLocales();
        res.json({
            title: String(config.title || ""),
            defaultLang: String(config.defaultLang || ""),
            availableLanguages,
            infoDrawerRefreshInterval: Number(config.infoDrawerRefreshInterval) || 0,
            port: Number(config.port) || port
        });
    });

    router.post("/config", requireAdmin, express.json(), (req, res) => {
        const payload = req.body || {};
        const nextTitle = String(payload.title || "").trim();
        const nextDefaultLang = normalizeTag(String(payload.defaultLang || "").trim());
        const nextRefreshInterval = Number.parseInt(payload.infoDrawerRefreshInterval, 10);
        const nextPort = Number.parseInt(payload.port, 10);
        const availableLanguages = new Set(listAvailableAdminLocales());

        if (!nextTitle) {
            return res.status(400).json({error: "invalid_title"});
        }

        if (!nextDefaultLang || !availableLanguages.has(nextDefaultLang)) {
            return res.status(400).json({error: "invalid_default_lang"});
        }

        if (!Number.isFinite(nextRefreshInterval) || nextRefreshInterval <= 0) {
            return res.status(400).json({error: "invalid_info_drawer_refresh_interval"});
        }

        if (!Number.isFinite(nextPort) || nextPort < 1 || nextPort > 65535) {
            return res.status(400).json({error: "invalid_port"});
        }

        const config = loadConfiguration();
        const previousPort = Number(config.port) || port;

        config.title = nextTitle;
        config.defaultLang = nextDefaultLang;
        config.infoDrawerRefreshInterval = nextRefreshInterval;
        config.port = nextPort;
        saveConfiguration(config);

        res.json({
            ok: true,
            portChanged: previousPort !== nextPort,
            config: {
                title: config.title,
                defaultLang: config.defaultLang,
                infoDrawerRefreshInterval: config.infoDrawerRefreshInterval,
                port: config.port
            }
        });
    });

    router.get("/services", requireAdmin, (req, res) => {
        const data = loadServices();
        let needsMigration = false;
        const enriched = {
            sections: data.sections.map(section => {
                const card = resolveSectionCardImage(section);
                const cardAbsPath = path.join(configDir, 'assets/cards/sections', card.resolvedFile);
                const appDefault = resolveAppSectionCardImage(section);

                const bg = resolveSectionBackgroundImage(section);
                const bgAbsPath = path.join(configDir, 'assets/backgrounds', bg.resolvedFile);
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
                            const svcCard = resolveServiceCardImage({...service, id});
                            const svcAbsPath = svcCard.resolvedFile
                                ? path.join(configDir, 'assets/cards/services', svcCard.resolvedFile)
                                : null;
                            const svcAppDefault = resolveAppServiceCardImage({id});
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

        res.json({
            sections: enriched.sections,
            needsMigration
        });
    });

    router.post("/services", requireAdmin, express.json(), (req, res) => {
        const data = req.body;

        if (!data || !Array.isArray(data.sections)) {
            return res.status(400).json({error: "invalid_format"});
        }

        for (const section of data.sections) {
            commitImage({
                image: section.cardImage,
                uploadDir: path.join(tmpDir, "cards/sections"),
                targetDir: path.join(configDir, "assets/cards/sections"),
                targetBaseName: section.id
            });

            commitImage({
                image: section.backgroundImage,
                uploadDir: path.join(tmpDir, "backgrounds"),
                targetDir: path.join(configDir, "assets/backgrounds"),
                targetBaseName: section.id
            });
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
                        url: String(svc.url || "").trim(),
                        cardImage: svc.cardImage || null
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

        const oldData = loadServices();
        cleanupDeletedEntityImages({
            oldSections: oldData.sections,
            newSections: normalized.sections,
            getIds: sec => Object.keys(sec.services || {}),
            imageDir: path.join(configDir, "assets/cards/services")
        });

        cleanupDeletedEntityImages({
            oldSections: oldData.sections,
            newSections: normalized.sections,
            getIds: sec => [sec.id],
            imageDir: path.join(configDir, "assets/cards/sections")
        });

        cleanupDeletedEntityImages({
            oldSections: oldData.sections,
            newSections: normalized.sections,
            getIds: sec => [sec.id],
            imageDir: path.join(configDir, "assets/backgrounds")
        });

        for (const section of normalized.sections) {
            for (const serviceId of section.serviceOrder || []) {
                const svc = section.services[serviceId];

                commitImage({
                    image: svc.cardImage,
                    uploadDir: path.join(tmpDir, "cards/services"),
                    targetDir: path.join(configDir, "assets/cards/services"),
                    targetBaseName: serviceId
                });
            }
        }

        for (const section of normalized.sections) {
            for (const svc of Object.values(section.services)) {
                delete svc.cardImage;
            }
        }
        saveServices(normalized);

        res.json({ok: true});
    });

    router.post("/upload/:kind", requireAdmin, (req, res) => {
        const kind = req.params.kind;
        const cfg = uploadMap[kind];

        if (!cfg) {
            return res.status(400).json({error: "invalid_upload_type"});
        }

        ensureTmpDirs(tmpDir, uploadMap);

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
                tmpDir,
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
    });

    router.get("/tmp/:kind/:file", requireAdmin, (req, res) => {
        const {kind, file} = req.params;
        const cfg = uploadMap[kind];

        if (!cfg) {
            return res.status(400).end();
        }

        const filePath = path.join(tmpDir, cfg.tmpSubDir, file);

        if (!fs.existsSync(filePath)) {
            return res.status(404).end();
        }

        res.setHeader("Cache-Control", "no-store");
        res.sendFile(filePath);
    });

    return router;
}

module.exports = {
    createAdminApiRouter
};
