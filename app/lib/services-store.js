const fs = require('fs');
const path = require('path');
const {APP_DATA, CONFIG_DIR} = require('./paths');

const CONFIG_FILE = path.join(CONFIG_DIR, 'services.json');
const FALLBACK_FILE = path.join(APP_DATA, 'services.json');

function slugify(str) {
    return String(str || '')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '');
}

function migrateSection(section) {
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
                ...(svc.logo ? {logo: svc.logo} : {})
            };

            order.push(id);
        });

        section.services = map;
        section.serviceOrder = order;
    }

    if (!section.serviceOrder) {
        section.serviceOrder = Object.keys(section.services || {});
    }

    return section;
}

function loadServices() {
    const fileToUse = fs.existsSync(CONFIG_FILE)
        ? CONFIG_FILE
        : FALLBACK_FILE;

    const data = JSON.parse(fs.readFileSync(fileToUse, 'utf8'));
    data.sections = (data.sections || []).map(migrateSection);
    return data;
}

function saveServices(data) {
    fs.mkdirSync(CONFIG_DIR, {recursive: true});
    fs.writeFileSync(CONFIG_FILE, JSON.stringify(data, null, 2), 'utf8');
}

module.exports = {
    loadServices,
    saveServices
};
