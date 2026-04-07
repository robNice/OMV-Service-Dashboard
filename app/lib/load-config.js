const fs = require('fs');
const path = require('path');
const { APP_DATA, CONFIG_DIR } = require('./paths');
const { DEFAULT_THEME, getTheme, normalizeTheme, sanitizeThemeSettings } = require('./theme-registry');

const CONFIG_FILE   = path.join(CONFIG_DIR, 'config.json');
const FALLBACK_FILE = path.join(APP_DATA, 'config.json');
const DEFAULT_SERVICE_LINK_TARGET = 'new-tab';

function normalizeServiceLinkTarget(value) {
    return value === 'same-tab' ? 'same-tab' : DEFAULT_SERVICE_LINK_TARGET;
}

function normalizeConfiguration(config) {
    const theme = normalizeTheme(config?.theme);
    const rawThemeSettings = config?.themeSettings && typeof config.themeSettings === 'object'
        ? config.themeSettings
        : {};
    const normalizedThemeSettings = {};

    for (const [themeId, values] of Object.entries(rawThemeSettings)) {
        const themeDefinition = getTheme(themeId, { fallback: false });
        if (!themeDefinition) {
            continue;
        }

        normalizedThemeSettings[themeDefinition.id] = sanitizeThemeSettings(themeDefinition, values);
    }

    return {
        ...config,
        theme,
        themeSettings: normalizedThemeSettings,
        serviceLinkTarget: normalizeServiceLinkTarget(config?.serviceLinkTarget)
    };
}

function loadConfiguration() {
    const fileToUse = fs.existsSync(CONFIG_FILE)
        ? CONFIG_FILE
        : FALLBACK_FILE;

    return normalizeConfiguration(JSON.parse(fs.readFileSync(fileToUse, 'utf8')));
}

/**
 * Save configuration.
 * ALWAYS writes to user config directory.
 * Never touches APP_DATA.
 */
function saveConfiguration(config) {
    fs.mkdirSync(CONFIG_DIR, { recursive: true });
    const normalized = normalizeConfiguration(config);

    const tmp = CONFIG_FILE + '.tmp';
    fs.writeFileSync(tmp, JSON.stringify(normalized, null, 2), 'utf8');
    fs.renameSync(tmp, CONFIG_FILE);
}

module.exports = {
    loadConfiguration,
    saveConfiguration,
    normalizeTheme,
    normalizeServiceLinkTarget,
    DEFAULT_SERVICE_LINK_TARGET
};
