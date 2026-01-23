const fs = require('fs');
const path = require('path');
const { USER_ASSETS, APP_ASSETS } = require('./paths');

const IMAGE_EXTS = ['png', 'jpg', 'jpeg', 'webp', 'gif'];

function findImageById({ rootPath, baseDir, id }) {
    for (const ext of IMAGE_EXTS) {
        const file = `${id}.${ext}`;
        const fullPath = path.join(rootPath, baseDir, file);

        if (fs.existsSync(fullPath)) {
            return { file };
        }
    }
    return null;
}

function resolveEntityImage({
                                explicit,
                                id,
                                baseDir,
                                defaultFile = '_default.png'
                            }) {
    if (explicit?.uploadId || explicit?.src) {
        return {
            ...explicit,
            source: 'explicit',
            isCustom: true
        };
    }

    if (id) {
        const userMatch = findImageById({
            rootPath: USER_ASSETS,
            baseDir,
            id
        });

        if (userMatch) {
            return {
                src: `/assets/${baseDir}/${userMatch.file}`,
                resolvedFile: userMatch.file,
                source: 'id',
                isCustom: true
            };
        }

        const appMatch = findImageById({
            rootPath: APP_ASSETS,
            baseDir,
            id
        });

        if (appMatch) {
            return {
                src: `/assets/${baseDir}/${appMatch.file}`,
                resolvedFile: appMatch.file,
                source: 'app',
                isCustom: false
            };
        }
    }

    return {
        src: `/assets/${baseDir}/${defaultFile}`,
        resolvedFile: defaultFile,
        source: 'default',
        isCustom: false
    };
}

function resolveAppImage({ id, baseDir, defaultFile = '_default.png' }) {
    const match = id
        ? findImageById({ rootPath: APP_ASSETS, baseDir, id })
        : null;

    if (match) {
        return {
            src: `/assets/${baseDir}/${match.file}`,
            resolvedFile: match.file,
            source: 'app'
        };
    }

    return {
        src: `/assets/${baseDir}/${defaultFile}`,
        resolvedFile: defaultFile,
        source: 'app'
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
