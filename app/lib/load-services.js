const fs = require('fs');
const path = require('path');
const { APP_DATA, CONFIG_DIR } = require('./paths');
const { saveServices } = require('./save-services'); // existiert bei dir bereits

function slugify(str) {
    return String(str || '')
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');
}

function migrateServicesArrayToMap(servicesArray) {
    const map = {};
    const used = new Set();

    for (const svc of servicesArray) {
        let base = slugify(svc.title || 'service');
        let id = base;
        let i = 2;

        while (used.has(id) || map[id]) {
            id = `${base}-${i++}`;
        }

        used.add(id);

        map[id] = {
            title: svc.title || '',
            url: svc.url || '',
            ...(svc.logo ? { logo: svc.logo } : {})
        };
    }

    return map;
}

function loadServices() {
    const configFile   = path.join(CONFIG_DIR, 'services.json');
    const fallbackFile = path.join(APP_DATA, 'services.json');

    const fileToUse = fs.existsSync(configFile)
        ? configFile
        : fallbackFile;

    const data = JSON.parse(fs.readFileSync(fileToUse, 'utf8'));

    let migrated = false;

    for (const section of data.sections || []) {
        if (Array.isArray(section.services)) {
            section.services = migrateServicesArrayToMap(section.services);
            migrated = true;
        }
    }

    if (migrated && fileToUse === configFile) {
        saveServices(data);
    }

    return data;
}

module.exports = { loadServices };
