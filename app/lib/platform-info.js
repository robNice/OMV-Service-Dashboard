const {exec} = require("child_process");
const {promisify} = require("util");

const sh = promisify(exec);

const {EXE_OPTS} = require("./host-runtime");
const {loadConfiguration} = require("./load-config");

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
    readDockerContainers,
    readPollInterval
};
