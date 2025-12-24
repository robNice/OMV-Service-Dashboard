const path = require('path');

// liegt in /app/lib
const APP_ROOT = path.resolve(__dirname, '..');

const CONFIG_DIR = process.env.OMV_LANDINGPAGE_CONFIG
    ? path.resolve(process.env.OMV_LANDINGPAGE_CONFIG)
    : path.join(APP_ROOT, 'config');

const APP_DATA = path.join(APP_ROOT, 'data');

module.exports = {
    APP_ROOT,
    APP_DATA,
    CONFIG_DIR
};
