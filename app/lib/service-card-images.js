const fs = require("fs");
const path = require("path");
const { CONFIG_DIR } = require("./paths");

const IMAGE_EXTS = ["png", "jpg", "jpeg", "gif", "webp"];

const USER_DIR = path.join(CONFIG_DIR, "assets/cards/services");
const APP_DIR  = path.join(__dirname, "../data/assets/cards/services");

function readDirSafe(dir) {
    if (!fs.existsSync(dir)) return [];
    return fs.readdirSync(dir)
        .filter(file => {
            const ext = file.split(".").pop().toLowerCase();
            return IMAGE_EXTS.includes(ext);
        });
}

function getServiceCardImages() {
    const userImages = readDirSafe(USER_DIR);
    const appImages  = readDirSafe(APP_DIR);

    const map = new Map();

    // App-Images zuerst (Default)
    for (const img of appImages) {
        map.set(img, img);
    }

    // User-Images überschreiben ggf. gleiche Namen
    for (const img of userImages) {
        map.set(img, img);
    }

    return Array.from(map.values()).sort();
}

module.exports = { getServiceCardImages };
