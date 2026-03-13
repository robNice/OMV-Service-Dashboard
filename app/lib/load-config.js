const fs = require('fs');
const path = require('path');
const { APP_DATA, CONFIG_DIR } = require('./paths');

const CONFIG_FILE   = path.join(CONFIG_DIR, 'config.json');
const FALLBACK_FILE = path.join(APP_DATA, 'config.json');

function loadConfiguration() {
    const fileToUse = fs.existsSync(CONFIG_FILE)
        ? CONFIG_FILE
        : FALLBACK_FILE;

    return JSON.parse(fs.readFileSync(fileToUse, 'utf8'));
}

/**
 * Save configuration.
 * ALWAYS writes to user config directory.
 * Never touches APP_DATA.
 */
function saveConfiguration(config) {
    fs.mkdirSync(CONFIG_DIR, { recursive: true });

    const tmp = CONFIG_FILE + '.tmp';
    fs.writeFileSync(tmp, JSON.stringify(config, null, 2), 'utf8');
    fs.renameSync(tmp, CONFIG_FILE);
}

module.exports = {
    loadConfiguration,
    saveConfiguration
};
