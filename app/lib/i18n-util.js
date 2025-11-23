/**
 * i18n-util.js
 * Reusable helpers for server-side translations in templates and utilities.
 *
 * Usage:
 *   const { translateHtmlI18n, withLocale, i18n } = require('./lib/i18n-util');
 *   // Make sure i18n is configured once in server.js (i18n.configure(...); app.use(i18n.init);)
 */

'use strict';

const i18n = require('i18n');

/**
 * Replace {{__.path.to.key}} or {{__.path.to.key|{"name":"Manfred"}} in a given HTML string.
 * - Uses the shared i18n instance (configured elsewhere) and supports a temporary locale override.
 */
function translateHtmlI18n(html, { locale } = {}) {
  if (typeof html !== 'string' || html.length === 0) return html || '';

  let prevLocale;
  if (locale) {
    try { prevLocale = i18n.getLocale(); } catch {}
    try { i18n.setLocale(locale); } catch {}
  }

  // {{__.key.path}}  or  {{__.key.path|{"a":1}}  (JSON args optional)
  const rx = /\{\{\s*__\.([a-zA-Z0-9_.-]+)(?:\s*\|\s*(\{[\s\S]*?\}))?\s*\}\}/g;

  const out = html.replace(rx, (_m, key, jsonArgs) => {
    let vars;
    if (jsonArgs) {
      try { vars = JSON.parse(jsonArgs); } catch {}
    }
    // Use i18n.__ directly to avoid relying on global __
    const val = i18n.__(key, vars);
    return (typeof val === 'string' && val.length) ? val : `??${key}??`;
  });

  if (locale) {
    try { i18n.setLocale(prevLocale); } catch {}
  }
  return out;
}

/**
 * Run a function under a specific locale and restore the previous one.
 * Handy for logging or ad-hoc translations without a request.
 */
function withLocale(locale, fn) {
  const hadLocale = typeof i18n.getLocale === 'function';
  const prev = hadLocale ? i18n.getLocale() : undefined;
  try {
    if (locale) i18n.setLocale(locale);
    return fn();
  } finally {
    if (locale && hadLocale) i18n.setLocale(prev);
  }
}

module.exports = {
  translateHtmlI18n,
  withLocale,
  i18n, // export the shared instance in case consumers need i18n.__ directly
};
