'use strict';

const fs = require('fs');
const path = require('path');
const { APP_DATA, APP_DEFAULT_ASSETS, CONFIG_DIR } = require('./paths');
const {IMAGE_EXTS} = require('./image-extensions');
const FALLBACK_APP_ASSETS = path.join(__dirname, '../default-data/assets');
const OVERLAY_PATHS = [
    'backgrounds/',
    'cards/',
    'themes/',
];

function isOverlayAllowed(relPath) {
    return OVERLAY_PATHS.some(p => relPath.startsWith(p));
}

function resolveCandidate(root, relativePath) {
    const directPath = path.join(root, relativePath);
    if (fs.existsSync(directPath)) {
        return directPath;
    }

    if (path.extname(relativePath)) {
        return null;
    }

    for (const ext of IMAGE_EXTS) {
        const candidate = path.join(root, `${relativePath}.${ext}`);
        if (fs.existsSync(candidate)) {
            return candidate;
        }
    }

    return null;
}

function resolveAssetPath(relativePath) {
    relativePath = relativePath.replace(/^\/+/, '');
    if (isOverlayAllowed(relativePath)) {
        const fromConfig = resolveCandidate(path.join(CONFIG_DIR, 'assets'), relativePath);
        if (fromConfig) return fromConfig;
    }

    for (const root of [APP_DEFAULT_ASSETS, FALLBACK_APP_ASSETS]) {
        const candidate = resolveCandidate(root, relativePath);
        if (candidate) return candidate;
    }

    const fromData = resolveCandidate(path.join(APP_DATA, 'assets'), relativePath);
    if (fromData) return fromData;

    return null;
}

module.exports = {
    resolveAssetPath
};
