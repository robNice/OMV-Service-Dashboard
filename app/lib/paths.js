const path = require('path');

function readCliOption(name) {
    const args = process.argv.slice(2);
    for (let i = 0; i < args.length; i += 1) {
        const arg = args[i];
        if (arg === name) {
            return args[i + 1] || null;
        }
        if (arg.startsWith(`${name}=`)) {
            return arg.slice(name.length + 1) || null;
        }
    }
    return null;
}

const cliConfigDir = readCliOption('--config-dir');
const APP_CODE = process.env.OMV_SERVICE_DASHBOARD_APP
    ? path.resolve(process.env.OMV_SERVICE_DASHBOARD_APP)
    : path.resolve(__dirname, '..');
const APP_DATA = process.env.OMV_SERVICE_DASHBOARD_DATA
    ? path.resolve(process.env.OMV_SERVICE_DASHBOARD_DATA)
    : path.join(APP_CODE, 'data');
const APP_DEFAULT_DATA = path.join(APP_CODE, 'default-data');
const envConfigDir = process.env.OMV_SERVICE_DASHBOARD_CONFIG || null;
const CONFIG_DIR = cliConfigDir
    ? path.resolve(cliConfigDir)
    : envConfigDir
        ? path.resolve(envConfigDir)
        : path.join(APP_CODE, 'config');
const CONFIG_DIR_SOURCE = cliConfigDir
    ? 'cli'
    : envConfigDir
        ? 'env'
        : 'default';


const USER_ASSETS = path.join(CONFIG_DIR, 'assets');
const APP_ASSETS  = path.join(APP_DATA, 'assets');
const APP_DEFAULT_ASSETS = path.join(APP_DEFAULT_DATA, 'assets');

module.exports = {
    APP_CODE,
    APP_DATA,
    APP_DEFAULT_DATA,
    CONFIG_DIR,
    CONFIG_DIR_SOURCE,

    USER_ASSETS,
    APP_ASSETS,
    APP_DEFAULT_ASSETS
};
