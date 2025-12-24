const path = require('path');

const APP_CODE = '/app';
const APP_DATA = '/data';
const CONFIG_DIR = process.env.OMV_LANDINGPAGE_CONFIG
    ? path.resolve(process.env.OMV_LANDINGPAGE_CONFIG)
    : '/config';

module.exports = {
    APP_CODE,
    APP_DATA,
    CONFIG_DIR
};
