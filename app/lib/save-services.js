const fs = require("fs");
const path = require("path");
const { CONFIG_DIR } = require("./paths");

const FILE = path.join(CONFIG_DIR, "services.json");

function saveServices(data) {
    fs.mkdirSync(CONFIG_DIR, { recursive: true });
    fs.writeFileSync(FILE, JSON.stringify(data, null, 2), "utf8");
}

module.exports = { saveServices };
