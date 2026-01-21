const fs = require('fs');
const path = require('path');
const { USER_ASSETS, APP_ASSETS } = require('./paths');
const IMAGE_EXTS = ['png', 'jpg', 'jpeg', 'webp', 'gif'];
function fileExists(p) {
    try {
        return fs.existsSync(p);
    } catch {
        return false;
    }
}

function resolveImage({ explicit, idFallback, defaultFile, baseDir }) {
    if (explicit) {
        const explicitPath = path.join(USER_ASSETS, baseDir, explicit);
        if (fileExists(explicitPath)) {
            return {
                src: `/assets/${baseDir}/${explicit}`,
                source: 'explicit',
                resolvedFile: explicit,
                isCustom: true
            };
        }
    }

    if (idFallback) {
        for (const ext of IMAGE_EXTS) {
            const file = `${idFallback}.${ext}`;
            const userPath = path.join(USER_ASSETS, baseDir, file);

            if (fileExists(userPath)) {
                return {
                    src: `/assets/${baseDir}/${file}`,
                    source: 'id',
                    resolvedFile: file,
                    isCustom: true
                };
            }
        }

        for (const ext of IMAGE_EXTS) {
            const file = `${idFallback}.${ext}`;
            const appPath = path.join(APP_ASSETS, baseDir, file);

            if (fileExists(appPath)) {
                return {
                    src: `/assets/${baseDir}/${file}`,
                    source: 'id',
                    resolvedFile: file,
                    isCustom: false
                };
            }
        }
    }


    return {
        src: `/assets/${baseDir}/${defaultFile}`,
        source: 'default',
        resolvedFile: defaultFile,
        isCustom: false
    };
}

function resolveSectionCardImage(section) {
    return resolveImage({
        explicit: section.cardImage || null,
        idFallback: section.id,
        defaultFile: '_default.png',
        baseDir: 'cards/sections'
    });
}

function resolveSectionBackgroundImage(section) {
    return resolveImage({
        explicit: section.backgroundImage || null,
        idFallback: section.id,
        defaultFile: '_default.png',
        baseDir: 'backgrounds'
    });
}

function resolveServiceCardImage(service) {
    return resolveImage({
        explicit: service.logo || null,
        idFallback: service.id,
        defaultFile: '_default.png',
        baseDir: 'cards/services'
    });
}

module.exports = {
    resolveSectionCardImage,
    resolveSectionBackgroundImage,
    resolveServiceCardImage
};
