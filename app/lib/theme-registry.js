'use strict';

const fs = require('fs');
const path = require('path');
const { APP_ASSETS, USER_ASSETS } = require('./paths');

const THEMES_DIR = 'themes';
const DEFAULT_THEME = 'classic';
const FALLBACK_APP_ASSETS = path.join(__dirname, '../default-data/assets');

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
    const appAssetRoots = [APP_ASSETS];

    if (!fs.existsSync(APP_ASSETS)) {
        appAssetRoots.push(FALLBACK_APP_ASSETS);
    }

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

function normalizeTheme(theme) {
    if (typeof theme !== 'string') {
        return DEFAULT_THEME;
    }

    const normalized = theme.trim().toLowerCase();
    return listThemes().some(item => item.id === normalized) ? normalized : DEFAULT_THEME;
}

module.exports = {
    DEFAULT_THEME,
    listThemes,
    normalizeTheme
};
