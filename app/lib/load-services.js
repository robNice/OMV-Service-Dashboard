const fs = require('fs');
const path = require('path');
const { APP_DATA, CONFIG_DIR } = require('./paths');

function loadServices() {
    const configFile   = path.join(CONFIG_DIR, 'services.json');
    const fallbackFile = path.join(APP_DATA, 'services.json');

    const fileToUse = fs.existsSync(configFile)
        ? configFile
        : fallbackFile;

    return JSON.parse(fs.readFileSync(fileToUse, 'utf8'));
}

module.exports = { loadServices };
