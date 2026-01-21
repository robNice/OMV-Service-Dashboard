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
    // 1. explizit (user-config)
    if (explicit) {
        const explicitPath = path.join(USER_ASSETS, baseDir, explicit);
        if (fileExists(explicitPath)) {
            return {
                src: `/assets/${baseDir}/${explicit}`,
                source: 'explicit',
                resolvedFile: explicit
            };
        }
    }

    // 2. ID-Fallback (app-data, multi-extension)
    if (idFallback) {
        for (const ext of IMAGE_EXTS) {
            const file = `${idFallback}.${ext}`;

           const userPath = path.join(USER_ASSETS, baseDir, file);
           if (fileExists(userPath)) {
                   return {
                           src: `/assets/${baseDir}/${file}`,
                           source: 'id',
                           resolvedFile: file
                   };
               }


            const idPath = path.join(APP_ASSETS, baseDir, file);

            if (fileExists(idPath)) {
                return {
                    src: `/assets/${baseDir}/${file}`,
                    source: 'id',
                    resolvedFile: file
                };
            }
        }
    }


    // 3. Default (app-data)
    return {
        src: `/assets/${baseDir}/${defaultFile}`,
        source: 'default',
        resolvedFile: defaultFile
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
