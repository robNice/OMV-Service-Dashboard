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
            label: String(option?.label ?? '').trim()
        }))
        .filter(option => option.value && option.label);
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

function sanitizeThemeSettingsSchema(settings) {
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

            return {
                id,
                label: String(setting?.label || id).trim(),
                description: String(setting?.description || '').trim(),
                group: String(setting?.group || 'General').trim() || 'General',
                type,
                default: options.length && !options.some(option => option.value === String(defaultValue))
                    ? options[0].value
                    : defaultValue,
                options
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

function readThemeMeta(baseDir, themeId) {
    const metaPath = path.join(baseDir, THEMES_DIR, themeId, 'meta.json');
    if (!fs.existsSync(metaPath)) {
        return null;
    }

    try {
        const meta = JSON.parse(fs.readFileSync(metaPath, 'utf8'));
        return {
            id: String(meta.id || themeId).trim().toLowerCase(),
            label: String(meta.label || themeId).trim(),
            description: String(meta.description || '').trim(),
            version: String(meta.version || '').trim(),
            settings: sanitizeThemeSettingsSchema(meta.settings),
            source: baseDir === USER_ASSETS ? 'custom' : 'default'
        };
    } catch {
        return null;
    }
}

function collectThemesFrom(baseDir) {
    const themesRoot = path.join(baseDir, THEMES_DIR);
    if (!fs.existsSync(themesRoot)) {
        return [];
    }

    return fs.readdirSync(themesRoot, { withFileTypes: true })
        .filter(entry => entry.isDirectory())
        .map(entry => readThemeMeta(baseDir, entry.name))
        .filter(Boolean);
}

function listThemes() {
    const merged = new Map();
    const appAssetRoots = [APP_DEFAULT_ASSETS, FALLBACK_APP_ASSETS, APP_ASSETS];

    for (const root of appAssetRoots) {
        for (const theme of collectThemesFrom(root)) {
            merged.set(theme.id, theme);
        }
    }

    for (const theme of collectThemesFrom(USER_ASSETS)) {
        merged.set(theme.id, theme);
    }

    return [...merged.values()].sort((a, b) => a.label.localeCompare(b.label));
}

function getTheme(themeId, { fallback = true } = {}) {
    const normalized = typeof themeId === 'string' ? themeId.trim().toLowerCase() : '';
    const themes = listThemes();
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
