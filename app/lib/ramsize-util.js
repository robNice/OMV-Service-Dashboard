/**
 * size-util.js
 * Normalize RAM sizes:
 *  - parse arbitrary inputs ("8GiB", "8 GB", "8192MiB", 8589934592) -> bytes
 *  - choose shortest unit (1024-base) and format using i18n unit keys
 *
 * Assumptions:
 *  - We stick to a 1024 factor across KB/MB/GB as in existing humanBytes()
 *  - Unit keys expected in i18n catalogs: units.byte, units.kilobyte, units.megabyte, units.gigabyte, units.terabyte, units.petabyte
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
 * Accepts numbers (assumed bytes) or strings like "8GiB", "8 GB", "8192MiB", "8,5 GB".
 * Returns null if not parseable or <= 0.
 */
function parseSizeToBytes(input) {
  if (input == null) return null;

  // Numeric -> assume bytes
  if (typeof input === 'number' && Number.isFinite(input)) {
    const n = Math.floor(input);
    return n > 0 ? n : null;
  }

  if (typeof input !== 'string') {
    try {
      input = String(input);
    } catch { return null; }
  }

  const s = input.trim();
  if (!s) return null;

  // Try pure number string -> bytes
  if (/^[0-9]+$/.test(s)) {
    const n = Math.floor(Number(s));
    return n > 0 ? n : null;
  }

  // Extract number + unit (accept comma as decimal separator)
  // Examples: "8GiB", "8 GB", "8192MiB", "8,5GB", "8.5 gb", "8192 MB"
  const m = s.match(/^([0-9]+(?:[.,][0-9]+)?)\s*([a-zA-Z]+)$/);
  if (!m) return null;

  const numRaw = m[1].replace(',', '.');
  const num = Number(numRaw);
  if (!Number.isFinite(num) || num <= 0) return null;

  const unitRaw = m[2].toLowerCase();

  // Map unit to our table
  let pow = null;
  for (const u of UNIT_TABLE) {
    if (u.symbols.includes(unitRaw)) { pow = u.pow; break; }
  }
  // Common aliases not in symbols (just in case)
  if (pow == null) {
    const alias = {
      'kibibyte': 1, 'mebibyte': 2, 'gibibyte': 3, 'tebibyte': 4, 'pebibyte': 5,
      'kilooctet': 1, 'megaoctet': 2, 'gigaoctet': 3, 'teraoctet': 4, 'octet': 0,
    };
    if (unitRaw in alias) pow = alias[unitRaw];
  }

  // Unknown unit -> assume bytes
  if (pow == null) pow = 0;

  // 1024-based
  const bytes = Math.floor(num * POW1024[pow]);
  return bytes > 0 ? bytes : null;
}

/**
 * Choose the shortest unit for a given byte value (1024-based) and format a localized label.
 * Returns { value, unitKey, label, text } where:
 *  - value: number (rounded to 1 decimal if <10, otherwise integer)
 *  - unitKey: one of 'byte','kilobyte','megabyte','gigabyte','terabyte','petabyte'
 *  - label: localized unit string from i18n (e.g., 'GB', 'Go', 'MB')
 *  - text: combined string, e.g., '8 GB'
 */
function formatBytesI18n(bytes, { locale } = {}) {
  const i18n = getI18n();
  let b = Number(bytes || 0);
  if (!Number.isFinite(b) || b <= 0) {
    const labelB = i18n.__('units.byte');
    return { value: 0, unitKey: 'byte', label: labelB, text: `0 ${labelB}` };
  }

  // Pick largest unit s.t. value < 1024
  let idx = 0;
  let x = b;
  while (x >= 1024 && idx < UNIT_TABLE.length - 1) {
    x /= 1024; idx++;
  }

  const unitKey = UNIT_TABLE[idx].key;
  // Formatting logic: 1 decimal if < 10, otherwise integer
  const value = x >= 10 ? Number(x.toFixed(0)) : Number(x.toFixed(1));
  const label = i18n.__(`units.${unitKey}`);
  return { value, unitKey, label, text: `${value} ${label}` };
}

/**
 * Normalize an array of RAM modules (objects with at least { size } or { sizeBytes })
 * by adding { sizeBytes, sizeLabel } where sizeLabel is localized.
 */
function normalizeRamModules(modules, { locale } = {}) {
  const i18n = getI18n();
  const out = Array.isArray(modules) ? modules.map(m => ({ ...m })) : [];

  for (const m of out) {
    let bytes = null;
    if (m.sizeBytes != null) {
      const n = Number(m.sizeBytes);
      bytes = Number.isFinite(n) && n > 0 ? Math.floor(n) : null;
    }
    if (bytes == null && m.size != null) {
      bytes = parseSizeToBytes(m.size);
    }
    if (bytes == null) {
      // could not parse, leave as-is
      m.sizeBytes = null;
      m.sizeLabel = m.size != null ? String(m.size) : '';
      continue;
    }
    const f = formatBytesI18n(bytes, { locale });
    m.sizeBytes = bytes;
    m.sizeLabel = f.text; // e.g., "8 GB" localized via i18n unit labels
  }
  return out;
}

module.exports = {
  parseSizeToBytes,
  formatBytesI18n,
  normalizeRamModules,
};
