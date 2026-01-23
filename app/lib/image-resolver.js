const fs = require('fs');
const path = require('path');
const {USER_ASSETS, APP_ASSETS} = require('./paths');
const IMAGE_EXTS = ['png', 'jpg', 'jpeg', 'webp', 'gif'];

function fileExists(p) {
    try {
        return fs.existsSync(p);
    } catch {
        return false;
    }
}

function resolveEntityImage({
                                explicit,
                                id,
                                baseDir,
                                defaultFile = '_default.png',
                                withVersion = false
                            }) {
    if (explicit?.uploadId || explicit?.src) {
        return {
            ...explicit,
            source: 'explicit',
            isCustom: true
        };
    }

    if (id) {
        for (const ext of IMAGE_EXTS) {
            const file = `${id}.${ext}`;
            const userPath = path.join(USER_ASSETS, baseDir, file);
            if (fs.existsSync(userPath)) {
                return {
                    src: `/assets/${baseDir}/${file}`,
                    resolvedFile: file,
                    source: 'id',
                    isCustom: true
                };
            }
        }

        for (const ext of IMAGE_EXTS) {
            const file = `${id}.${ext}`;
            const appPath = path.join(APP_ASSETS, baseDir, file);
            if (fs.existsSync(appPath)) {
                return {
                    src: `/assets/${baseDir}/${file}`,
                    resolvedFile: file,
                    source: 'app',
                    isCustom: false
                };
            }
        }
    }

    return {
        src: `/assets/${baseDir}/${defaultFile}`,
        resolvedFile: defaultFile,
        source: 'default',
        isCustom: false
    };
}




function resolveSectionCardImage(section) {
    return resolveEntityImage({
        explicit: section.cardImage,
        id: section.id,
        baseDir: 'cards/sections'
    });
}

function resolveSectionBackgroundImage(section) {
    return resolveEntityImage({
        explicit: section.backgroundImage,
        id: section.id,
        baseDir: 'backgrounds'
    });
}

function resolveServiceCardImage(service) {
    return resolveEntityImage({
        explicit: service.cardImage,
        id: service.id,
        baseDir: 'cards/services'
    });
}

function resolveAppImage({id, baseDir, defaultFile = '_default.png'}) {
    for (const ext of IMAGE_EXTS) {
        const file = `${id}.${ext}`;
        const appPath = path.join(APP_ASSETS, baseDir, file);

        if (fs.existsSync(appPath)) {
            return {
                src: `/assets/${baseDir}/${file}`,
                resolvedFile: file,
                source: 'app'
            };
        }
    }

    return {
        src: `/assets/${baseDir}/${defaultFile}`,
        resolvedFile: defaultFile,
        source: 'app'
    };
}

function resolveAppSectionCardImage(section) {
    return resolveAppImage({
        id: section.id,
        baseDir: 'cards/sections'
    });
}

function resolveAppSectionBackgroundImage(section) {
    return resolveAppImage({
        id: section.id,
        baseDir: 'backgrounds'
    });
}

function resolveAppServiceCardImage(service) {
    return resolveAppImage({
        id: service.id,
        baseDir: 'cards/services'
    });
}


module.exports = {
    resolveSectionCardImage,
    resolveSectionBackgroundImage,
    resolveServiceCardImage,

    resolveAppImage,
    resolveAppSectionCardImage,
    resolveAppSectionBackgroundImage,
    resolveAppServiceCardImage
};

