'use strict';

const fs = require('fs');
const path = require('path');
const { APP_DATA, CONFIG_DIR } = require('./paths');
const OVERLAY_PATHS = [
    'backgrounds/',
    'cards/',
];

function isOverlayAllowed(relPath) {
    return OVERLAY_PATHS.some(p => relPath.startsWith(p));
}
function resolveAssetPath(relativePath) {

    console.log('[RESOLVE]');
    console.log('  input:', JSON.stringify(relativePath));

    relativePath = relativePath.replace(/^\/+/, '');

    console.log('  normalized:', JSON.stringify(relativePath));

    if (isOverlayAllowed(relativePath)) {
        const fromConfig = path.join(CONFIG_DIR, 'assets', relativePath);
        console.log('  try config:', fromConfig, fs.existsSync(fromConfig));

        if (fs.existsSync(fromConfig)) return fromConfig;
    }

    const fromData = path.join(APP_DATA, 'assets', relativePath);
    console.log('  try data  :', fromData, fs.existsSync(fromData));

    if (fs.existsSync(fromData)) return fromData;

    return null;
}

module.exports = {
    resolveAssetPath
};
