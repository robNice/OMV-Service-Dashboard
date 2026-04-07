const fs = require('fs');
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
const HAS_DOCKER_ENV = fs.existsSync('/.dockerenv');
const DEFAULT_APP_DATA = HAS_DOCKER_ENV || fs.existsSync('/data')
    ? '/data'
    : path.join(path.resolve(__dirname, '..'), 'data');
const DEFAULT_CONFIG_DIR = HAS_DOCKER_ENV || fs.existsSync('/config')
    ? '/config'
    : path.join(path.resolve(__dirname, '..'), 'config');
const APP_CODE = process.env.OMV_SERVICE_DASHBOARD_APP
    ? path.resolve(process.env.OMV_SERVICE_DASHBOARD_APP)
    : path.resolve(__dirname, '..');
const APP_DATA = process.env.OMV_SERVICE_DASHBOARD_DATA
    ? path.resolve(process.env.OMV_SERVICE_DASHBOARD_DATA)
    : DEFAULT_APP_DATA;
const APP_DEFAULT_DATA = path.join(APP_CODE, 'default-data');
const envConfigDir = process.env.OMV_SERVICE_DASHBOARD_CONFIG || null;
const CONFIG_DIR = cliConfigDir
    ? path.resolve(cliConfigDir)
    : envConfigDir
        ? path.resolve(envConfigDir)
        : DEFAULT_CONFIG_DIR;
const CONFIG_DIR_SOURCE = cliConfigDir
    ? 'cli'
    : envConfigDir
        ? 'env'
        : DEFAULT_CONFIG_DIR === '/config'
            ? 'docker-default'
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
