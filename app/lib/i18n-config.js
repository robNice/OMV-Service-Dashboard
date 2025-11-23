/**
 * i18n-config.js
 * Single source of truth for i18n configuration.
 *
 * Usage:
 *   const { initI18n, getI18n } = require('./lib/i18n-config');
 *   // In server.js (Express):
 *   initI18n({ app });
 *   // In other modules (no Express app available):
 *   initI18n(); // ensures configured once
 *   const i18n = getI18n();
 */

'use strict';

const fs = require('fs');
const path = require('path');
const i18n = require('i18n');

let configured = false;

function readConfigFile() {
  // Optional override file: /data/i18n-settings.json
  // If present, it can override defaults below.
  const file = '/data/i18n-settings.json';
  try {
    if (fs.existsSync(file)) {
      const raw = fs.readFileSync(file, 'utf8');
      return JSON.parse(raw);
    }
  } catch {}
  return null;
}

function defaults() {
  return {
    locales: ['en-GB', 'de-DE', 'fr-FR'],
    defaultLocale: 'en-GB',
    directory: '/data/i18n',
    objectNotation: true,
    header: 'accept-language',
    register: global,
    fallbacks: {
      'en': 'en-GB',
      'en-US': 'en-GB',
      'de': 'de-DE',
      'fr': 'fr-FR',
    },
    updateFiles: false,
    syncFiles: false
  };
}

/**
 * Initialize i18n once. Safe to call multiple times.
 * @param {Object} opts
 * @param {Express} opts.app - Optional express app to register i18n middleware
 * @param {Object} opts.overrides - Optional config overrides
 */
function initI18n({ app, overrides } = {}) {
  if (!configured) {
    const cfg = Object.assign({}, defaults(), readConfigFile() || {}, overrides || {});
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
};
