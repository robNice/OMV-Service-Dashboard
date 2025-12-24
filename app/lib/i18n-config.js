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

let configured = false;

/** --- SYSTEM-RELEVANT (immutable) --- */
const SYSTEM_CFG = Object.freeze({
  defaultLocale: 'en-GB',
  directory: '/data/i18n',
  objectNotation: true,
  header: 'accept-language',
  register: global,
  updateFiles: false,
  syncFiles: false,
});

/** default customized values (can be overridden by /data/i18n-settings.json) */
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

/** Normalize a BCP47-ish tag to consistent casing for files, e.g. en-GB, de-DE */
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
  const out = { locales: CUSTOM_DEFAULTS.locales.slice(), fallbacks: { ...CUSTOM_DEFAULTS.fallbacks } };

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

/** Load optional override file but only keep allowed keys */
function readCustomizedFromFile() {
  const file = '/data/i18n-settings.json';
  try {
    if (!fs.existsSync(file)) return null;
    const raw = fs.readFileSync(file, 'utf8');
    const parsed = JSON.parse(raw);
    // pick only allowed keys
    const picked = {};
    for (const k of Object.keys(parsed)) {
      if (ALLOWED_CUSTOM_KEYS.has(k)) picked[k] = parsed[k];
    }
    return sanitizeCustom(picked);
  } catch {
    return null;
  }
}

/**
 * Initialize i18n once. Safe to call multiple times.
 * @param {Object} opts
 * @param {Express} opts.app - Optional express app to register i18n middleware
 * @param {Object} opts.custom - Optional { locales, fallbacks } to override file/defaults
 */
function initI18n({ app, custom } = {}) {
  if (!configured) {
    // Start with defaults, then file overrides, then explicit custom param
    const fromFile = readCustomizedFromFile();
    const sanitized = sanitizeCustom(Object.assign({}, fromFile || {}, custom || {}));

    const cfg = Object.assign({}, SYSTEM_CFG, sanitized);

    // Guard: ensure locales is not empty
    if (!cfg.locales || !Array.isArray(cfg.locales) || cfg.locales.length === 0) {
      cfg.locales = CUSTOM_DEFAULTS.locales.slice();
    }

    // Guard: ensure defaultLocale is present in locales list
    if (!cfg.locales.includes(SYSTEM_CFG.defaultLocale)) {
      cfg.locales = Array.from(new Set([SYSTEM_CFG.defaultLocale, ...cfg.locales]));
    }

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
