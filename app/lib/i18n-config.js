/**
 * i18n-config.js
 * Single source of truth for i18n configuration with a strict separation of
 * - system-relevant settings (immutable)
 * - customized settings (admin-controlled): locales, fallbacks
 *
 * Only `locales` (array of strings) and `fallbacks` (map of string->string)
 * can be overridden via /data/i18n-settings.json.
 */

'use strict';

const fs = require('fs');
const i18n = require('i18n');
const path = require('path');
const {APP_DATA, CONFIG_DIR} = require('./paths');
const EFFECTIVE_I18N_DIR = '/tmp/omv-landingpage-i18n';

let configured = false;

const SYSTEM_CFG = Object.freeze({
    defaultLocale: 'en-GB',
    objectNotation: true,
    header: 'accept-language',
    register: global,
    updateFiles: false,
    syncFiles: false,
});

const CUSTOM_DEFAULTS = Object.freeze({
    locales: ['en-GB', 'de-DE', 'fr-FR'],
    fallbacks: {
        'en': 'en-GB',
        'en-US': 'en-GB',
        'de': 'de-DE',
        'fr': 'fr-FR',
    }
});

const ALLOWED_CUSTOM_KEYS = new Set(['locales', 'fallbacks']);

function normalizeTag(tag) {
    if (!tag || typeof tag !== 'string') return '';
    const parts = tag.replace('_', '-').split('-');
    if (parts.length === 1) {
        const p = parts[0].toLowerCase();
        // keep simple language code lower (e.g. "en", "de")
        return p.length === 2 ? p.toLowerCase() : p;
    }
    const lang = parts[0].toLowerCase();
    const region = parts[1].length === 2 ? parts[1].toUpperCase() : parts[1];
    return `${lang}-${region}`;
}

/** Validate and sanitize customized overrides */
function sanitizeCustom(input) {
    const out = {locales: CUSTOM_DEFAULTS.locales.slice(), fallbacks: {...CUSTOM_DEFAULTS.fallbacks}};

    if (input && Array.isArray(input.locales)) {
        const cleaned = input.locales
            .map(x => normalizeTag(String(x)))
            .filter(x => !!x);
        if (cleaned.length) out.locales = Array.from(new Set(cleaned));
    }

    if (input && input.fallbacks && typeof input.fallbacks === 'object') {
        const fb = {};
        for (const [k, v] of Object.entries(input.fallbacks)) {
            const nk = normalizeTag(String(k));
            const nv = normalizeTag(String(v));
            if (nk && nv) fb[nk] = nv;
        }
        if (Object.keys(fb).length) out.fallbacks = fb;
    }
    return out;
}

function readCustomizedFromFile() {
    const candidates = [
        path.join(CONFIG_DIR, 'i18n-settings.json'),
        path.join(APP_DATA, 'i18n-settings.json'),
    ];
    try {
        const file = candidates.find(f => fs.existsSync(f));
        if (!file) {
            console.log(`[i18n] No settings file found at ${candidates.join(',')}`);
            return null;
        }

        const raw = fs.readFileSync(file, 'utf8');

        if (file) {
            console.log(`[i18n] settings loaded from ${file}`);
        }

        const parsed = JSON.parse(raw);
        const picked = {};
        for (const k of Object.keys(parsed)) {
            if (ALLOWED_CUSTOM_KEYS.has(k)) picked[k] = parsed[k];
        }
        return sanitizeCustom(picked);
    } catch {
        console.log('[i18n] Error reading settings file');
        return null;
    }
}

function cleanEffectiveI18nDir(dir) {
    if (!fs.existsSync(dir)) return;
    for (const entry of fs.readdirSync(dir)) {
        const full = path.join(dir, entry);
        if (
            entry.endsWith('.json') &&
            fs.statSync(full).isFile()
        ) {
            fs.unlinkSync(full);
        }
    }
}

/**
 *
 * @param base
 * @param overlay
 * @returns {*}
 */
function deepMerge(base, overlay) {
    const out = {...base};
    for (const [k, v] of Object.entries(overlay || {})) {
        if (
            v &&
            typeof v === 'object' &&
            !Array.isArray(v) &&
            typeof base[k] === 'object'
        ) {
            out[k] = deepMerge(base[k], v);
        } else {
            out[k] = v;
        }
    }
    return out;
}

/**
 *
 * @param locale
 * @returns {*}
 */
function loadMergedLanguage(locale) {
    const fileName = `${locale}.json`;

    const coreFile = path.join(APP_DATA, 'i18n', fileName);
    const configFile = path.join(CONFIG_DIR, 'i18n', fileName);

    let base = {};
    let overlay = {};

    if (fs.existsSync(coreFile)) {
        base = JSON.parse(fs.readFileSync(coreFile, 'utf8'));
    }

    if (fs.existsSync(configFile)) {
        overlay = JSON.parse(fs.readFileSync(configFile, 'utf8'));
        console.log(`[i18n] overlay loaded for ${locale}`);
    }

    return deepMerge(base, overlay);
}

/**
 *
 * @param locales
 */
function prepareEffectiveI18nFiles(locales) {
    if (!fs.existsSync(EFFECTIVE_I18N_DIR)) {
        fs.mkdirSync(EFFECTIVE_I18N_DIR, {recursive: true});
    }

    for (const locale of locales) {
        const data = loadMergedLanguage(locale);
        const target = path.join(EFFECTIVE_I18N_DIR, `${locale}.json`);
        fs.writeFileSync(target, JSON.stringify(data, null, 2), 'utf8');
    }
}

/**
 * Initialize i18n once. Safe to call multiple times.
 * @param {Object} opts
 * @param {Express} opts.app - Optional express app to register i18n middleware
 * @param {Object} opts.custom - Optional { locales, fallbacks } to override file/defaults
 */
function initI18n({app, custom} = {}) {
    if (!configured) {
        const fromFile = readCustomizedFromFile();
        const sanitized = sanitizeCustom(Object.assign({}, fromFile || {}, custom || {}));

        const cfg = Object.assign({}, SYSTEM_CFG, sanitized);

        if (!cfg.locales || !Array.isArray(cfg.locales) || cfg.locales.length === 0) {
            cfg.locales = CUSTOM_DEFAULTS.locales.slice();
        }

        if (!cfg.locales.includes(SYSTEM_CFG.defaultLocale)) {
            cfg.locales = Array.from(new Set([SYSTEM_CFG.defaultLocale, ...cfg.locales]));
        }


        cleanEffectiveI18nDir(EFFECTIVE_I18N_DIR);
        console.log('[i18n] effective language cache cleaned');

        prepareEffectiveI18nFiles(cfg.locales);
        console.log(`[i18n] prepared ${cfg.locales.length} locale files`);

        cfg.directory = EFFECTIVE_I18N_DIR;

        i18n.configure(cfg);
        configured = true;
    }
    if (app && typeof app.use === 'function') {
        app.use(i18n.init);
    }
    return i18n;
}

function getI18n() {
    if (!configured) initI18n();
    return i18n;
}

module.exports = {
    initI18n,
    getI18n,
    _internals: {
        normalizeTag,
        sanitizeCustom,
        SYSTEM_CFG,
        CUSTOM_DEFAULTS,
    }
};
