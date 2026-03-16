const path = require('path');

const APP_CODE = '/app';
const APP_DATA = '/data';
const APP_DEFAULT_DATA = path.join(APP_CODE, 'default-data');
const CONFIG_DIR = process.env.OMV_SERVICE_DASHBOARD_CONFIG
    ? path.resolve(process.env.OMV_SERVICE_DASHBOARD_CONFIG)
    : '/config';


const USER_ASSETS = path.join(CONFIG_DIR, 'assets');
const APP_ASSETS  = path.join(APP_DATA, 'assets');
const APP_DEFAULT_ASSETS = path.join(APP_DEFAULT_DATA, 'assets');

module.exports = {
    APP_CODE,
    APP_DATA,
    APP_DEFAULT_DATA,
    CONFIG_DIR,

    USER_ASSETS,
    APP_ASSETS,
    APP_DEFAULT_ASSETS
};
