'use strict';

const fs = require('fs');
const path = require('path');
const { APP_DATA, APP_DEFAULT_ASSETS, CONFIG_DIR } = require('./paths');
const FALLBACK_APP_ASSETS = path.join(__dirname, '../default-data/assets');
const OVERLAY_PATHS = [
    'backgrounds/',
    'cards/',
    'themes/',
];

function isOverlayAllowed(relPath) {
    return OVERLAY_PATHS.some(p => relPath.startsWith(p));
}
function resolveAssetPath(relativePath) {
    relativePath = relativePath.replace(/^\/+/, '');
    if (isOverlayAllowed(relativePath)) {
        const fromConfig = path.join(CONFIG_DIR, 'assets', relativePath);
        if (fs.existsSync(fromConfig)) return fromConfig;
    }

    for (const root of [APP_DEFAULT_ASSETS, FALLBACK_APP_ASSETS]) {
        const candidate = path.join(root, relativePath);
        if (fs.existsSync(candidate)) return candidate;
    }

    const fromData = path.join(APP_DATA, 'assets', relativePath);
    if (fs.existsSync(fromData)) return fromData;

    return null;
}

module.exports = {
    resolveAssetPath
};
