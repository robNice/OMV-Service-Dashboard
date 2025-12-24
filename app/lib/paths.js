const path = require('path');

const APP_ROOT = path.resolve(__dirname);
const APP_DATA = path.join(APP_ROOT, 'data');
const CONFIG_DIR = process.env.OMV_LANDINGPAGE_CONFIG
    ? path.resolve(process.env.CONFIG_DIR)
    : path.join(APP_ROOT, 'config');

module.exports = {
    APP_DATA,
    CONFIG_DIR
};
