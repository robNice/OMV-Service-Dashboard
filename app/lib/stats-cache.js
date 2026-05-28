const fs = require("fs");
const path = require("path");

const {APP_DATA} = require("./paths");

const STATS_CACHE_FILE = path.join(APP_DATA, "stats-cache.json");

function readStatsCache() {
    try {
        if (!fs.existsSync(STATS_CACHE_FILE)) {
            return null;
        }

        const raw = JSON.parse(fs.readFileSync(STATS_CACHE_FILE, "utf8"));
        if (!raw || typeof raw !== "object" || !raw.data || !raw.ts) {
            return null;
        }

        return raw;
    } catch {
        return null;
    }
}

function writeStatsCache(data) {
    try {
        fs.mkdirSync(APP_DATA, {recursive: true});
        const tmp = `${STATS_CACHE_FILE}.tmp`;
        fs.writeFileSync(tmp, JSON.stringify({
            ts: Date.now(),
            data
        }), "utf8");
        fs.renameSync(tmp, STATS_CACHE_FILE);
    } catch {
    }
}

function getFreshStatsCache(refreshIntervalSeconds) {
    const cached = readStatsCache();
    if (!cached) {
        return null;
    }

    const refreshIntervalMs = Number(refreshIntervalSeconds) > 0
        ? Number(refreshIntervalSeconds) * 1000
        : 30000;

    if ((Date.now() - Number(cached.ts || 0)) > refreshIntervalMs * 2) {
        return null;
    }

    return cached.data;
}

module.exports = {
    readStatsCache,
    writeStatsCache,
    getFreshStatsCache
};
