const {exec} = require("child_process");
const {promisify} = require("util");

const sh = promisify(exec);

const {DPKG, EXE_OPTS, readFileSafe} = require("./host-runtime");
const {loadConfiguration} = require("./load-config");

async function readOMV() {
    const status = await readFileSafe(`${DPKG}/status`);
    if (!status) {
        return {omv: null, plugins: []};
    }

    const blocks = status.split("\n\n");
    let omv = null;
    const plugins = [];

    for (const block of blocks) {
        const pkg = block.match(/^Package:\s*(.+)$/m)?.[1]?.trim();
        if (!pkg) continue;

        const ver = block.match(/^Version:\s*(.+)$/m)?.[1]?.trim();
        if (!ver) continue;

        if (pkg === "openmediavault") {
            omv = ver;
        } else if (pkg.startsWith("openmediavault-")) {
            plugins.push({
                name: pkg.replace(/^openmediavault-/, ""),
                version: ver
            });
        }
    }

    plugins.sort((a, b) => a.name.localeCompare(b.name));
    return {omv, plugins};
}

async function readDockerContainers() {
    try {
        const {stdout} = await sh(`docker ps -a --format '{{json .}}'`);
        const lines = stdout.trim() ? stdout.trim().split("\n") : [];
        const items = [];

        for (const line of lines) {
            try {
                const obj = JSON.parse(line);
                items.push({
                    name: obj.Names || obj.Name || "",
                    status: obj.Status || ""
                });
            } catch {
            }
        }

        return items;
    } catch {
        return [];
    }
}

async function readPollInterval() {
    try {
        const config = loadConfiguration();
        if (typeof config.infoDrawerRefreshInterval === "number" && config.infoDrawerRefreshInterval > 0) {
            return config.infoDrawerRefreshInterval * 1000;
        }
    } catch {
        return null;
    }
    return null;
}

module.exports = {
    readOMV,
    readDockerContainers,
    readPollInterval
};
