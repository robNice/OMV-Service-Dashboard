'use strict';

const fs = require('fs');
const path = require('path');
const { APP_ASSETS, APP_DEFAULT_ASSETS, USER_ASSETS } = require('./paths');

const THEMES_DIR = 'themes';
const DEFAULT_THEME = 'classic';
const FALLBACK_APP_ASSETS = path.join(__dirname, '../default-data/assets');
const SUPPORTED_SETTING_TYPES = new Set(['text', 'textarea', 'number', 'range', 'color', 'select', 'radio', 'boolean']);

function toArray(value) {
    return Array.isArray(value) ? value : [];
}

function normalizeSettingId(value) {
    return String(value || '')
        .trim()
        .replace(/[^a-zA-Z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');
}

function sanitizeOptions(options) {
    return toArray(options)
        .map(option => ({
            value: String(option?.value ?? '').trim(),
            label: String(option?.label ?? '').trim(),
            labelKey: String(option?.labelKey ?? '').trim()
        }))
        .filter(option => option.value && (option.label || option.labelKey));
}

function sanitizeThemeAuthorUrl(value) {
    const raw = String(value ?? '').trim();
    if (!raw) {
        return '';
    }

    try {
        const url = new URL(raw);
        return url.protocol === 'http:' || url.protocol === 'https:'
            ? url.toString()
            : '';
    } catch {
        return '';
    }
}

function normalizeDefaultValue(type, value) {
    if (type === 'boolean') {
        return Boolean(value);
    }

    if (type === 'number' || type === 'range') {
        const numeric = Number(value);
        return Number.isFinite(numeric) ? numeric : 0;
    }

    return String(value ?? '').trim();
}

function readJsonFile(file) {
    try {
        return JSON.parse(fs.readFileSync(file, 'utf8'));
    } catch {
        return null;
    }
}

function deepMerge(base, overlay) {
    const out = {...(base || {})};
    for (const [key, value] of Object.entries(overlay || {})) {
        if (
            value &&
            typeof value === 'object' &&
            !Array.isArray(value) &&
            out[key] &&
            typeof out[key] === 'object' &&
            !Array.isArray(out[key])
        ) {
            out[key] = deepMerge(out[key], value);
        } else {
            out[key] = value;
        }
    }
    return out;
}

function localeCandidates(locale) {
    const normalized = String(locale || '').trim();
    const language = normalized.includes('-') ? normalized.split('-')[0] : '';
    return Array.from(new Set([
        normalized,
        language,
        'en-GB',
        'en'
    ].filter(Boolean)));
}

function readThemeI18n(baseDir, themeId, locale) {
    if (!locale) {
        return {};
    }

    let data = {};
    for (const candidate of localeCandidates(locale).reverse()) {
        const file = path.join(baseDir, THEMES_DIR, themeId, 'i18n', `${candidate}.json`);
        if (fs.existsSync(file)) {
            data = deepMerge(data, readJsonFile(file) || {});
        }
    }
    return data;
}

function getByPath(data, key) {
    if (!key) {
        return '';
    }

    return String(key).split('.').reduce((value, part) => {
        if (!value || typeof value !== 'object') {
            return undefined;
        }
        return value[part];
    }, data);
}

function resolveText(i18n, key, fallback) {
    const translated = getByPath(i18n, key);
    if (typeof translated === 'string' && translated.trim()) {
        return translated.trim();
    }
    return String(fallback || '').trim();
}

function sanitizeThemeSettingsSchema(settings, i18n = {}) {
    const seen = new Set();

    return toArray(settings)
        .map((setting) => {
            const id = normalizeSettingId(setting?.id);
            const type = String(setting?.type || '').trim().toLowerCase();
            if (!id || seen.has(id) || !SUPPORTED_SETTING_TYPES.has(type)) {
                return null;
            }

            seen.add(id);

            const options = type === 'select' || type === 'radio'
                ? sanitizeOptions(setting?.options)
                : [];
            const defaultValue = normalizeDefaultValue(type, setting?.default);
            const label = resolveText(i18n, setting?.labelKey, setting?.label || id);
            const group = resolveText(i18n, setting?.groupKey, setting?.group || 'General') || 'General';

            return {
                id,
                label,
                labelKey: String(setting?.labelKey || '').trim(),
                description: resolveText(i18n, setting?.descriptionKey, setting?.description || ''),
                descriptionKey: String(setting?.descriptionKey || '').trim(),
                group,
                groupKey: String(setting?.groupKey || '').trim(),
                type,
                default: options.length && !options.some(option => option.value === String(defaultValue))
                    ? options[0].value
                    : defaultValue,
                options: options.map(option => ({
                    ...option,
                    label: resolveText(i18n, option.labelKey, option.label || option.value)
                }))
            };
        })
        .filter(Boolean);
}

function coerceSettingValue(setting, value) {
    if (setting.type === 'boolean') {
        return Boolean(value);
    }

    if (setting.type === 'number' || setting.type === 'range') {
        const numeric = Number(value);
        return Number.isFinite(numeric) ? numeric : setting.default;
    }

    const normalized = String(value ?? '').trim();

    if ((setting.type === 'select' || setting.type === 'radio') && setting.options.length) {
        return setting.options.some(option => option.value === normalized)
            ? normalized
            : setting.default;
    }

    return normalized || setting.default;
}

function readThemeMeta(baseDir, themeId, {locale = ''} = {}) {
    const metaPath = path.join(baseDir, THEMES_DIR, themeId, 'meta.json');
    if (!fs.existsSync(metaPath)) {
        return null;
    }

    try {
        const meta = JSON.parse(fs.readFileSync(metaPath, 'utf8'));
        const themeI18n = readThemeI18n(baseDir, themeId, locale);
        return {
            id: String(meta.id || themeId).trim().toLowerCase(),
            label: resolveText(themeI18n, meta.labelKey, meta.label || themeId),
            labelKey: String(meta.labelKey || '').trim(),
            description: resolveText(themeI18n, meta.descriptionKey, meta.description || ''),
            descriptionKey: String(meta.descriptionKey || '').trim(),
            author: String(meta.author || '').trim(),
            authorUrl: sanitizeThemeAuthorUrl(meta['author-url'] || meta.authorUrl),
            version: String(meta.version || '').trim(),
            settings: sanitizeThemeSettingsSchema(meta.settings, themeI18n),
            source: baseDir === USER_ASSETS ? 'custom' : 'default'
        };
    } catch {
        return null;
    }
}

function collectThemesFrom(baseDir, options = {}) {
    const themesRoot = path.join(baseDir, THEMES_DIR);
    if (!fs.existsSync(themesRoot)) {
        return [];
    }

    return fs.readdirSync(themesRoot, { withFileTypes: true })
        .filter(entry => entry.isDirectory())
        .map(entry => readThemeMeta(baseDir, entry.name, options))
        .filter(Boolean);
}

function listThemes(options = {}) {
    const merged = new Map();
    const appAssetRoots = [APP_DEFAULT_ASSETS, FALLBACK_APP_ASSETS, APP_ASSETS];

    for (const root of appAssetRoots) {
        for (const theme of collectThemesFrom(root, options)) {
            merged.set(theme.id, theme);
        }
    }

    for (const theme of collectThemesFrom(USER_ASSETS, options)) {
        merged.set(theme.id, theme);
    }

    return [...merged.values()].sort((a, b) => a.label.localeCompare(b.label));
}

function getTheme(themeId, { fallback = true, locale = '' } = {}) {
    const normalized = typeof themeId === 'string' ? themeId.trim().toLowerCase() : '';
    const themes = listThemes({locale});
    const theme = themes.find(item => item.id === normalized) || null;

    if (theme || !fallback) {
        return theme;
    }

    return themes.find(item => item.id === DEFAULT_THEME) || null;
}

function sanitizeThemeSettings(theme, values) {
    const schema = toArray(theme?.settings);
    const input = values && typeof values === 'object' ? values : {};

    return Object.fromEntries(schema.map((setting) => [
        setting.id,
        coerceSettingValue(setting, input[setting.id] ?? setting.default)
    ]));
}

function normalizeTheme(theme) {
    if (typeof theme !== 'string') {
        return DEFAULT_THEME;
    }

    const normalized = theme.trim().toLowerCase();
    return listThemes().some(item => item.id === normalized) ? normalized : DEFAULT_THEME;
}

module.exports = {
    DEFAULT_THEME,
    getTheme,
    listThemes,
    normalizeTheme,
    sanitizeThemeSettings,
    sanitizeThemeSettingsSchema
};
