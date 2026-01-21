const fs = require('fs');
const path = require('path');
const { APP_DATA, CONFIG_DIR } = require('./paths');

function slugify(str) {
    return String(str || '')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '');
}

function migrateSection(section) {
    // services als Array → Map + Order
    if (Array.isArray(section.services)) {
        const map = {};
        const order = [];

        section.services.forEach((svc, idx) => {
            const id =
                svc.id ||
                slugify(svc.title) ||
                `service-${idx}`;

            map[id] = {
                title: svc.title || '',
                url: svc.url || '',
                ...(svc.logo ? { logo: svc.logo } : {})
            };

            order.push(id);
        });

        section.services = map;
        section.serviceOrder = order;
    }

    // services schon Map, aber keine Order
    if (!section.serviceOrder) {
        section.serviceOrder = Object.keys(section.services || {});
    }

    return section;
}

function loadServices() {
    const configFile   = path.join(CONFIG_DIR, 'services.json');
    const fallbackFile = path.join(APP_DATA, 'services.json');

    const fileToUse = fs.existsSync(configFile)
        ? configFile
        : fallbackFile;

    const data = JSON.parse(fs.readFileSync(fileToUse, 'utf8'));

    data.sections = (data.sections || []).map(migrateSection);
    return data;
}

module.exports = { loadServices };
