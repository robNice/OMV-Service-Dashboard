const path = require('path');

const APP_CODE = '/app';
const APP_DATA = '/data';
const CONFIG_DIR = process.env.OMV_SERVICE_DASHBOARD_CONFIG
    ? path.resolve(process.env.OMV_SERVICE_DASHBOARD_CONFIG)
    : '/config';


const USER_ASSETS = path.join(CONFIG_DIR, 'assets');
const APP_ASSETS  = path.join(APP_DATA, 'assets');

module.exports = {
    APP_CODE,
    APP_DATA,
    CONFIG_DIR,

    USER_ASSETS,
    APP_ASSETS
};