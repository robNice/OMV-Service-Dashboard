/**
 * i18n-util.js
 * Reusable helpers for server-side translations using the shared i18n instance.
 */
'use strict';

const { getI18n } = require('./i18n-config');

/**
 * Replace {{__.path.to.key}} or {{__.path.to.key|{"name":"Manfred"}} in a given HTML string.
 * - Uses the shared i18n instance and supports a temporary locale override.
 */
function translateTextI18n(html, { locale } = {}) {
  if (typeof html !== 'string' || html.length === 0) return html || '';

  const i18n = getI18n();

  let prevLocale;
  if (locale && typeof i18n.getLocale === 'function') {
    try { prevLocale = i18n.getLocale(); } catch {}
    try { i18n.setLocale(locale); } catch {}
  }

  const rx = /\{\{\s*__\.([a-zA-Z0-9_.-]+)(?:\s*\|\s*(\{[\s\S]*?}))?\s*}\}/g;

  const out = html.replace(rx, (_m, key, jsonArgs) => {
    let vars;
    if (jsonArgs) {
      try { vars = JSON.parse(jsonArgs); } catch {}
    }
    const val = i18n.__(key, vars);
    return (typeof val === 'string' && val.length) ? val : `??${key}??`;
  });

  if (locale && typeof i18n.setLocale === 'function') {
    try { i18n.setLocale(prevLocale); } catch {}
  }
  return out;
}

/**
 * Run a function under a specific locale and restore the previous one.
 * Handy for logging or ad-hoc translations without a request.
 */
function withLocale(locale, fn) {
  const i18n = getI18n();
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
    translateTextI18n,
  withLocale,
};
