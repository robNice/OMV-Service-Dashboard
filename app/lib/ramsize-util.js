/**
 * size-util.js (v2)
 * Normalize RAM sizes and format with localized units.
 * - parseSizeToBytes: "8GiB", "8 GB", "8192MiB", 8589934592 -> bytes
 * - formatBytesI18n: choose shortest 1024-based unit and translate unit label with i18n
 * - normalizeRamModules: add { sizeBytes, sizeLabel } to each module, honoring locale
 */
'use strict';

const { getI18n } = require('./i18n-config');

const UNIT_TABLE = [
  { key: 'byte',      symbols: ['b','byte','bytes'],         pow: 0 },
  { key: 'kilobyte',  symbols: ['kb','kib','k','ko'],        pow: 1 },
  { key: 'megabyte',  symbols: ['mb','mib','m','mo'],        pow: 2 },
  { key: 'gigabyte',  symbols: ['gb','gib','g','go'],        pow: 3 },
  { key: 'terabyte',  symbols: ['tb','tib','t','to'],        pow: 4 },
  { key: 'petabyte',  symbols: ['pb','pib','p','po'],        pow: 5 },
];

const POW1024 = UNIT_TABLE.map(u => Math.pow(1024, u.pow));

/**
 * Parse a size input into bytes (integer).
 */
function parseSizeToBytes(input) {
  if (input == null) return null;

  if (typeof input === 'number' && Number.isFinite(input)) {
    const n = Math.floor(input);
    return n > 0 ? n : null;
  }

  if (typeof input !== 'string') {
    try { input = String(input); } catch { return null; }
  }

  const s = input.trim();
  if (!s) return null;

  if (/^[0-9]+$/.test(s)) {
    const n = Math.floor(Number(s));
    return n > 0 ? n : null;
  }

  const m = s.match(/^([0-9]+(?:[.,][0-9]+)?)\s*([a-zA-Z]+)$/);
  if (!m) return null;

  const numRaw = m[1].replace(',', '.');
  const num = Number(numRaw);
  if (!Number.isFinite(num) || num <= 0) return null;

  const unitRaw = m[2].toLowerCase();

  let pow = null;
  for (const u of UNIT_TABLE) {
    if (u.symbols.includes(unitRaw)) { pow = u.pow; break; }
  }
  if (pow == null) {
    const alias = {
      'kibibyte': 1, 'mebibyte': 2, 'gibibyte': 3, 'tebibyte': 4, 'pebibyte': 5,
      'kilooctet': 1, 'megaoctet': 2, 'gigaoctet': 3, 'teraoctet': 4, 'octet': 0,
    };
    if (Object.prototype.hasOwnProperty.call(alias, unitRaw)) pow = alias[unitRaw];
  }
  if (pow == null) pow = 0;

  const bytes = Math.floor(num * POW1024[pow]);
  return bytes > 0 ? bytes : null;
}

/**
 * Choose the shortest unit (1024-based) and return a localized label.
 * Honors an optional `locale` parameter by temporarily switching i18n's locale.
 */
function formatBytesI18n(bytes, { locale } = {}) {
  const i18n = getI18n();
  let b = Number(bytes || 0);
  if (!Number.isFinite(b) || b <= 0) {
    const labelB = i18n.__('units.byte');
    return { value: 0, unitKey: 'byte', label: labelB, text: `0 ${labelB}` };
  }

  let idx = 0, x = b;
  while (x >= 1024 && idx < UNIT_TABLE.length - 1) { x /= 1024; idx++; }

  const unitKey = UNIT_TABLE[idx].key;
  const value = x >= 10 ? Number(x.toFixed(0)) : Number(x.toFixed(1));

  let prev;
  if (locale && typeof i18n.getLocale === 'function' && typeof i18n.setLocale === 'function') {
    try { prev = i18n.getLocale(); } catch {}
    try { i18n.setLocale(locale); } catch {}
  }

  const label = i18n.__(`units.${unitKey}`);

  if (locale && prev && typeof i18n.setLocale === 'function') {
    try { i18n.setLocale(prev); } catch {}
  }

  return { value, unitKey, label, text: `${value} ${label}` };
}

/**
 * Normalize array of modules; adds sizeBytes and localized sizeLabel.
 */
function normalizeRamModules(modules, { locale } = {}) {
  const arr = Array.isArray(modules) ? modules.map(m => ({ ...m })) : [];
  for (const m of arr) {
    let bytes = null;
    if (m.sizeBytes != null) {
      const n = Number(m.sizeBytes);
      bytes = Number.isFinite(n) && n > 0 ? Math.floor(n) : null;
    }
    if (bytes == null && m.size != null) {
      bytes = parseSizeToBytes(m.size);
    }
    if (bytes == null) {
      m.sizeBytes = null;
      m.sizeLabel = m.size != null ? String(m.size) : '';
      continue;
    }
    const f = formatBytesI18n(bytes, { locale });
    m.sizeBytes = bytes;
    m.sizeLabel = f.text;
  }
  return arr;
}

module.exports = {
  parseSizeToBytes,
  formatBytesI18n,
  normalizeRamModules,
};
