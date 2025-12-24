'use strict';

const fs = require('fs');
const path = require('path');
const { APP_DATA, CONFIG_DIR } = require('./paths');

function resolveAssetPath(relativePath) {
    const fromConfig = path.join(CONFIG_DIR, 'assets', relativePath);
    if (fs.existsSync(fromConfig)) return fromConfig;

    const fromData = path.join(APP_DATA, 'assets', relativePath);
    if (fs.existsSync(fromData)) return fromData;

    return null;
}

module.exports = {
    resolveAssetPath
};
